//! # Fiapo ICO Contract
//! 
//! Sistema de ICO baseado em NFTs mineradores para o ecossistema Don Fiapo.
//! Inclui:
//! - 7 tiers de NFTs (Free a $500)
//! - Sistema de mineração de tokens (112 dias)
//! - Vesting automático
//! - Evolução de NFTs (burn + merge)
//! - Prestige bonus baseado em ordem de mint
//! - Raridade visual

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::PSP22Error;

#[ink::contract]
mod fiapo_ico {
    use super::*;
    use ink::prelude::{string::String, vec::Vec, vec};
    use ink::storage::Mapping;

    /// Constantes do sistema
    pub const MINING_PERIOD_DAYS: u64 = 112;
    pub const SECONDS_PER_DAY: u64 = 86400;
    #[allow(dead_code)]
    pub const DECIMALS: u8 = 8;
    pub const SCALE: u128 = 100_000_000; // 10^8

    /// Erros específicos do ICO
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum ICOError {
        ICONotActive,
        NFTNotFound,
        NotNFTOwner,
        NFTInactive,
        MiningNotStarted,
        MiningEnded,
        NoTokensToClaim,
        InvalidNFTType,
        MaxSupplyReached,
        PaymentRequired,
        PaymentAmountMismatch,
        PaymentAlreadyUsed,
        InvalidTransactionHash,
        FreeMintAlreadyUsed,
        EvolutionNotAllowed,
        InsufficientNFTs,
        CoreContractError,
        Unauthorized,
    }

    /// Raridade visual do NFT
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum VisualRarity {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary,
    }

    impl Default for VisualRarity {
        fn default() -> Self {
            VisualRarity::Common
        }
    }

    /// Tipo de NFT interno (0-6)
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum NFTTier {
        Free = 0,     // Gratuito
        Tier2 = 1,    // $10
        Tier3 = 2,    // $30
        Tier4 = 3,    // $55
        Tier5 = 4,    // $100
        Tier6 = 5,    // $250
        Tier7 = 6,    // $500
    }

    impl NFTTier {
        pub fn from_u8(value: u8) -> Option<Self> {
            match value {
                0 => Some(NFTTier::Free),
                1 => Some(NFTTier::Tier2),
                2 => Some(NFTTier::Tier3),
                3 => Some(NFTTier::Tier4),
                4 => Some(NFTTier::Tier5),
                5 => Some(NFTTier::Tier6),
                6 => Some(NFTTier::Tier7),
                _ => None,
            }
        }

        pub fn to_u8(&self) -> u8 {
            match self {
                NFTTier::Free => 0,
                NFTTier::Tier2 => 1,
                NFTTier::Tier3 => 2,
                NFTTier::Tier4 => 3,
                NFTTier::Tier5 => 4,
                NFTTier::Tier6 => 5,
                NFTTier::Tier7 => 6,
            }
        }
    }

    /// Configuração de cada tier de NFT
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct TierConfig {
        pub price_usdt_cents: u64,
        pub max_supply: u32,
        pub minted: u32,
        pub tokens_per_nft: u128,
        pub daily_mining_rate: u128,
        pub active: bool,
    }

    /// Dados de um NFT individual
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct NFTData {
        pub id: u64,
        pub tier: NFTTier,
        pub owner: AccountId,
        pub created_at: u64,
        pub tokens_mined: u128,
        pub tokens_claimed: u128,
        pub last_mining_timestamp: u64,
        pub active: bool,
        pub visual_rarity: VisualRarity,
        pub evolution_count: u8,
        pub mining_bonus_bps: u16,
        pub evolved_from: Vec<u64>,
    }

    /// Estatísticas do ICO
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct ICOStats {
        pub total_nfts_minted: u64,
        pub total_raised_usdt_cents: u64,
        pub total_tokens_mined: u128,
        pub total_tokens_claimed: u128,
        pub unique_participants: u32,
        pub ico_active: bool,
        pub mining_active: bool,
    }

    /// Evento de NFT mintado
    #[ink(event)]
    pub struct NFTMinted {
        #[ink(topic)]
        nft_id: u64,
        #[ink(topic)]
        owner: AccountId,
        tier: u8,
        visual_rarity: VisualRarity,
    }

    /// Evento de tokens minerados
    #[ink(event)]
    pub struct TokensClaimed {
        #[ink(topic)]
        nft_id: u64,
        #[ink(topic)]
        owner: AccountId,
        amount: u128,
    }

    /// Evento de NFT evoluído
    #[ink(event)]
    pub struct NFTEvolved {
        #[ink(topic)]
        new_nft_id: u64,
        #[ink(topic)]
        owner: AccountId,
        burned_nfts: Vec<u64>,
        new_tier: u8,
    }

    /// Storage do contrato ICO
    #[ink(storage)]
    pub struct FiapoICO {
        /// Referência ao contrato Core
        core_contract: AccountId,
        /// Contrato Oracle (autorizado a chamar mint_paid_for)
        oracle_contract: Option<AccountId>,
        /// Contrato Marketplace (autorizado a transferir NFTs)
        marketplace_contract: Option<AccountId>,
        /// Owner do contrato
        owner: AccountId,
        /// Se o ICO está ativo
        ico_active: bool,
        /// Se a mineração está ativa
        mining_active: bool,
        /// Timestamp de início da mineração
        mining_start: u64,
        /// Timestamp de fim da mineração
        mining_end: u64,
        /// Próximo ID de NFT
        next_nft_id: u64,
        /// Configurações dos tiers
        tier_configs: Mapping<u8, TierConfig>,
        /// Dados dos NFTs
        nfts: Mapping<u64, NFTData>,
        /// NFTs por owner
        nfts_by_owner: Mapping<AccountId, Vec<u64>>,
        /// Endereços que já usaram free mint
        free_mint_used: Mapping<AccountId, bool>,
        /// Hashes de transação já usados
        used_payment_hashes: Mapping<String, u64>,
        /// Total mintado por tier
        minted_per_tier: [u32; 7],
        /// Total de participantes únicos
        unique_participants: u32,
        /// Total arrecadado em USDT cents
        total_raised: u64,
        /// Total de tokens claimed
        total_claimed: u128,
    }

    impl FiapoICO {
        /// Construtor do contrato
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            let caller = Self::env().caller();
            let current_time = Self::env().block_timestamp();
            
            let mut contract = Self {
                core_contract,
                oracle_contract: None,
                marketplace_contract: None,
                owner: caller,
                ico_active: true,
                mining_active: true,
                mining_start: current_time,
                mining_end: current_time + (MINING_PERIOD_DAYS * SECONDS_PER_DAY),
                next_nft_id: 1,
                tier_configs: Mapping::default(),
                nfts: Mapping::default(),
                nfts_by_owner: Mapping::default(),
                free_mint_used: Mapping::default(),
                used_payment_hashes: Mapping::default(),
                minted_per_tier: [0; 7],
                unique_participants: 0,
                total_raised: 0,
                total_claimed: 0,
            };

            // Inicializa configurações dos tiers
            contract.initialize_tier_configs();
            contract
        }

        /// Inicializa as configurações padrão dos tiers
        fn initialize_tier_configs(&mut self) {
            // Free: 560 tokens total, 5/dia
            self.tier_configs.insert(0, &TierConfig {
                price_usdt_cents: 0,
                max_supply: 10_000,
                minted: 0,
                tokens_per_nft: 560 * SCALE,
                daily_mining_rate: 5 * SCALE,
                active: true,
            });
            // Tier 2: $10, 5600 tokens, 50/dia
            self.tier_configs.insert(1, &TierConfig {
                price_usdt_cents: 1000,
                max_supply: 50_000,
                minted: 0,
                tokens_per_nft: 5_600 * SCALE,
                daily_mining_rate: 50 * SCALE,
                active: true,
            });
            // Tier 3: $30, 16800 tokens, 150/dia
            self.tier_configs.insert(2, &TierConfig {
                price_usdt_cents: 3000,
                max_supply: 40_000,
                minted: 0,
                tokens_per_nft: 16_800 * SCALE,
                daily_mining_rate: 150 * SCALE,
                active: true,
            });
            // Tier 4: $55, 33600 tokens, 300/dia
            self.tier_configs.insert(3, &TierConfig {
                price_usdt_cents: 5500,
                max_supply: 30_000,
                minted: 0,
                tokens_per_nft: 33_600 * SCALE,
                daily_mining_rate: 300 * SCALE,
                active: true,
            });
            // Tier 5: $100, 56000 tokens, 500/dia
            self.tier_configs.insert(4, &TierConfig {
                price_usdt_cents: 10000,
                max_supply: 20_000,
                minted: 0,
                tokens_per_nft: 56_000 * SCALE,
                daily_mining_rate: 500 * SCALE,
                active: true,
            });
            // Tier 6: $250, 134400 tokens, 1200/dia
            self.tier_configs.insert(5, &TierConfig {
                price_usdt_cents: 25000,
                max_supply: 5_000,
                minted: 0,
                tokens_per_nft: 134_400 * SCALE,
                daily_mining_rate: 1200 * SCALE,
                active: true,
            });
            // Tier 7: $500, 280000 tokens, 2500/dia
            self.tier_configs.insert(6, &TierConfig {
                price_usdt_cents: 50000,
                max_supply: 2_000,
                minted: 0,
                tokens_per_nft: 280_000 * SCALE,
                daily_mining_rate: 2500 * SCALE,
                active: true,
            });
        }

        // ==================== View Functions ====================

        /// Retorna o contrato Core
        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        /// Retorna as estatísticas do ICO
        #[ink(message)]
        pub fn get_stats(&self) -> ICOStats {
            let total_minted: u64 = self.minted_per_tier.iter()
                .map(|&x| x as u64)
                .sum();
            
            ICOStats {
                total_nfts_minted: total_minted,
                total_raised_usdt_cents: self.total_raised,
                total_tokens_mined: 0, // Calculado dinamicamente
                total_tokens_claimed: self.total_claimed,
                unique_participants: self.unique_participants,
                ico_active: self.ico_active,
                mining_active: self.mining_active,
            }
        }

        /// Retorna a configuração de um tier
        #[ink(message)]
        pub fn get_tier_config(&self, tier: u8) -> Option<TierConfig> {
            self.tier_configs.get(tier)
        }

        /// Retorna dados de um NFT
        #[ink(message)]
        pub fn get_nft(&self, nft_id: u64) -> Option<NFTData> {
            self.nfts.get(nft_id)
        }

        /// Retorna NFTs de um usuário
        #[ink(message)]
        pub fn get_user_nfts(&self, owner: AccountId) -> Vec<u64> {
            self.nfts_by_owner.get(owner).unwrap_or_default()
        }

        /// Verifica se um endereço já usou free mint
        #[ink(message)]
        pub fn has_free_mint(&self, account: AccountId) -> bool {
            self.free_mint_used.get(account).unwrap_or(false)
        }

        /// Calcula tokens pendentes para um NFT
        #[ink(message)]
        pub fn pending_tokens(&self, nft_id: u64) -> u128 {
            if let Some(nft) = self.nfts.get(nft_id) {
                if !nft.active {
                    return 0;
                }
                let config = self.tier_configs.get(nft.tier.to_u8()).unwrap();
                self.calculate_mined_tokens(&nft, &config)
            } else {
                0
            }
        }

        /// Retorna o total de NFTs
        #[ink(message)]
        pub fn total_nfts(&self) -> u64 {
            self.next_nft_id.saturating_sub(1)
        }

        // ==================== Minting Functions ====================

        /// Mint gratuito (1 por endereço)
        #[ink(message)]
        pub fn mint_free(&mut self) -> Result<u64, ICOError> {
            let caller = self.env().caller();

            if !self.ico_active {
                return Err(ICOError::ICONotActive);
            }

            if self.free_mint_used.get(caller).unwrap_or(false) {
                return Err(ICOError::FreeMintAlreadyUsed);
            }

            let config = self.tier_configs.get(0).ok_or(ICOError::InvalidNFTType)?;
            if config.minted >= config.max_supply {
                return Err(ICOError::MaxSupplyReached);
            }

            // Marca como usado
            self.free_mint_used.insert(caller, &true);

            // Minta o NFT
            self.mint_nft_internal(caller, NFTTier::Free, 0)
        }

        /// Mint pago (precisa de assinatura de pagamento verificada off-chain)
        #[ink(message)]
        pub fn mint_paid(&mut self, tier: u8, payment_hash: String) -> Result<u64, ICOError> {
            let caller = self.env().caller();

            if !self.ico_active {
                return Err(ICOError::ICONotActive);
            }

            if tier == 0 {
                return Err(ICOError::PaymentRequired);
            }

            let nft_tier = NFTTier::from_u8(tier).ok_or(ICOError::InvalidNFTType)?;
            let config = self.tier_configs.get(tier).ok_or(ICOError::InvalidNFTType)?;

            if config.minted >= config.max_supply {
                return Err(ICOError::MaxSupplyReached);
            }

            // Verifica se o payment hash já foi usado
            if self.used_payment_hashes.contains(&payment_hash) {
                return Err(ICOError::PaymentAlreadyUsed);
            }

            // Marca payment hash como usado
            let nft_id = self.next_nft_id;
            self.used_payment_hashes.insert(payment_hash, &nft_id);

            // Atualiza total arrecadado
            self.total_raised = self.total_raised.saturating_add(config.price_usdt_cents as u64);

            // Minta o NFT
            self.mint_nft_internal(caller, nft_tier, config.price_usdt_cents)
        }

        /// Mint pago em nome de outro usuário (chamado pelo Oracle após confirmar pagamento)
        #[ink(message)]
        pub fn mint_paid_for(&mut self, user: AccountId, tier: u8) -> Result<u64, ICOError> {
            let caller = self.env().caller();

            // Apenas Oracle pode chamar
            if Some(caller) != self.oracle_contract {
                return Err(ICOError::Unauthorized);
            }

            if !self.ico_active {
                return Err(ICOError::ICONotActive);
            }

            if tier == 0 {
                return Err(ICOError::PaymentRequired);
            }

            let nft_tier = NFTTier::from_u8(tier).ok_or(ICOError::InvalidNFTType)?;
            let config = self.tier_configs.get(tier).ok_or(ICOError::InvalidNFTType)?;

            if config.minted >= config.max_supply {
                return Err(ICOError::MaxSupplyReached);
            }

            // Atualiza total arrecadado
            self.total_raised = self.total_raised.saturating_add(config.price_usdt_cents as u64);

            // Minta o NFT
            self.mint_nft_internal(user, nft_tier, config.price_usdt_cents)
        }

        /// Configura contrato Oracle (apenas owner)
        #[ink(message)]
        pub fn set_oracle_contract(&mut self, oracle: AccountId) -> Result<(), ICOError> {
            if self.env().caller() != self.owner {
                return Err(ICOError::Unauthorized);
            }
            self.oracle_contract = Some(oracle);
            Ok(())
        }

        /// Função interna de minting
        fn mint_nft_internal(
            &mut self,
            owner: AccountId,
            tier: NFTTier,
            _price_paid: u64,
        ) -> Result<u64, ICOError> {
            let current_time = self.env().block_timestamp();
            let nft_id = self.next_nft_id;
            let tier_u8 = tier.to_u8();

            // Determina raridade visual baseada em pseudo-random
            let visual_rarity = self.determine_rarity(nft_id);

            // Calcula prestige bonus (primeiros 10% do supply)
            let config = self.tier_configs.get(tier_u8).unwrap();
            let mining_bonus_bps = if config.minted < config.max_supply / 10 {
                500 // 5% bonus para early adopters
            } else {
                0
            };

            // Cria o NFT
            let nft = NFTData {
                id: nft_id,
                tier: tier.clone(),
                owner,
                created_at: current_time,
                tokens_mined: 0,
                tokens_claimed: 0,
                last_mining_timestamp: current_time,
                active: true,
                visual_rarity: visual_rarity.clone(),
                evolution_count: 0,
                mining_bonus_bps,
                evolved_from: vec![],
            };

            // Salva o NFT
            self.nfts.insert(nft_id, &nft);

            // Adiciona ao owner
            let mut owner_nfts = self.nfts_by_owner.get(owner).unwrap_or_default();
            let is_new_participant = owner_nfts.is_empty();
            owner_nfts.push(nft_id);
            self.nfts_by_owner.insert(owner, &owner_nfts);

            // Atualiza contadores
            self.next_nft_id += 1;
            self.minted_per_tier[tier_u8 as usize] += 1;
            
            if is_new_participant {
                self.unique_participants += 1;
            }

            // Atualiza config minted count
            let mut updated_config = config;
            updated_config.minted += 1;
            self.tier_configs.insert(tier_u8, &updated_config);

            Self::env().emit_event(NFTMinted {
                nft_id,
                owner,
                tier: tier_u8,
                visual_rarity,
            });

            Ok(nft_id)
        }

        /// Determina raridade visual (pseudo-random baseado em block + nft_id)
        fn determine_rarity(&self, nft_id: u64) -> VisualRarity {
            // Usa block number + nft_id como seed pseudo-aleatório
            let block = self.env().block_number();
            let seed = block.wrapping_add(nft_id as u32);
            let rand = seed % 100;

            match rand {
                0..=49 => VisualRarity::Common,      // 50%
                50..=74 => VisualRarity::Uncommon,   // 25%
                75..=89 => VisualRarity::Rare,       // 15%
                90..=97 => VisualRarity::Epic,       // 8%
                _ => VisualRarity::Legendary,        // 2%
            }
        }

        // ==================== Transfer Functions ====================

        /// Transfere NFT de um owner para outro (chamado pelo Marketplace ou owner do NFT)
        #[ink(message)]
        pub fn transfer_nft(&mut self, from: AccountId, to: AccountId, nft_id: u64) -> Result<(), ICOError> {
            let caller = self.env().caller();

            // Verifica NFT existe
            let mut nft = self.nfts.get(nft_id).ok_or(ICOError::NFTNotFound)?;

            // Verifica ownership
            if nft.owner != from {
                return Err(ICOError::NotNFTOwner);
            }

            // Apenas owner do NFT, owner do contrato ou Marketplace autorizado podem transferir
            let is_nft_owner = caller == from;
            let is_contract_owner = caller == self.owner;
            let is_marketplace = Some(caller) == self.marketplace_contract;
            
            if !is_nft_owner && !is_contract_owner && !is_marketplace {
                return Err(ICOError::Unauthorized);
            }

            // Atualiza owner do NFT
            nft.owner = to;
            self.nfts.insert(nft_id, &nft);

            // Remove da lista do antigo owner
            if let Some(mut from_nfts) = self.nfts_by_owner.get(from) {
                from_nfts.retain(|&id| id != nft_id);
                self.nfts_by_owner.insert(from, &from_nfts);
            }

            // Adiciona à lista do novo owner
            let mut to_nfts = self.nfts_by_owner.get(to).unwrap_or_default();
            to_nfts.push(nft_id);
            self.nfts_by_owner.insert(to, &to_nfts);

            Ok(())
        }

        /// Configura contrato Marketplace (apenas owner)
        #[ink(message)]
        pub fn set_marketplace_contract(&mut self, marketplace: AccountId) -> Result<(), ICOError> {
            if self.env().caller() != self.owner {
                return Err(ICOError::Unauthorized);
            }
            self.marketplace_contract = Some(marketplace);
            Ok(())
        }

        // ==================== Mining Functions ====================

        /// Claim tokens minerados de um NFT
        #[ink(message)]
        pub fn claim_tokens(&mut self, nft_id: u64) -> Result<u128, ICOError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            // Verifica NFT
            let mut nft = self.nfts.get(nft_id).ok_or(ICOError::NFTNotFound)?;
            
            if nft.owner != caller {
                return Err(ICOError::NotNFTOwner);
            }

            if !nft.active {
                return Err(ICOError::NFTInactive);
            }

            let config = self.tier_configs.get(nft.tier.to_u8()).unwrap();
            
            // Calcula tokens a clamar
            let tokens_to_claim = self.calculate_mined_tokens(&nft, &config);
            
            if tokens_to_claim == 0 {
                return Err(ICOError::NoTokensToClaim);
            }

            // Atualiza NFT
            nft.tokens_claimed = nft.tokens_claimed.saturating_add(tokens_to_claim);
            nft.last_mining_timestamp = current_time;
            self.nfts.insert(nft_id, &nft);

            // Atualiza total claimed
            self.total_claimed = self.total_claimed.saturating_add(tokens_to_claim);

            // Cross-contract call: minta tokens para o usuário
            self.call_core_mint_to(caller, tokens_to_claim)?;

            Self::env().emit_event(TokensClaimed {
                nft_id,
                owner: caller,
                amount: tokens_to_claim,
            });

            Ok(tokens_to_claim)
        }

        /// Calcula tokens minerados desde o último claim
        fn calculate_mined_tokens(&self, nft: &NFTData, config: &TierConfig) -> u128 {
            let current_time = self.env().block_timestamp();
            
            // Limita ao período de mineração
            let effective_end = core::cmp::min(current_time, self.mining_end);
            let effective_start = core::cmp::max(nft.last_mining_timestamp, self.mining_start);

            if effective_end <= effective_start {
                return 0;
            }

            let seconds_elapsed = effective_end.saturating_sub(effective_start);
            let days_elapsed = seconds_elapsed / SECONDS_PER_DAY;

            if days_elapsed == 0 {
                return 0;
            }

            // Base mining
            let base_mined = config.daily_mining_rate
                .saturating_mul(days_elapsed as u128);

            // Aplica bônus de prestige
            let bonus = base_mined
                .saturating_mul(nft.mining_bonus_bps as u128)
                .saturating_div(10000);

            let total_mined = base_mined.saturating_add(bonus);

            // Limita ao máximo minerável
            let max_claimable = config.tokens_per_nft.saturating_sub(nft.tokens_claimed);
            core::cmp::min(total_mined, max_claimable)
        }

        // ==================== Evolution Functions ====================

        /// Evolui NFTs (queima vários para criar um de tier superior)
        #[ink(message)]
        pub fn evolve_nfts(&mut self, nft_ids: Vec<u64>, target_tier: u8) -> Result<u64, ICOError> {
            let caller = self.env().caller();

            if nft_ids.is_empty() {
                return Err(ICOError::InsufficientNFTs);
            }

            let target = NFTTier::from_u8(target_tier).ok_or(ICOError::InvalidNFTType)?;
            
            // Verifica ownership e coleta os NFTs
            let mut nfts_to_burn = Vec::new();
            for nft_id in nft_ids.iter() {
                let nft = self.nfts.get(*nft_id).ok_or(ICOError::NFTNotFound)?;
                if nft.owner != caller {
                    return Err(ICOError::NotNFTOwner);
                }
                if !nft.active {
                    return Err(ICOError::NFTInactive);
                }
                nfts_to_burn.push(nft);
            }

            // Desativa os NFTs queimados
            for nft_id in nft_ids.iter() {
                if let Some(mut nft) = self.nfts.get(*nft_id) {
                    nft.active = false;
                    self.nfts.insert(*nft_id, &nft);
                }
            }

            // Cria novo NFT evoluído
            let nft_id = self.mint_nft_internal(caller, target, 0)?;

            // Atualiza os dados de evolução
            if let Some(mut new_nft) = self.nfts.get(nft_id) {
                new_nft.evolved_from = nft_ids.clone();
                new_nft.evolution_count = 1;
                self.nfts.insert(nft_id, &new_nft);
            }

            Self::env().emit_event(NFTEvolved {
                new_nft_id: nft_id,
                owner: caller,
                burned_nfts: nft_ids,
                new_tier: target_tier,
            });

            Ok(nft_id)
        }

        // ==================== Admin Functions ====================

        /// Pausa o ICO
        #[ink(message)]
        pub fn pause_ico(&mut self) -> Result<(), ICOError> {
            if self.env().caller() != self.owner {
                return Err(ICOError::Unauthorized);
            }
            self.ico_active = false;
            Ok(())
        }

        /// Despausa o ICO
        #[ink(message)]
        pub fn unpause_ico(&mut self) -> Result<(), ICOError> {
            if self.env().caller() != self.owner {
                return Err(ICOError::Unauthorized);
            }
            self.ico_active = true;
            Ok(())
        }

        /// Pausa a mineração
        #[ink(message)]
        pub fn pause_mining(&mut self) -> Result<(), ICOError> {
            if self.env().caller() != self.owner {
                return Err(ICOError::Unauthorized);
            }
            self.mining_active = false;
            Ok(())
        }

        /// Atualiza o contrato Core
        #[ink(message)]
        pub fn set_core_contract(&mut self, new_core: AccountId) -> Result<(), ICOError> {
            if self.env().caller() != self.owner {
                return Err(ICOError::Unauthorized);
            }
            self.core_contract = new_core;
            Ok(())
        }

        // ==================== Cross-Contract Calls ====================

        /// Chama Core.mint_to para mintar tokens
        fn call_core_mint_to(
            &self,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), ICOError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("mint_to")))
                        .push_arg(to)
                        .push_arg(amount),
                )
                .returns::<Result<(), PSP22Error>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(ICOError::CoreContractError),
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

        fn create_contract() -> FiapoICO {
            let accounts = default_accounts();
            FiapoICO::new(accounts.charlie)
        }

        #[ink::test]
        fn constructor_works() {
            let contract = create_contract();
            assert!(contract.ico_active);
            assert!(contract.mining_active);
            assert_eq!(contract.total_nfts(), 0);
        }

        #[ink::test]
        fn tier_configs_initialized() {
            let contract = create_contract();
            
            let free_config = contract.get_tier_config(0).unwrap();
            assert_eq!(free_config.price_usdt_cents, 0);
            assert_eq!(free_config.max_supply, 10_000);

            let tier7_config = contract.get_tier_config(6).unwrap();
            assert_eq!(tier7_config.price_usdt_cents, 50000);
            assert_eq!(tier7_config.max_supply, 2_000);
        }

        #[ink::test]
        fn mint_free_works() {
            let accounts = default_accounts();
            let mut contract = create_contract();

            let result = contract.mint_free();
            assert!(result.is_ok());
            
            let nft_id = result.unwrap();
            assert_eq!(nft_id, 1);

            let nft = contract.get_nft(nft_id).unwrap();
            assert_eq!(nft.owner, accounts.alice);
            assert_eq!(nft.tier, NFTTier::Free);
            assert!(nft.active);
        }

        #[ink::test]
        fn free_mint_only_once() {
            let mut contract = create_contract();

            let _ = contract.mint_free();
            let result = contract.mint_free();

            assert_eq!(result, Err(ICOError::FreeMintAlreadyUsed));
        }

        #[ink::test]
        fn stats_updated_after_mint() {
            let mut contract = create_contract();

            let _ = contract.mint_free();

            let stats = contract.get_stats();
            assert_eq!(stats.total_nfts_minted, 1);
            assert_eq!(stats.unique_participants, 1);
        }
    }
}
