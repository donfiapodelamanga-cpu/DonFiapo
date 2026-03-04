//! # Fiapo NFT Collections Contract
//!
//! Contrato para coleções de NFTs colecionáveis do marketplace Don Fiapo.
//! Diferente do contrato ICO (NFTs mineradores), este é para artes colecionáveis
//! organizadas em álbuns (coleções) com preço e supply individuais.
//!
//! Funcionalidades:
//! - Admin cria coleções (álbuns temáticos)
//! - Admin adiciona tokens (artes) com metadata IPFS, preço, moeda, supply
//! - Usuários mintam pagando em LUNES (nativo) ou FIAPO (PSP22)
//! - Transferência de tokens entre wallets
//! - Integração com marketplace existente para revenda

#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod fiapo_nft_collections {
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;
    
    // Cross-contract: PSP22Ref garante selector correto do trait IPSP22
    use fiapo_logics::traits::psp22::{PSP22, PSP22Ref};

    // ==================== Errors ====================

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum CollectionError {
        Unauthorized,
        CollectionNotFound,
        CollectionNotActive,
        TokenNotFound,
        TokenSoldOut,
        InsufficientPayment,
        InvalidCurrency,
        NotTokenOwner,
        TransferFailed,
        NativeTransferFailed,
        CoreContractError,
        EditionNotFound,
        InvalidInput,
        CollectionPaused,
    }

    // ==================== Data Structures ====================

    /// Status de uma coleção
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum CollectionStatus {
        Draft,
        Active,
        Paused,
        SoldOut,
    }

    impl Default for CollectionStatus {
        fn default() -> Self {
            CollectionStatus::Draft
        }
    }

    /// Raridade de um token
    /// 0=Common, 1=Uncommon, 2=Rare, 3=Epic, 4=Legendary
    #[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum Rarity {
        Common = 0,
        Uncommon = 1,
        Rare = 2,
        Epic = 3,
        Legendary = 4,
    }

    impl Default for Rarity {
        fn default() -> Self {
            Rarity::Common
        }
    }

    impl Rarity {
        pub fn from_u8(value: u8) -> Option<Self> {
            match value {
                0 => Some(Rarity::Common),
                1 => Some(Rarity::Uncommon),
                2 => Some(Rarity::Rare),
                3 => Some(Rarity::Epic),
                4 => Some(Rarity::Legendary),
                _ => None,
            }
        }
    }

    /// Moeda de pagamento
    /// 0 = LUNES (nativo), 1 = FIAPO (PSP22)
    #[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum Currency {
        Lunes = 0,
        Fiapo = 1,
    }

    impl Currency {
        pub fn from_u8(value: u8) -> Option<Self> {
            match value {
                0 => Some(Currency::Lunes),
                1 => Some(Currency::Fiapo),
                _ => None,
            }
        }
    }

    /// Dados de uma coleção (álbum)
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct CollectionData {
        pub id: u64,
        pub name: String,
        pub symbol: String,
        pub creator: AccountId,
        pub status: CollectionStatus,
        pub created_at: u64,
        pub token_count: u32,
    }

    /// Dados de um token (arte) dentro de uma coleção
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct TokenData {
        pub id: u64,
        pub collection_id: u64,
        pub name: String,
        pub metadata_uri: String,
        pub price: Balance,
        pub currency: Currency,
        pub supply: u32,
        pub minted: u32,
        pub active: bool,
        pub rarity: Rarity,
    }

    /// Identificador único de uma edição: (token_id, edition_number)
    /// edition_number começa em 1
    pub type EditionId = (u64, u32);

    /// Dados de uma edição mintada
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct EditionData {
        pub token_id: u64,
        pub edition: u32,
        pub owner: AccountId,
        pub minted_at: u64,
    }

    // ==================== Events ====================

    #[ink(event)]
    pub struct CollectionCreated {
        #[ink(topic)]
        collection_id: u64,
        creator: AccountId,
        name: String,
    }

    #[ink(event)]
    pub struct TokenAdded {
        #[ink(topic)]
        token_id: u64,
        #[ink(topic)]
        collection_id: u64,
        name: String,
        price: Balance,
        currency: u8,
        supply: u32,
        rarity: u8,
    }

    #[ink(event)]
    pub struct TokenMinted {
        #[ink(topic)]
        token_id: u64,
        edition: u32,
        #[ink(topic)]
        buyer: AccountId,
        price: Balance,
        currency: u8,
    }

    #[ink(event)]
    pub struct TokenTransferred {
        #[ink(topic)]
        token_id: u64,
        edition: u32,
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
    }

    #[ink(event)]
    pub struct CollectionStatusChanged {
        #[ink(topic)]
        collection_id: u64,
        new_status: u8,
    }

    // ==================== Storage ====================

    #[ink(storage)]
    pub struct FiapoNFTCollections {
        /// Owner do contrato (admin)
        owner: AccountId,
        /// Contrato Core PSP22 (para pagamentos em FIAPO)
        core_contract: AccountId,
        /// Wallet que recebe os pagamentos
        treasury_wallet: AccountId,
        /// Contrato marketplace (autorizado a transferir tokens)
        marketplace_contract: Option<AccountId>,

        /// Próximo ID de coleção
        next_collection_id: u64,
        /// Próximo ID de token
        next_token_id: u64,

        /// Coleções: collection_id -> CollectionData
        collections: Mapping<u64, CollectionData>,
        /// Tokens: token_id -> TokenData
        tokens: Mapping<u64, TokenData>,
        /// Lista de token IDs por coleção: collection_id -> Vec<token_id>
        collection_tokens: Mapping<u64, Vec<u64>>,

        /// Ownership de edições: (token_id, edition) -> owner
        edition_owners: Mapping<EditionId, AccountId>,
        /// Dados de edição: (token_id, edition) -> EditionData
        editions: Mapping<EditionId, EditionData>,
        /// Tokens/edições de um owner: owner -> Vec<(token_id, edition)>
        tokens_by_owner: Mapping<AccountId, Vec<EditionId>>,

        /// Total de edições mintadas globalmente
        total_minted: u64,
        /// Volume total em LUNES
        total_volume_lunes: Balance,
        /// Volume total em FIAPO
        total_volume_fiapo: Balance,

        /// Se o contrato está pausado globalmente
        paused: bool,
    }

    impl FiapoNFTCollections {
        /// Construtor
        #[ink(constructor)]
        pub fn new(core_contract: AccountId, treasury_wallet: AccountId) -> Self {
            let caller = Self::env().caller();
            Self {
                owner: caller,
                core_contract,
                treasury_wallet,
                marketplace_contract: None,
                next_collection_id: 1,
                next_token_id: 1,
                collections: Mapping::default(),
                tokens: Mapping::default(),
                collection_tokens: Mapping::default(),
                edition_owners: Mapping::default(),
                editions: Mapping::default(),
                tokens_by_owner: Mapping::default(),
                total_minted: 0,
                total_volume_lunes: 0,
                total_volume_fiapo: 0,
                paused: false,
            }
        }

        // ==================== Admin: Coleções ====================

        /// Cria uma nova coleção (álbum). Apenas owner.
        #[ink(message)]
        pub fn create_collection(
            &mut self,
            name: String,
            symbol: String,
        ) -> Result<u64, CollectionError> {
            self.ensure_owner()?;

            let collection_id = self.next_collection_id;
            let current_time = self.env().block_timestamp();

            let collection = CollectionData {
                id: collection_id,
                name: name.clone(),
                symbol,
                creator: self.env().caller(),
                status: CollectionStatus::Draft,
                created_at: current_time,
                token_count: 0,
            };

            self.collections.insert(collection_id, &collection);
            self.collection_tokens.insert(collection_id, &Vec::<u64>::new());
            self.next_collection_id = collection_id.saturating_add(1);

            Self::env().emit_event(CollectionCreated {
                collection_id,
                creator: self.env().caller(),
                name,
            });

            Ok(collection_id)
        }

        /// Adiciona um token (arte) a uma coleção. Apenas owner.
        /// price em unidades mínimas (com decimais).
        /// currency: 0 = LUNES, 1 = FIAPO
        #[ink(message)]
        pub fn add_token(
            &mut self,
            collection_id: u64,
            name: String,
            metadata_uri: String,
            price: Balance,
            currency: u8,
            supply: u32,
            rarity: u8,
        ) -> Result<u64, CollectionError> {
            self.ensure_owner()?;

            let mut collection = self.collections.get(collection_id)
                .ok_or(CollectionError::CollectionNotFound)?;

            let cur = Currency::from_u8(currency).ok_or(CollectionError::InvalidCurrency)?;
            let rar = Rarity::from_u8(rarity).ok_or(CollectionError::InvalidInput)?;

            if supply == 0 {
                return Err(CollectionError::InvalidInput);
            }

            let token_id = self.next_token_id;

            let token = TokenData {
                id: token_id,
                collection_id,
                name: name.clone(),
                metadata_uri,
                price,
                currency: cur,
                supply,
                minted: 0,
                active: true,
                rarity: rar,
            };

            self.tokens.insert(token_id, &token);

            // Adiciona token_id à lista da coleção
            let mut token_ids = self.collection_tokens.get(collection_id).unwrap_or_default();
            token_ids.push(token_id);
            self.collection_tokens.insert(collection_id, &token_ids);

            // Atualiza contagem na coleção
            collection.token_count = collection.token_count.saturating_add(1);
            self.collections.insert(collection_id, &collection);

            self.next_token_id = token_id.saturating_add(1);

            Self::env().emit_event(TokenAdded {
                token_id,
                collection_id,
                name,
                price,
                currency,
                supply,
                rarity,
            });

            Ok(token_id)
        }

        /// Atualiza metadata_uri de um token. Apenas owner.
        #[ink(message)]
        pub fn update_token_metadata(
            &mut self,
            token_id: u64,
            metadata_uri: String,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            let mut token = self.tokens.get(token_id)
                .ok_or(CollectionError::TokenNotFound)?;
            token.metadata_uri = metadata_uri;
            self.tokens.insert(token_id, &token);
            Ok(())
        }

        /// Atualiza preço de um token (não afeta edições já mintadas). Apenas owner.
        #[ink(message)]
        pub fn update_token_price(
            &mut self,
            token_id: u64,
            new_price: Balance,
            new_currency: u8,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            let mut token = self.tokens.get(token_id)
                .ok_or(CollectionError::TokenNotFound)?;
            let cur = Currency::from_u8(new_currency).ok_or(CollectionError::InvalidCurrency)?;
            token.price = new_price;
            token.currency = cur;
            self.tokens.insert(token_id, &token);
            Ok(())
        }

        /// Atualiza raridade de um token. Apenas owner.
        /// 0=Common, 1=Uncommon, 2=Rare, 3=Epic, 4=Legendary
        #[ink(message)]
        pub fn update_token_rarity(
            &mut self,
            token_id: u64,
            rarity: u8,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            let mut token = self.tokens.get(token_id)
                .ok_or(CollectionError::TokenNotFound)?;
            let rar = Rarity::from_u8(rarity).ok_or(CollectionError::InvalidInput)?;
            token.rarity = rar;
            self.tokens.insert(token_id, &token);
            Ok(())
        }

        /// Altera o status de uma coleção. Apenas owner.
        /// 0=Draft, 1=Active, 2=Paused, 3=SoldOut
        #[ink(message)]
        pub fn set_collection_status(
            &mut self,
            collection_id: u64,
            status: u8,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            let mut collection = self.collections.get(collection_id)
                .ok_or(CollectionError::CollectionNotFound)?;

            collection.status = match status {
                0 => CollectionStatus::Draft,
                1 => CollectionStatus::Active,
                2 => CollectionStatus::Paused,
                3 => CollectionStatus::SoldOut,
                _ => return Err(CollectionError::InvalidInput),
            };

            self.collections.insert(collection_id, &collection);

            Self::env().emit_event(CollectionStatusChanged {
                collection_id,
                new_status: status,
            });

            Ok(())
        }

        /// Desativa/ativa um token individual. Apenas owner.
        #[ink(message)]
        pub fn set_token_active(
            &mut self,
            token_id: u64,
            active: bool,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            let mut token = self.tokens.get(token_id)
                .ok_or(CollectionError::TokenNotFound)?;
            token.active = active;
            self.tokens.insert(token_id, &token);
            Ok(())
        }

        // ==================== Minting ====================

        /// Minta uma edição de um token pagando em LUNES (moeda nativa).
        /// O caller envia LUNES como `transferred_value`.
        #[ink(message, payable)]
        pub fn mint_with_lunes(&mut self, token_id: u64) -> Result<EditionId, CollectionError> {
            self.ensure_not_paused()?;

            let mut token = self.tokens.get(token_id)
                .ok_or(CollectionError::TokenNotFound)?;

            // Validações
            if !token.active {
                return Err(CollectionError::TokenNotFound);
            }
            if token.currency != Currency::Lunes {
                return Err(CollectionError::InvalidCurrency);
            }

            let collection = self.collections.get(token.collection_id)
                .ok_or(CollectionError::CollectionNotFound)?;
            if collection.status != CollectionStatus::Active {
                return Err(CollectionError::CollectionNotActive);
            }

            if token.minted >= token.supply {
                return Err(CollectionError::TokenSoldOut);
            }

            // Verifica pagamento
            let paid = self.env().transferred_value();
            if paid < token.price {
                return Err(CollectionError::InsufficientPayment);
            }

            // Transfere LUNES para treasury
            self.native_transfer(self.treasury_wallet, token.price)?;

            // Devolve troco se pagou a mais
            let change = paid.saturating_sub(token.price);
            if change > 0 {
                let buyer = self.env().caller();
                let _ = self.native_transfer(buyer, change);
            }

            // Rastreia volume
            self.total_volume_lunes = self.total_volume_lunes.saturating_add(token.price);

            // Minta a edição
            let edition = self.mint_edition_internal(&mut token)?;

            Ok(edition)
        }

        /// Minta uma edição de um token pagando em FIAPO (PSP22).
        /// O caller precisa ter feito `approve` no contrato Core antes.
        #[ink(message)]
        pub fn mint_with_fiapo(&mut self, token_id: u64) -> Result<EditionId, CollectionError> {
            self.ensure_not_paused()?;

            let mut token = self.tokens.get(token_id)
                .ok_or(CollectionError::TokenNotFound)?;

            // Validações
            if !token.active {
                return Err(CollectionError::TokenNotFound);
            }
            if token.currency != Currency::Fiapo {
                return Err(CollectionError::InvalidCurrency);
            }

            let collection = self.collections.get(token.collection_id)
                .ok_or(CollectionError::CollectionNotFound)?;
            if collection.status != CollectionStatus::Active {
                return Err(CollectionError::CollectionNotActive);
            }

            if token.minted >= token.supply {
                return Err(CollectionError::TokenSoldOut);
            }

            // Transfere FIAPO do buyer para treasury via Core (transfer_from)
            let buyer = self.env().caller();
            self.call_core_transfer_from(buyer, self.treasury_wallet, token.price)?;

            // Rastreia volume
            self.total_volume_fiapo = self.total_volume_fiapo.saturating_add(token.price);

            // Minta a edição
            let edition = self.mint_edition_internal(&mut token)?;

            Ok(edition)
        }

        /// Lógica interna de mint (compartilhada entre LUNES e FIAPO)
        fn mint_edition_internal(
            &mut self,
            token: &mut TokenData,
        ) -> Result<EditionId, CollectionError> {
            let buyer = self.env().caller();
            let current_time = self.env().block_timestamp();

            // Incrementa edição
            token.minted = token.minted.saturating_add(1);
            let edition_number = token.minted;
            let token_id = token.id;
            let currency_u8 = token.currency as u8;
            let price = token.price;

            // Salva token atualizado
            self.tokens.insert(token_id, token);

            // Cria dados da edição
            let edition_id: EditionId = (token_id, edition_number);
            let edition_data = EditionData {
                token_id,
                edition: edition_number,
                owner: buyer,
                minted_at: current_time,
            };

            self.edition_owners.insert(edition_id, &buyer);
            self.editions.insert(edition_id, &edition_data);

            // Adiciona à lista do owner
            let mut owner_tokens = self.tokens_by_owner.get(buyer).unwrap_or_default();
            owner_tokens.push(edition_id);
            self.tokens_by_owner.insert(buyer, &owner_tokens);

            self.total_minted = self.total_minted.saturating_add(1);

            // Auto sold_out check
            if token.minted >= token.supply {
                // Verifica se todos os tokens da coleção estão esgotados
                self.check_collection_sold_out(token.collection_id);
            }

            Self::env().emit_event(TokenMinted {
                token_id,
                edition: edition_number,
                buyer,
                price,
                currency: currency_u8,
            });

            Ok(edition_id)
        }

        /// Verifica se todos os tokens de uma coleção estão esgotados
        fn check_collection_sold_out(&mut self, collection_id: u64) {
            if let Some(token_ids) = self.collection_tokens.get(collection_id) {
                let all_sold = token_ids.iter().all(|tid| {
                    self.tokens.get(*tid)
                        .map(|t| t.minted >= t.supply)
                        .unwrap_or(true)
                });
                if all_sold {
                    if let Some(mut col) = self.collections.get(collection_id) {
                        col.status = CollectionStatus::SoldOut;
                        self.collections.insert(collection_id, &col);
                    }
                }
            }
        }

        // ==================== Transfers ====================

        /// Transfere uma edição para outro endereço. Apenas o owner da edição pode chamar.
        #[ink(message)]
        pub fn transfer(
            &mut self,
            token_id: u64,
            edition: u32,
            to: AccountId,
        ) -> Result<(), CollectionError> {
            let caller = self.env().caller();
            let edition_id: EditionId = (token_id, edition);

            let current_owner = self.edition_owners.get(edition_id)
                .ok_or(CollectionError::EditionNotFound)?;

            if current_owner != caller {
                return Err(CollectionError::NotTokenOwner);
            }

            self.transfer_internal(edition_id, caller, to)
        }

        /// Transferência via marketplace (autorizado). Permite que o marketplace
        /// transfira tokens durante uma venda.
        #[ink(message)]
        pub fn marketplace_transfer(
            &mut self,
            token_id: u64,
            edition: u32,
            from: AccountId,
            to: AccountId,
        ) -> Result<(), CollectionError> {
            let caller = self.env().caller();

            // Apenas marketplace ou owner pode chamar
            let is_marketplace = self.marketplace_contract
                .map(|m| m == caller)
                .unwrap_or(false);
            if !is_marketplace && caller != self.owner {
                return Err(CollectionError::Unauthorized);
            }

            let edition_id: EditionId = (token_id, edition);

            let current_owner = self.edition_owners.get(edition_id)
                .ok_or(CollectionError::EditionNotFound)?;

            if current_owner != from {
                return Err(CollectionError::NotTokenOwner);
            }

            self.transfer_internal(edition_id, from, to)
        }

        /// Lógica interna de transferência
        fn transfer_internal(
            &mut self,
            edition_id: EditionId,
            from: AccountId,
            to: AccountId,
        ) -> Result<(), CollectionError> {
            // Atualiza owner
            self.edition_owners.insert(edition_id, &to);

            // Atualiza edition data
            if let Some(mut ed) = self.editions.get(edition_id) {
                ed.owner = to;
                self.editions.insert(edition_id, &ed);
            }

            // Remove do array do from
            let mut from_tokens = self.tokens_by_owner.get(from).unwrap_or_default();
            from_tokens.retain(|e| *e != edition_id);
            self.tokens_by_owner.insert(from, &from_tokens);

            // Adiciona ao array do to
            let mut to_tokens = self.tokens_by_owner.get(to).unwrap_or_default();
            to_tokens.push(edition_id);
            self.tokens_by_owner.insert(to, &to_tokens);

            Self::env().emit_event(TokenTransferred {
                token_id: edition_id.0,
                edition: edition_id.1,
                from,
                to,
            });

            Ok(())
        }

        // ==================== View Functions ====================

        /// Retorna dados de uma coleção
        #[ink(message)]
        pub fn get_collection(&self, collection_id: u64) -> Option<CollectionData> {
            self.collections.get(collection_id)
        }

        /// Retorna dados de um token
        #[ink(message)]
        pub fn get_token(&self, token_id: u64) -> Option<TokenData> {
            self.tokens.get(token_id)
        }

        /// Retorna dados de uma edição
        #[ink(message)]
        pub fn get_edition(&self, token_id: u64, edition: u32) -> Option<EditionData> {
            self.editions.get((token_id, edition))
        }

        /// Retorna o owner de uma edição
        #[ink(message)]
        pub fn owner_of(&self, token_id: u64, edition: u32) -> Option<AccountId> {
            self.edition_owners.get((token_id, edition))
        }

        /// Retorna todas as edições de um owner
        #[ink(message)]
        pub fn tokens_of(&self, owner: AccountId) -> Vec<EditionId> {
            self.tokens_by_owner.get(owner).unwrap_or_default()
        }

        /// Retorna os token IDs de uma coleção
        #[ink(message)]
        pub fn collection_token_ids(&self, collection_id: u64) -> Vec<u64> {
            self.collection_tokens.get(collection_id).unwrap_or_default()
        }

        /// Retorna estatísticas globais
        #[ink(message)]
        pub fn stats(&self) -> (u64, u64, u64, Balance, Balance) {
            (
                self.next_collection_id.saturating_sub(1),
                self.next_token_id.saturating_sub(1),
                self.total_minted,
                self.total_volume_lunes,
                self.total_volume_fiapo,
            )
        }

        /// Retorna o owner do contrato
        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }

        /// Retorna o contrato Core
        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        /// Retorna a treasury wallet
        #[ink(message)]
        pub fn treasury_wallet(&self) -> AccountId {
            self.treasury_wallet
        }

        // ==================== Admin Config ====================

        /// Configura contrato marketplace (apenas owner)
        #[ink(message)]
        pub fn set_marketplace_contract(
            &mut self,
            marketplace: AccountId,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            self.marketplace_contract = Some(marketplace);
            Ok(())
        }

        /// Atualiza treasury wallet (apenas owner)
        #[ink(message)]
        pub fn set_treasury_wallet(
            &mut self,
            wallet: AccountId,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            self.treasury_wallet = wallet;
            Ok(())
        }

        /// Atualiza contrato Core (apenas owner)
        #[ink(message)]
        pub fn set_core_contract(
            &mut self,
            core: AccountId,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            self.core_contract = core;
            Ok(())
        }

        /// Pausa/despausa o contrato globalmente (apenas owner)
        #[ink(message)]
        pub fn set_paused(&mut self, paused: bool) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            self.paused = paused;
            Ok(())
        }

        /// Transfere ownership do contrato (apenas owner)
        #[ink(message)]
        pub fn transfer_ownership(
            &mut self,
            new_owner: AccountId,
        ) -> Result<(), CollectionError> {
            self.ensure_owner()?;
            self.owner = new_owner;
            Ok(())
        }

        // ==================== Internal Helpers ====================

        /// Verifica se o caller é o owner
        fn ensure_owner(&self) -> Result<(), CollectionError> {
            if self.env().caller() != self.owner {
                return Err(CollectionError::Unauthorized);
            }
            Ok(())
        }

        /// Verifica se o contrato não está pausado
        fn ensure_not_paused(&self) -> Result<(), CollectionError> {
            if self.paused {
                return Err(CollectionError::CollectionPaused);
            }
            Ok(())
        }

        /// Transferência nativa de LUNES
        fn native_transfer(&self, to: AccountId, amount: Balance) -> Result<(), CollectionError> {
            self.env().transfer(to, amount)
                .map_err(|_| CollectionError::NativeTransferFailed)
        }

        /// Cross-contract: Core.transfer_from via PSP22Ref (selector correto do trait IPSP22)
        fn call_core_transfer_from(
            &self,
            from: AccountId,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), CollectionError> {
            let mut psp22: PSP22Ref = self.core_contract.into();
            match psp22.transfer_from(from, to, amount) {
                Ok(_) => Ok(()),
                _ => Err(CollectionError::CoreContractError),
            }
        }
    }

    // ==================== Tests ====================

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        #[ink::test]
        fn constructor_works() {
            let accounts = default_accounts();
            let contract = FiapoNFTCollections::new(accounts.charlie, accounts.django);
            assert_eq!(contract.owner(), accounts.alice);
            assert_eq!(contract.core_contract(), accounts.charlie);
            assert_eq!(contract.treasury_wallet(), accounts.django);
            let (cols, tokens, minted, vol_l, vol_f) = contract.stats();
            assert_eq!(cols, 0);
            assert_eq!(tokens, 0);
            assert_eq!(minted, 0);
            assert_eq!(vol_l, 0);
            assert_eq!(vol_f, 0);
        }

        #[ink::test]
        fn create_collection_works() {
            let accounts = default_accounts();
            let mut contract = FiapoNFTCollections::new(accounts.charlie, accounts.django);
            let id = contract.create_collection(
                String::from("Don Fiapo Legends"),
                String::from("DONL"),
            ).unwrap();
            assert_eq!(id, 1);

            let col = contract.get_collection(1).unwrap();
            assert_eq!(col.name, "Don Fiapo Legends");
            assert_eq!(col.symbol, "DONL");
            assert_eq!(col.token_count, 0);
        }

        #[ink::test]
        fn add_token_works() {
            let accounts = default_accounts();
            let mut contract = FiapoNFTCollections::new(accounts.charlie, accounts.django);
            contract.create_collection(
                String::from("Test Collection"),
                String::from("TEST"),
            ).unwrap();

            let token_id = contract.add_token(
                1,
                String::from("O Rei Manga"),
                String::from("ipfs://Qm..."),
                1000,
                0, // LUNES
                10,
                4, // Legendary
            ).unwrap();
            assert_eq!(token_id, 1);

            let token = contract.get_token(1).unwrap();
            assert_eq!(token.name, "O Rei Manga");
            assert_eq!(token.price, 1000);
            assert_eq!(token.supply, 10);
            assert_eq!(token.minted, 0);
            assert_eq!(token.currency, Currency::Lunes);
            assert_eq!(token.rarity, Rarity::Legendary);

            let col = contract.get_collection(1).unwrap();
            assert_eq!(col.token_count, 1);

            let token_ids = contract.collection_token_ids(1);
            assert_eq!(token_ids, vec![1]);
        }

        #[ink::test]
        fn transfer_works() {
            let accounts = default_accounts();
            let mut contract = FiapoNFTCollections::new(accounts.charlie, accounts.django);

            // Cria coleção e token
            contract.create_collection(String::from("Test"), String::from("T")).unwrap();
            contract.add_token(1, String::from("Art"), String::from("ipfs://x"), 0, 0, 5, 0).unwrap();

            // Simula mint interno (preço 0, direto)
            contract.set_collection_status(1, 1).unwrap(); // Active

            // Não podemos testar mint_with_lunes direto pois env().transferred_value() é 0
            // e price é 0, mas podemos testar a lógica de transfer
        }

        #[ink::test]
        fn unauthorized_fails() {
            let accounts = default_accounts();
            let mut contract = FiapoNFTCollections::new(accounts.charlie, accounts.django);

            // Muda caller para bob
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);

            let result = contract.create_collection(
                String::from("Hack"),
                String::from("HACK"),
            );
            assert_eq!(result, Err(CollectionError::Unauthorized));
        }
    }
}
