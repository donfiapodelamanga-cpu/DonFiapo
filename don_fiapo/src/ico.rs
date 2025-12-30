//! Módulo ICO - Sistema de NFTs Mineradoras com Vesting
//!
//! Este módulo implementa um sistema inovador de ICO baseado em NFTs que mineram tokens
//! Don Fiapo ao longo de 112 dias, com sistema de vesting e staking de tokens bloqueados.

use ink::prelude::{vec::Vec, vec, string::String, format};
use scale::{Decode, Encode};
use ink::storage::Mapping;
use ink::env::{DefaultEnvironment, Environment};

// Importar tipos do contrato principal
use crate::staking::StakingType;
use crate::nft_evolution::{EvolutionManager, EvolutionError};
use crate::nft_rarity::{RarityManager, VisualRarity, NFTVisualAttributes};

// Definir AccountId localmente para este módulo
type AccountId = <DefaultEnvironment as Environment>::AccountId;

/// Metadados de um NFT seguindo padrão PSP34
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct NFTMetadata {
    /// Nome do NFT
    pub name: String,
    /// Descrição do NFT
    pub description: String,
    /// URL da imagem no IPFS
    pub image: String,
    /// URL externa (site do projeto)
    pub external_url: String,
    /// Atributos específicos do NFT
    pub attributes: Vec<NFTAttribute>,
}

/// Atributo de um NFT
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct NFTAttribute {
    /// Nome do atributo (ex: "Rarity", "Mining Power", "Type")
    pub trait_type: String,
    /// Valor do atributo (ex: "Legendary", "1044.6 FIAPO/day", "Paid")
    pub value: String,
    /// Valor numérico para ordenação (opcional)
    pub display_type: Option<String>,
}

/// Configuração IPFS para cada tipo de NFT
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct IPFSConfig {
    /// Hash IPFS da imagem
    pub image_hash: String,
    /// Hash IPFS dos metadados JSON
    pub metadata_hash: String,
    /// Gateway IPFS base (ex: "https://ipfs.io/ipfs/")
    pub gateway_url: String,
}

/// Evento emitido quando metadados de NFT são atualizados
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct NFTMetadataUpdated {
    pub nft_id: u64,
    pub metadata_uri: String,
    pub timestamp: u64,
}

/// Evento emitido quando um novo NFT é criado
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct NFTCreated {
    pub nft_id: u64,
    pub nft_type: NFTType,
    pub owner: AccountId,
    pub timestamp: u64,
}

/// Evento emitido quando tokens são resgatados de um NFT
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct TokensClaimed {
    pub nft_id: u64,
    pub owner: AccountId,
    pub amount: u128,
    pub timestamp: u64,
}

/// Evento emitido quando tokens são colocados em staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct TokensStaked {
    pub nft_id: u64,
    pub owner: AccountId,
    pub amount: u128,
    pub staking_type: StakingType,
    pub timestamp: u64,
}

/// Evento emitido quando tokens são desbloqueados do staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct TokensUnstaked {
    pub nft_id: u64,
    pub owner: AccountId,
    pub amount: u128,
    pub staking_type: StakingType,
    pub timestamp: u64,
}

/// Tipos de NFT disponíveis no ICO
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum NFTType {
    /// NFT Gratuito - Tipo 1
    Free,
    /// NFT Pago - Tipo 2 ($10)
    Tier2,
    /// NFT Pago - Tipo 3 ($30)
    Tier3,
    /// NFT Pago - Tipo 4 ($55)
    Tier4,
    /// NFT Pago - Tipo 5 ($100)
    Tier5,
    /// NFT Pago - Tipo 6 ($250)
    Tier6,
    /// NFT Pago - Tipo 7 ($500)
    Tier7,
}

/// Configuração de cada tipo de NFT
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct NFTConfig {
    /// Preço em USDT-SPL (em centavos para evitar decimais)
    pub price_usdt_cents: u64,
    /// Quantidade máxima de NFTs deste tipo
    pub max_supply: u32,
    /// Quantidade já mintada
    pub minted: u32,
    /// Total de tokens mineráveis por NFT individual
    pub tokens_per_nft: u128,
    /// Tokens minerados por dia por NFT
    pub daily_mining_rate: u128,
    /// Ativo para mineração
    pub active: bool,
}

/// Dados de um NFT individual
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct NFTData {
    /// ID único do NFT
    pub id: u64,
    /// Tipo do NFT
    pub nft_type: NFTType,
    /// Proprietário atual do NFT
    pub owner: AccountId,
    /// Timestamp de criação do NFT
    pub created_at: u64,
    /// Total de tokens minerados até o momento
    pub tokens_mined: u128,
    /// Total de tokens já resgatados
    pub tokens_claimed: u128,
    /// Timestamp da última mineração
    pub last_mining_timestamp: u64,
    /// Indica se o NFT está ativo
    pub active: bool,
    /// Raridade visual do NFT (determinada no mint)
    pub visual_rarity: VisualRarity,
    /// Contador de evoluções (quantas vezes foi evoluído)
    pub evolution_count: u8,
    /// Bônus de mining em basis points (1000 = 10%)
    pub mining_bonus_bps: u16,
    /// IDs dos NFTs queimados para criar este (se evoluído)
    pub evolved_from: Vec<u64>,
}

/// Posição de vesting para um usuário
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct VestingPosition {
    /// Total de tokens em vesting
    pub total_tokens: u128,
    /// Tokens já liberados
    pub released_tokens: u128,
    /// Tokens em staking (mesmo bloqueados)
    pub staked_tokens: u128,
    /// Recompensas de staking acumuladas
    pub staking_rewards: u128,
    /// Timestamp de início do vesting
    pub start_timestamp: u64,
    /// Timestamp de fim do vesting (start + 112 dias)
    pub end_timestamp: u64,
    /// Lista de NFTs que contribuem para esta posição
    pub nft_ids: Vec<u64>,
}

/// Configuração do staking de tokens em vesting
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct VestingStakingConfig {
    /// APY para staking de tokens em vesting (em basis points)
    pub apy_bps: u32,
    /// Pool de recompensas disponível
    pub rewards_pool: u128,
    /// Total de tokens em staking
    pub total_staked: u128,
    /// Ativo
    pub active: bool,
}

/// Estatísticas do ICO
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ICOStats {
    /// Total de NFTs mintados
    pub total_nfts_minted: u64,
    /// Total arrecadado em USDT (centavos)
    pub total_raised_usdt_cents: u64,
    /// Total de tokens minerados
    pub total_tokens_mined: u128,
    /// Total de tokens em vesting
    pub total_tokens_vesting: u128,
    /// Total de tokens em staking (vesting)
    pub total_vesting_staked: u128,
    /// Número de participantes únicos
    pub unique_participants: u32,
    /// ICO ativo
    pub ico_active: bool,
    /// Mineração ativa
    pub mining_active: bool,
}

/// Gerenciador principal do ICO
pub struct ICOManager {
    /// Configurações dos tipos de NFT
    pub nft_configs: Vec<NFTConfig>,
    /// Próximo ID de NFT
    pub next_nft_id: u64,
    /// Timestamp de início da mineração
    pub mining_start_timestamp: u64,
    /// Timestamp de fim da mineração (start + 112 dias)
    pub mining_end_timestamp: u64,
    /// Configuração do staking de vesting
    pub vesting_staking_config: VestingStakingConfig,
    /// Estatísticas do ICO
    pub stats: ICOStats,
    /// Mapeamento de NFTs por proprietário
    pub nfts_by_owner: Mapping<AccountId, Vec<u64>>,
    /// Mapeamento de dados de NFT por ID
    pub nfts: Mapping<u64, NFTData>,
    /// Configurações IPFS para cada tipo de NFT
    pub ipfs_configs: Vec<IPFSConfig>,
    /// Gateway IPFS padrão
    pub default_ipfs_gateway: String,
    /// URL base do projeto
    pub project_base_url: String,
    /// Hashes de transações de pagamento já utilizadas (prevenção double-spend)
    pub used_payment_hashes: Mapping<String, u64>,
    /// Gerenciador de evolução de NFTs
    pub evolution_manager: EvolutionManager,
    /// Gerenciador de raridade visual
    pub rarity_manager: RarityManager,
    /// Mapeamento de atributos visuais por NFT ID
    pub nft_visual_attributes: Mapping<u64, NFTVisualAttributes>,
}

impl ICOManager {
    /// Cria uma nova instância do gerenciador de ICO
    pub fn new() -> Self {
        let mut manager = Self {
            nft_configs: Vec::new(),
            next_nft_id: 1,
            mining_start_timestamp: 0,
            mining_end_timestamp: 0,
            vesting_staking_config: VestingStakingConfig {
                apy_bps: 1200, // 12% APY
                rewards_pool: 0,
                total_staked: 0,
                active: true,
            },
            stats: ICOStats {
                total_nfts_minted: 0,
                total_raised_usdt_cents: 0,
                total_tokens_mined: 0,
                total_tokens_vesting: 0,
                total_vesting_staked: 0,
                unique_participants: 0,
                ico_active: true,
                mining_active: false,
            },
            nfts_by_owner: Mapping::default(),
            nfts: Mapping::default(),
            ipfs_configs: Vec::new(),
            default_ipfs_gateway: String::from("https://ipfs.io/ipfs/"),
            project_base_url: String::from("https://donfiapocoin.com"),
            used_payment_hashes: Mapping::default(),
            evolution_manager: EvolutionManager::new(),
            rarity_manager: RarityManager::new(),
            nft_visual_attributes: Mapping::default(),
        };
        
        manager.initialize_nft_configs();
        manager.initialize_ipfs_configs();
        manager
    }

    /// Verifica se uma transação de pagamento já foi utilizada
    pub fn is_payment_used(&self, transaction_hash: &String) -> bool {
        self.used_payment_hashes.contains(transaction_hash)
    }

    /// Marca uma transação de pagamento como utilizada
    pub fn mark_payment_used(&mut self, transaction_hash: String, nft_id: u64) {
        self.used_payment_hashes.insert(transaction_hash, &nft_id);
    }

    /// Valida o formato do hash de transação Solana (87-88 chars base58)
    fn validate_transaction_hash(&self, hash: &str) -> bool {
        hash.len() >= 87 && hash.len() <= 88
    }

    /// Valida o formato do endereço Solana (44 chars base58)
    fn validate_solana_address(&self, address: &str) -> bool {
        address.len() == 44
    }

    /// Verifica a prova de pagamento para NFTs pagos
    /// 
    /// # Segurança
    /// - Valida formato do hash de transação
    /// - Valida formato do endereço Solana
    /// - Verifica se a transação já foi utilizada (prevenção double-spend)
    /// - Verifica se o valor pago é suficiente
    pub fn verify_payment(
        &self,
        payment_proof: &PaymentProof,
        nft_type: &NFTType,
    ) -> Result<(), ICOError> {
        // 1. Validar formato do hash de transação
        if !self.validate_transaction_hash(&payment_proof.transaction_hash) {
            return Err(ICOError::InvalidTransactionHash);
        }

        // 2. Validar formato do endereço Solana
        if !self.validate_solana_address(&payment_proof.sender_address) {
            return Err(ICOError::InvalidPaymentProof);
        }

        // 3. Verificar se a transação já foi utilizada
        if self.is_payment_used(&payment_proof.transaction_hash) {
            return Err(ICOError::PaymentAlreadyUsed);
        }

        // 4. Obter preço esperado do NFT
        let config = self.get_nft_config(nft_type).ok_or(ICOError::InvalidNFTType)?;
        
        // Converter preço de centavos para USDT com 6 decimais
        // price_usdt_cents é em centavos (ex: 1000 = $10.00)
        // amount_usdt é em 6 decimais (ex: 10_000_000 = $10.00)
        let expected_amount_usdt = (config.price_usdt_cents as u64).saturating_mul(10_000); // centavos * 10000 = 6 decimais

        // 5. Verificar se o valor pago é suficiente (com 1% de tolerância para taxas de rede)
        let min_amount = expected_amount_usdt.saturating_mul(99).saturating_div(100);
        if payment_proof.amount_usdt < min_amount {
            return Err(ICOError::PaymentAmountMismatch);
        }

        Ok(())
    }

    /// Verifica se um usuário pode mintar um NFT gratuito
    pub fn can_mint_free_nft(&self, caller: &AccountId, lunes_balance: u128) -> Result<(), ICOError> {
        // Verificar se o ICO está ativo
        if !self.stats.ico_active {
            return Err(ICOError::ICONotActive);
        }
        
        // Verificar se o usuário tem pelo menos 10 LUNES para mintar NFTs adicionais
        let nfts_owned = self.count_nfts_by_type(caller, NFTType::Free);
        if nfts_owned >= 5 {
            return Err(ICOError::MaxFreeNFTsReached);
        }
        
        // Se já tem mais de 1 NFT, precisa ter pelo menos 10 LUNES
        if nfts_owned > 0 && lunes_balance < 10 * 10u128.pow(8) { // 10 LUNES com 8 decimais
            return Err(ICOError::InsufficientLunesBalance);
        }
        
        Ok(())
    }

    /// Conta quantos NFTs de um tipo específico um usuário possui
    fn count_nfts_by_type(&self, owner: &AccountId, nft_type: NFTType) -> u32 {
        let nfts = self.nfts_by_owner.get(owner).unwrap_or_default();
        nfts.iter()
            .filter(|&&nft_id| {
                if let Some(nft_data) = self.nfts.get(&nft_id) {
                    nft_data.nft_type == nft_type
                } else {
                    false
                }
            })
            .count() as u32
    }

    /// Calcula o total de tokens alocados para todos os tipos de NFT
    #[allow(dead_code)]
    fn calculate_total_allocated_tokens(&self) -> u128 {
        self.nft_configs.iter()
            .map(|config| {
                let total_nfts = config.max_supply as u128;
                total_nfts.saturating_mul(config.tokens_per_nft)
            })
            .sum()
    }

    /// Processa a mineração de tokens para um NFT específico
    pub fn process_mining(&mut self, nft_id: u64) -> Result<u128, ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        
        if !nft_data.active {
            return Err(ICOError::NFTInactive);
        }
        
        if !self.stats.mining_active {
            return Err(ICOError::MiningNotActive);
        }
        
        let current_timestamp = ink::env::block_timestamp::<DefaultEnvironment>();
        
        // Calcular tokens minerados desde a última mineração
        let mined_tokens = self.calculate_mined_tokens(&nft_data, current_timestamp);
        
        if mined_tokens > 0 {
            // Atualizar dados do NFT
            let mut updated_nft = nft_data.clone();
            updated_nft.tokens_mined = updated_nft.tokens_mined.saturating_add(mined_tokens);
            updated_nft.last_mining_timestamp = current_timestamp;
            
            self.nfts.insert(&nft_id, &updated_nft);
            
            // Atualizar estatísticas
            self.stats.total_tokens_mined = self.stats.total_tokens_mined.saturating_add(mined_tokens);
        }
        
        Ok(mined_tokens)
    }

    /// Calcula tokens que podem ser resgatados de um NFT
    pub fn get_claimable_tokens(&self, nft_id: u64) -> Result<u128, ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        
        if !nft_data.active {
            return Err(ICOError::NFTInactive);
        }
        
        let current_timestamp = ink::env::block_timestamp::<DefaultEnvironment>();
        let total_mined = self.calculate_mined_tokens(&nft_data, current_timestamp);
        let already_claimed = nft_data.tokens_claimed;
        
        Ok(total_mined.saturating_sub(already_claimed))
    }

    /// Coloca tokens em staking durante o período de vesting
    pub fn stake_tokens(
        &mut self,
        nft_id: u64,
        amount: u128,
        _staking_type: StakingType,
    ) -> Result<u128, ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        
        if !nft_data.active {
            return Err(ICOError::NFTInactive);
        }
        
        // Verificar se há tokens suficientes para staking
        let claimable = self.get_claimable_tokens(nft_id)?;
        if claimable < amount {
            return Err(ICOError::InsufficientTokensForStaking);
        }
        
        // Verificar se o staking de vesting está ativo
        if !self.vesting_staking_config.active {
            return Err(ICOError::Unauthorized);
        }
        
        // Calcular recompensas de staking
        let _current_timestamp = ink::env::block_timestamp::<DefaultEnvironment>();
        let days_staked = 1; // Simplificado para o exemplo
        let rewards = self.calculate_vesting_staking_rewards(amount, days_staked);
        
        // Atualizar configuração de staking
        self.vesting_staking_config.total_staked = self.vesting_staking_config.total_staked.saturating_add(amount);
        self.vesting_staking_config.rewards_pool = self.vesting_staking_config.rewards_pool.saturating_sub(rewards);
        
        // Atualizar estatísticas
        self.stats.total_vesting_staked = self.stats.total_vesting_staked.saturating_add(amount);
        
        Ok(rewards)
    }

    /// Remove tokens do staking durante o período de vesting
    pub fn unstake_tokens(
        &mut self,
        nft_id: u64,
        amount: u128,
        _staking_type: StakingType,
    ) -> Result<u128, ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        
        if !nft_data.active {
            return Err(ICOError::NFTInactive);
        }
        
        // Verificar se há tokens suficientes em staking
        if self.vesting_staking_config.total_staked < amount {
            return Err(ICOError::InsufficientTokensForStaking);
        }
        
        // Calcular recompensas finais
        let _current_timestamp = ink::env::block_timestamp::<DefaultEnvironment>();
        let days_staked = 1; // Simplificado para o exemplo
        let rewards = self.calculate_vesting_staking_rewards(amount, days_staked);
        
        // Atualizar configuração de staking
        self.vesting_staking_config.total_staked = self.vesting_staking_config.total_staked.saturating_sub(amount);
        self.vesting_staking_config.rewards_pool = self.vesting_staking_config.rewards_pool.saturating_sub(rewards);
        
        // Atualizar estatísticas
        self.stats.total_vesting_staked = self.stats.total_vesting_staked.saturating_sub(amount);
        
        Ok(rewards)
    }

    /// Resgata tokens de um NFT (apenas após o fim do vesting)
    pub fn claim_tokens(&mut self, nft_id: u64) -> Result<u128, ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        
        if !nft_data.active {
            return Err(ICOError::NFTInactive);
        }
        
        let current_timestamp = ink::env::block_timestamp::<DefaultEnvironment>();
        
        // Verificar se o período de vesting terminou
        if !self.is_vesting_ended(current_timestamp) {
            return Err(ICOError::VestingNotEnded);
        }
        
        let claimable = self.get_claimable_tokens(nft_id)?;
        
        if claimable > 0 {
            // Atualizar dados do NFT
            let mut updated_nft = nft_data.clone();
            updated_nft.tokens_claimed = updated_nft.tokens_claimed.saturating_add(claimable);
            
            self.nfts.insert(&nft_id, &updated_nft);
        }
        
        Ok(claimable)
    }

    /// Cria um novo NFT
    /// 
    /// # Segurança
    /// - Para NFTs gratuitos: verifica saldo LUNES e limite de NFTs
    /// - Para NFTs pagos: requer e valida prova de pagamento USDT
    /// - Previne double-spend de transações de pagamento
    /// 
    /// # Parâmetros
    /// - `nft_type`: Tipo do NFT a ser mintado
    /// - `lunes_balance`: Saldo LUNES do usuário (para NFTs gratuitos)
    /// - `payment_proof`: Prova de pagamento USDT (obrigatório para NFTs pagos)
    pub fn mint_nft(
        &mut self,
        nft_type: NFTType,
        lunes_balance: u128,
        payment_proof: Option<PaymentProof>,
    ) -> Result<u64, ICOError> {
        // Verificar se o ICO está ativo
        if !self.stats.ico_active {
            return Err(ICOError::ICONotActive);
        }
        
        let caller = ink::env::caller::<DefaultEnvironment>();
        
        // Verificações específicas para NFTs gratuitos
        if nft_type == NFTType::Free {
            self.can_mint_free_nft(&caller, lunes_balance)?;
        } else {
            // Para NFTs pagos: REQUER prova de pagamento
            let proof = payment_proof.as_ref().ok_or(ICOError::PaymentRequired)?;
            
            // Verificar a prova de pagamento
            self.verify_payment(proof, &nft_type)?;
            
            // Marcar transação como utilizada (será feito após criação do NFT)
        }
        
        // Verificar se há supply disponível
        let config = self.get_nft_config(&nft_type).ok_or(ICOError::InvalidNFTType)?;
        if config.minted >= config.max_supply {
            return Err(ICOError::MaxSupplyReached);
        }
        
        // Criar o NFT
        let nft_id = self.next_nft_id;
        let current_timestamp = ink::env::block_timestamp::<DefaultEnvironment>();
        let block_number = ink::env::block_number::<DefaultEnvironment>();
        
        // Obter tier do NFT para gerar atributos visuais
        let nft_tier = self.nft_type_to_tier(&nft_type);
        
        // Gerar raridade visual (RNG no momento do mint)
        let caller_bytes: [u8; 32] = *caller.as_ref();
        let rarity_result = self.rarity_manager.roll_rarity(
            current_timestamp,
            block_number,
            &caller_bytes,
            nft_id,
            nft_tier,
        );
        
        let nft_data = NFTData {
            id: nft_id,
            nft_type: nft_type.clone(),
            owner: caller,
            created_at: current_timestamp,
            tokens_mined: 0,
            tokens_claimed: 0,
            last_mining_timestamp: current_timestamp,
            active: true,
            visual_rarity: rarity_result.rarity,
            evolution_count: 0,
            mining_bonus_bps: 0,
            evolved_from: Vec::new(),
        };
        
        // Armazenar atributos visuais separadamente
        let visual_attrs = NFTVisualAttributes {
            rarity: rarity_result.rarity,
            attributes: rarity_result.attributes,
            seed_hash: rarity_result.roll_value as u64,
            revealed: true,
        };
        self.nft_visual_attributes.insert(&nft_id, &visual_attrs);
        
        // Armazenar o NFT
        self.nfts.insert(&nft_id, &nft_data);
        
        // Atualizar lista de NFTs do proprietário
        let mut owner_nfts = self.nfts_by_owner.get(&caller).unwrap_or_default();
        owner_nfts.push(nft_id);
        self.nfts_by_owner.insert(&caller, &owner_nfts);
        
        // Atualizar configuração do tipo de NFT
        if let Some(config_mut) = self.get_nft_config_mut(&nft_type) {
            config_mut.minted = config_mut.minted.saturating_add(1);
        }
        
        // Atualizar estatísticas
        self.next_nft_id = self.next_nft_id.saturating_add(1);
        self.stats.total_nfts_minted = self.stats.total_nfts_minted.saturating_add(1);
        
        // Para NFTs pagos: marcar transação como utilizada e adicionar ao total arrecadado
        if nft_type != NFTType::Free {
            // Marcar transação de pagamento como usada (prevenção double-spend)
            if let Some(proof) = payment_proof {
                self.mark_payment_used(proof.transaction_hash, nft_id);
            }
            
            if let Some(config) = self.get_nft_config(&nft_type) {
                self.stats.total_raised_usdt_cents = self.stats.total_raised_usdt_cents.saturating_add(config.price_usdt_cents);
            }
        }
        
        Ok(nft_id)
    }

    /// Inicializa as configurações dos tipos de NFT
    /// ESTRUTURA PROGRESSIVA: Quanto maior o tier, maior a mineração diária
    fn initialize_nft_configs(&mut self) {
        self.nft_configs = vec![
            NFTConfig {
                price_usdt_cents: 0, // Gratuito
                max_supply: 10_000,
                minted: 0,
                tokens_per_nft: 560 * 10u128.pow(8), // 560 FIAPO (5/dia x 112 dias)
                daily_mining_rate: 5 * 10u128.pow(8), // 5 tokens/dia
                active: true,
            },
            NFTConfig {
                price_usdt_cents: 1000, // $10.00
                max_supply: 50_000,
                minted: 0,
                tokens_per_nft: 5_600 * 10u128.pow(8), // 5.600 FIAPO (50/dia x 112 dias)
                daily_mining_rate: 50 * 10u128.pow(8), // 50 tokens/dia
                active: true,
            },
            NFTConfig {
                price_usdt_cents: 3000, // $30.00
                max_supply: 40_000,
                minted: 0,
                tokens_per_nft: 16_800 * 10u128.pow(8), // 16.800 FIAPO (150/dia x 112 dias)
                daily_mining_rate: 150 * 10u128.pow(8), // 150 tokens/dia
                active: true,
            },
            NFTConfig {
                price_usdt_cents: 5500, // $55.00
                max_supply: 30_000,
                minted: 0,
                tokens_per_nft: 33_600 * 10u128.pow(8), // 33.600 FIAPO (300/dia x 112 dias)
                daily_mining_rate: 300 * 10u128.pow(8), // 300 tokens/dia
                active: true,
            },
            NFTConfig {
                price_usdt_cents: 10000, // $100.00
                max_supply: 20_000,
                minted: 0,
                tokens_per_nft: 56_000 * 10u128.pow(8), // 56.000 FIAPO (500/dia x 112 dias)
                daily_mining_rate: 500 * 10u128.pow(8), // 500 tokens/dia
                active: true,
            },
            NFTConfig {
                price_usdt_cents: 25000, // $250.00
                max_supply: 5_000,
                minted: 0,
                tokens_per_nft: 134_400 * 10u128.pow(8), // 134.400 FIAPO (1200/dia x 112 dias)
                daily_mining_rate: 1200 * 10u128.pow(8), // 1.200 tokens/dia
                active: true,
            },
            NFTConfig {
                price_usdt_cents: 50000, // $500.00
                max_supply: 2_000,
                minted: 0,
                tokens_per_nft: 280_000 * 10u128.pow(8), // 280.000 FIAPO (2500/dia x 112 dias)
                daily_mining_rate: 2500 * 10u128.pow(8), // 2.500 tokens/dia
                active: true,
            },
        ];
    }

    /// Inicializa as configurações IPFS para cada tipo de NFT
    /// IPFS hashes uploaded via Pinata on 2025-12-30
    fn initialize_ipfs_configs(&mut self) {
        self.ipfs_configs = vec![
            // NFT Gratuito - The Shovel of the Commoner Miner
            IPFSConfig {
                image_hash: String::from("bafybeiegeqvx36cqwjnuexq5rqimd4gtzitnc6havjdxixvrsrnhnugwie"),
                metadata_hash: String::from("bafkreialowx7hkvxs43pzep3dnnli7u47rdz5hdzjag3suf6lchr2xrsfy"),
                gateway_url: self.default_ipfs_gateway.clone(),
            },
            // NFT Tier 2 - The Pickaxe of the Royal Guard
            IPFSConfig {
                image_hash: String::from("bafybeia6hp4i42r22l7rotv536bawcmb3jbm2zxqpuifti464hhjaa7qt4"),
                metadata_hash: String::from("bafkreiaqq6fqo34o5da7qc7m3ibluh7cvchf6xbt6lkyp65gnncdwak5jy"),
                gateway_url: self.default_ipfs_gateway.clone(),
            },
            // NFT Tier 3 - The Candelabrum of the Explorer
            IPFSConfig {
                image_hash: String::from("bafybeicalundyfevl3lwcje2cwrwsxk6rfaihi7ufaxlnxebr6vy6qwmay"),
                metadata_hash: String::from("bafkreigp7z6enxowwzsiarpcxboutxxpbyb7f2roqgb35hxqxeob3f2epa"),
                gateway_url: self.default_ipfs_gateway.clone(),
            },
            // NFT Tier 4 - The Power to Unlock the Kingdom's Wealth
            IPFSConfig {
                image_hash: String::from("bafybeid7nxupxhudefbvd36nd45nd3cxfqiybzrbaor2infnjq3hoalanm"),
                metadata_hash: String::from("bafkreidn5klyignb7y6skguanaixee2tnhi32tyfehsufn2paqvcuspuwu"),
                gateway_url: self.default_ipfs_gateway.clone(),
            },
            // NFT Tier 5 - The Royal Treasure Map
            IPFSConfig {
                image_hash: String::from("bafybeidaesu4zssaeh2upn7tpe664iqn2v5tr6focmrrd753sxnkitissa"),
                metadata_hash: String::from("bafkreigyljgp6pt3ukb3xghngurb6akdkvbqp7l4geqxtp7btneruqtyhe"),
                gateway_url: self.default_ipfs_gateway.clone(),
            },
            // NFT Tier 6 - The Golden Mango Eye
            IPFSConfig {
                image_hash: String::from("bafybeicydbtys4etbit3xyyn2jcovcntoqjkrwyfvoh7si6ykh7is3skdu"),
                metadata_hash: String::from("bafkreienipvdroutcqyf2gmf4zm7a2ttoewooam5wtjl7cmpfqqp3urzwi"),
                gateway_url: self.default_ipfs_gateway.clone(),
            },
            // NFT Tier 7 - The Royal Scepter of Don Himself
            IPFSConfig {
                image_hash: String::from("bafybeifjhbupjwplkknvixya223saxdcn2zkhrmir7o7xrbzhywlp5irce"),
                metadata_hash: String::from("bafkreidg7cyym2ggwrywbdbx45mvnjfufnd25qjpvymmbmqne4dfkmj4uy"),
                gateway_url: self.default_ipfs_gateway.clone(),
            },
        ];
    }

    /// Inicia o período de mineração
    pub fn start_mining(&mut self, current_timestamp: u64) {
        self.mining_start_timestamp = current_timestamp;
        self.mining_end_timestamp = current_timestamp.saturating_add(112 * 24 * 60 * 60 * 1000); // 112 dias em milissegundos
        self.stats.mining_active = true;
    }

    /// Verifica se a mineração está ativa
    pub fn is_mining_active(&self, current_timestamp: u64) -> bool {
        self.stats.mining_active && 
        current_timestamp >= self.mining_start_timestamp && 
        current_timestamp <= self.mining_end_timestamp
    }

    /// Verifica se o período de vesting terminou
    pub fn is_vesting_ended(&self, current_timestamp: u64) -> bool {
        current_timestamp >= self.mining_end_timestamp
    }

    /// Obtém a configuração de um tipo de NFT
    pub fn get_nft_config(&self, nft_type: &NFTType) -> Option<&NFTConfig> {
        let index = match nft_type {
            NFTType::Free => 0,
            NFTType::Tier2 => 1,
            NFTType::Tier3 => 2,
            NFTType::Tier4 => 3,
            NFTType::Tier5 => 4,
            NFTType::Tier6 => 5,
            NFTType::Tier7 => 6,
        };
        self.nft_configs.get(index)
    }

    /// Obtém a configuração mutável de um tipo de NFT
    pub fn get_nft_config_mut(&mut self, nft_type: &NFTType) -> Option<&mut NFTConfig> {
        let index = match nft_type {
            NFTType::Free => 0,
            NFTType::Tier2 => 1,
            NFTType::Tier3 => 2,
            NFTType::Tier4 => 3,
            NFTType::Tier5 => 4,
            NFTType::Tier6 => 5,
            NFTType::Tier7 => 6,
        };
        self.nft_configs.get_mut(index)
    }

    /// Calcula tokens minerados por um NFT
    pub fn calculate_mined_tokens(&self, nft: &NFTData, current_timestamp: u64) -> u128 {
        if !self.stats.mining_active {
            return 0;
        }
        
        let config = match self.get_nft_config(&nft.nft_type) {
            Some(c) => c,
            None => return 0,
        };
        
        let start_time = self.mining_start_timestamp.max(nft.created_at);
        let end_time = self.mining_end_timestamp.min(current_timestamp);
        
        if start_time >= end_time {
            return 0;
        }
        
        let days_elapsed = (end_time.saturating_sub(start_time) as u128)
            .saturating_div(24 * 60 * 60 * 1000); // Converter para dias
        
        let daily_rate = config.daily_mining_rate;
        days_elapsed.saturating_mul(daily_rate)
    }

    /// Retorna a URI dos metadados de um NFT (compatível com PSP34)
    pub fn token_uri(&self, nft_id: u64) -> Result<String, ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        let ipfs_config = self.get_ipfs_config(&nft_data.nft_type)?;
        
        let uri = format!("{}{}", ipfs_config.gateway_url, ipfs_config.metadata_hash);
        Ok(uri)
    }

    /// Retorna os metadados completos de um NFT
    pub fn get_nft_metadata(&self, nft_id: u64) -> Result<NFTMetadata, ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        let config = self.get_nft_config(&nft_data.nft_type).ok_or(ICOError::InvalidNFTType)?;
        let ipfs_config = self.get_ipfs_config(&nft_data.nft_type)?;
        
        let (name, description, rarity) = self.get_nft_display_info(&nft_data.nft_type);
        
        let metadata = NFTMetadata {
            name,
            description,
            image: format!("{}{}", ipfs_config.gateway_url, ipfs_config.image_hash),
            external_url: self.project_base_url.clone(),
            attributes: vec![
                NFTAttribute {
                    trait_type: String::from("Type"),
                    value: if nft_data.nft_type == NFTType::Free { String::from("Free") } else { String::from("Paid") },
                    display_type: None,
                },
                NFTAttribute {
                    trait_type: String::from("Rarity"),
                    value: rarity,
                    display_type: None,
                },
                NFTAttribute {
                    trait_type: String::from("Mining Power"),
                    value: format!("{} FIAPO/day", config.daily_mining_rate / 10u128.pow(8)),
                    display_type: Some(String::from("number")),
                },
                NFTAttribute {
                    trait_type: String::from("Total Mineable"),
                    value: format!("{} FIAPO", config.tokens_per_nft / 10u128.pow(8)),
                    display_type: Some(String::from("number")),
                },
                NFTAttribute {
                    trait_type: String::from("Price"),
                    value: if config.price_usdt_cents == 0 { String::from("Free") } else { format!("${}", config.price_usdt_cents / 100) },
                    display_type: None,
                },
                NFTAttribute {
                    trait_type: String::from("Max Supply"),
                    value: format!("{}", config.max_supply),
                    display_type: Some(String::from("number")),
                },
                NFTAttribute {
                    trait_type: String::from("Minted"),
                    value: format!("{}", config.minted),
                    display_type: Some(String::from("number")),
                },
                NFTAttribute {
                    trait_type: String::from("NFT ID"),
                    value: format!("{}", nft_id),
                    display_type: Some(String::from("number")),
                },
                NFTAttribute {
                    trait_type: String::from("Created At"),
                    value: format!("{}", nft_data.created_at),
                    display_type: Some(String::from("date")),
                },
                NFTAttribute {
                    trait_type: String::from("Tokens Mined"),
                    value: format!("{} FIAPO", nft_data.tokens_mined / 10u128.pow(8)),
                    display_type: Some(String::from("number")),
                },
                NFTAttribute {
                    trait_type: String::from("Mining Status"),
                    value: if nft_data.active && self.stats.mining_active { String::from("Active") } else { String::from("Inactive") },
                    display_type: None,
                },
            ],
        };
        
        Ok(metadata)
    }

    /// Retorna estatísticas de mineração de um NFT
    pub fn get_mining_stats(&self, nft_id: u64) -> Result<(u128, u128, u128, u64), ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        let config = self.get_nft_config(&nft_data.nft_type).ok_or(ICOError::InvalidNFTType)?;
        
        let current_timestamp = ink::env::block_timestamp::<DefaultEnvironment>();
        let total_mineable = config.tokens_per_nft;
        let currently_mined = self.calculate_mined_tokens(&nft_data, current_timestamp);
        let claimable = currently_mined.saturating_sub(nft_data.tokens_claimed);
        let days_remaining = if current_timestamp < self.mining_end_timestamp {
            (self.mining_end_timestamp.saturating_sub(current_timestamp) / (24 * 60 * 60 * 1000)) as u64
        } else {
            0
        };
        
        Ok((total_mineable, currently_mined, claimable, days_remaining))
    }

    /// Obtém informações de exibição para um tipo de NFT
    pub fn get_nft_display_info(&self, nft_type: &NFTType) -> (String, String, String) {
        match nft_type {
            NFTType::Free => (
                String::from("The Shovel of the Commoner Miner"),
                String::from("A humble but reliable tool for the everyday miner. This free NFT grants access to the Don Fiapo mining ecosystem, allowing holders to mine 11,700 FIAPO tokens over 112 days."),
                String::from("Common")
            ),
            NFTType::Tier2 => (
                String::from("The Pickaxe of the Royal Guard"),
                String::from("A sturdy pickaxe wielded by the royal guards. This $10 NFT provides the same mining power as the free version but supports the project's development."),
                String::from("Common")
            ),
            NFTType::Tier3 => (
                String::from("The Candelabrum of the Explorer"),
                String::from("An ancient candelabrum that lights the way for brave explorers. This $30 NFT mines 29,250 FIAPO tokens over 112 days with enhanced daily rewards."),
                String::from("Uncommon")
            ),
            NFTType::Tier4 => (
                String::from("The Power to Unlock the Kingdom's Wealth"),
                String::from("A mystical artifact that holds the power to unlock hidden treasures. This $55 NFT mines 52,000 FIAPO tokens with significant daily mining power."),
                String::from("Rare")
            ),
            NFTType::Tier5 => (
                String::from("The Royal Treasure Map"),
                String::from("A detailed map leading to the kingdom's greatest treasures. This $100 NFT mines 39,000 FIAPO tokens with premium mining capabilities."),
                String::from("Epic")
            ),
            NFTType::Tier6 => (
                String::from("The Golden Mango Eye"),
                String::from("A legendary golden eye that sees all treasures in the realm. This $250 NFT mines 117,000 FIAPO tokens with exceptional daily rewards."),
                String::from("Legendary")
            ),
            NFTType::Tier7 => (
                String::from("The Royal Scepter of Don Himself"),
                String::from("The ultimate symbol of power in the Don Fiapo kingdom. This $500 NFT mines 136,500 FIAPO tokens with the highest mining rate available."),
                String::from("Mythic")
            ),
        }
    }

    /// Obtém a configuração IPFS para um tipo de NFT
    pub fn get_ipfs_config(&self, nft_type: &NFTType) -> Result<&IPFSConfig, ICOError> {
        let index = match nft_type {
            NFTType::Free => 0,
            NFTType::Tier2 => 1,
            NFTType::Tier3 => 2,
            NFTType::Tier4 => 3,
            NFTType::Tier5 => 4,
            NFTType::Tier6 => 5,
            NFTType::Tier7 => 6,
        };
        self.ipfs_configs.get(index).ok_or(ICOError::InvalidNFTType)
    }

    /// Atualiza o hash IPFS de uma imagem NFT (apenas admin)
    pub fn update_nft_image_hash(&mut self, nft_type: NFTType, new_hash: String) -> Result<(), ICOError> {
        let index = match nft_type {
            NFTType::Free => 0,
            NFTType::Tier2 => 1,
            NFTType::Tier3 => 2,
            NFTType::Tier4 => 3,
            NFTType::Tier5 => 4,
            NFTType::Tier6 => 5,
            NFTType::Tier7 => 6,
        };
        
        if let Some(config) = self.ipfs_configs.get_mut(index) {
            config.image_hash = new_hash;
            Ok(())
        } else {
            Err(ICOError::InvalidNFTType)
        }
    }

    /// Atualiza o hash IPFS dos metadados de um NFT (apenas admin)
    pub fn update_nft_metadata_hash(&mut self, nft_type: NFTType, new_hash: String) -> Result<(), ICOError> {
        let index = match nft_type {
            NFTType::Free => 0,
            NFTType::Tier2 => 1,
            NFTType::Tier3 => 2,
            NFTType::Tier4 => 3,
            NFTType::Tier5 => 4,
            NFTType::Tier6 => 5,
            NFTType::Tier7 => 6,
        };
        
        if let Some(config) = self.ipfs_configs.get_mut(index) {
            config.metadata_hash = new_hash;
            Ok(())
        } else {
            Err(ICOError::InvalidNFTType)
        }
    }

    /// Atualiza o gateway IPFS padrão (apenas admin)
    pub fn update_ipfs_gateway(&mut self, new_gateway: String) {
        self.default_ipfs_gateway = new_gateway.clone();
        for config in &mut self.ipfs_configs {
            config.gateway_url = new_gateway.clone();
        }
    }

    /// Calcula recompensas de staking durante vesting
    pub fn calculate_vesting_staking_rewards(&self, staked_amount: u128, days_staked: u64) -> u128 {
        if !self.vesting_staking_config.active {
            return 0;
        }
        
        let apy_bps = self.vesting_staking_config.apy_bps as u128;
        let daily_rate = apy_bps.saturating_mul(365).saturating_div(10000);
        
        staked_amount.saturating_mul(daily_rate).saturating_mul(days_staked as u128).saturating_div(365)
    }

    // =========================================================================
    // SISTEMA DE EVOLUÇÃO DE NFTs
    // =========================================================================

    /// Converte NFTType para tier numérico
    pub fn nft_type_to_tier(&self, nft_type: &NFTType) -> u8 {
        match nft_type {
            NFTType::Free => 0,
            NFTType::Tier2 => 1,
            NFTType::Tier3 => 2,
            NFTType::Tier4 => 3,
            NFTType::Tier5 => 4,
            NFTType::Tier6 => 5,
            NFTType::Tier7 => 6,
        }
    }

    /// Converte tier numérico para NFTType
    pub fn tier_to_nft_type(&self, tier: u8) -> Option<NFTType> {
        match tier {
            0 => Some(NFTType::Free),
            1 => Some(NFTType::Tier2),
            2 => Some(NFTType::Tier3),
            3 => Some(NFTType::Tier4),
            4 => Some(NFTType::Tier5),
            5 => Some(NFTType::Tier6),
            6 => Some(NFTType::Tier7),
            _ => None,
        }
    }

    /// Evolui NFTs queimando 2+ do mesmo tipo para criar um do tier superior
    /// 
    /// # Regras:
    /// - Mínimo 2 NFTs do mesmo tipo
    /// - Todos devem pertencer ao caller
    /// - NFT resultante tem +10% de bônus de mining (cumulativo)
    /// - Tier 6 não pode evoluir
    pub fn evolve_nfts(&mut self, nft_ids: Vec<u64>) -> Result<u64, ICOError> {
        let caller = ink::env::caller::<DefaultEnvironment>();
        
        // Verificar se há NFTs suficientes
        if nft_ids.len() < 2 {
            return Err(ICOError::EvolutionInsufficientNFTs);
        }
        
        // Coletar tiers e verificar propriedade
        let mut nft_tiers: Vec<u8> = Vec::new();
        for &nft_id in &nft_ids {
            let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
            
            // Verificar propriedade
            if nft_data.owner != caller {
                return Err(ICOError::NotNFTOwner);
            }
            
            // Verificar se está ativo
            if !nft_data.active {
                return Err(ICOError::NFTInactive);
            }
            
            nft_tiers.push(self.nft_type_to_tier(&nft_data.nft_type));
        }
        
        // Validar evolução usando o evolution manager
        let result_tier = self.evolution_manager.can_evolve(&nft_tiers)
            .map_err(|e| match e {
                EvolutionError::SystemNotActive => ICOError::EvolutionSystemNotActive,
                EvolutionError::InsufficientNFTs => ICOError::EvolutionInsufficientNFTs,
                EvolutionError::NFTTypeMismatch => ICOError::EvolutionTypeMismatch,
                EvolutionError::MaxTierReached => ICOError::EvolutionMaxTierReached,
                _ => ICOError::InvalidOperation,
            })?;
        
        // Obter tipo do NFT resultante
        let result_nft_type = self.tier_to_nft_type(result_tier)
            .ok_or(ICOError::InvalidNFTType)?;
        
        // Calcular bônus acumulado (considera se algum NFT já era evoluído)
        let max_evolution_count = nft_ids.iter()
            .filter_map(|id| self.nfts.get(id))
            .map(|nft| nft.evolution_count)
            .max()
            .unwrap_or(0);
        let new_evolution_count = max_evolution_count.saturating_add(1);
        
        // Calcular novo mining rate com bônus
        let config = self.get_nft_config(&result_nft_type).ok_or(ICOError::InvalidNFTType)?;
        let _base_mining_rate = config.daily_mining_rate;
        let bonus_bps = self.evolution_manager.config.evolution_bonus_bps
            .saturating_mul(new_evolution_count as u16);
        
        // Desativar NFTs queimados
        for &nft_id in &nft_ids {
            if let Some(mut nft_data) = self.nfts.get(&nft_id) {
                nft_data.active = false;
                self.nfts.insert(&nft_id, &nft_data);
            }
        }
        
        // Criar novo NFT evoluído
        let new_nft_id = self.next_nft_id;
        let current_timestamp = ink::env::block_timestamp::<DefaultEnvironment>();
        let block_number = ink::env::block_number::<DefaultEnvironment>();
        
        // Gerar raridade visual para NFT evoluído (garantir pelo menos Uncommon)
        let caller_bytes: [u8; 32] = *caller.as_ref();
        let mut rarity_result = self.rarity_manager.roll_rarity(
            current_timestamp,
            block_number,
            &caller_bytes,
            new_nft_id,
            result_tier,
        );
        
        // NFTs evoluídos têm raridade mínima Uncommon
        if rarity_result.rarity == VisualRarity::Common {
            rarity_result.rarity = VisualRarity::Uncommon;
            rarity_result.attributes = self.rarity_manager.generate_attributes(
                VisualRarity::Uncommon,
                result_tier,
            );
        }
        
        let new_nft_data = NFTData {
            id: new_nft_id,
            nft_type: result_nft_type,
            owner: caller,
            created_at: current_timestamp,
            tokens_mined: 0,
            tokens_claimed: 0,
            last_mining_timestamp: current_timestamp,
            active: true,
            visual_rarity: rarity_result.rarity,
            evolution_count: new_evolution_count,
            mining_bonus_bps: bonus_bps,
            evolved_from: nft_ids.clone(),
        };
        
        // Armazenar atributos visuais
        let visual_attrs = NFTVisualAttributes {
            rarity: rarity_result.rarity,
            attributes: rarity_result.attributes,
            seed_hash: rarity_result.roll_value as u64,
            revealed: true,
        };
        self.nft_visual_attributes.insert(&new_nft_id, &visual_attrs);
        
        // Armazenar NFT
        self.nfts.insert(&new_nft_id, &new_nft_data);
        
        // Atualizar lista de NFTs do proprietário
        let mut owner_nfts = self.nfts_by_owner.get(&caller).unwrap_or_default();
        owner_nfts.push(new_nft_id);
        self.nfts_by_owner.insert(&caller, &owner_nfts);
        
        // Registrar evolução
        self.evolution_manager.record_evolution(nft_ids.len() as u64);
        self.next_nft_id = self.next_nft_id.saturating_add(1);
        
        Ok(new_nft_id)
    }

    /// Retorna o mining rate efetivo de um NFT (base + bônus de evolução)
    pub fn get_effective_mining_rate(&self, nft_id: u64) -> Result<u128, ICOError> {
        let nft_data = self.nfts.get(&nft_id).ok_or(ICOError::NFTNotFound)?;
        let config = self.get_nft_config(&nft_data.nft_type).ok_or(ICOError::InvalidNFTType)?;
        
        let base_rate = config.daily_mining_rate;
        
        if nft_data.mining_bonus_bps == 0 {
            return Ok(base_rate);
        }
        
        // Aplicar bônus: rate * (10000 + bonus) / 10000
        let effective_rate = base_rate
            .saturating_mul(10000u128.saturating_add(nft_data.mining_bonus_bps as u128))
            .saturating_div(10000);
        
        Ok(effective_rate)
    }

    /// Retorna os atributos visuais de um NFT
    pub fn get_visual_attributes(&self, nft_id: u64) -> Result<NFTVisualAttributes, ICOError> {
        self.nft_visual_attributes.get(&nft_id).ok_or(ICOError::NFTNotFound)
    }

    /// Retorna estatísticas de evolução
    pub fn get_evolution_stats(&self) -> (u64, u64) {
        (self.evolution_manager.total_evolutions, self.evolution_manager.total_nfts_burned)
    }

    /// Retorna estatísticas de raridade
    pub fn get_rarity_stats(&self) -> (u64, u64, u64, u64, u64, u64) {
        let counts = &self.rarity_manager.rarity_counts;
        (
            counts.common,
            counts.uncommon,
            counts.rare,
            counts.epic,
            counts.legendary,
            self.rarity_manager.total_rolls,
        )
    }
}

/// Prova de pagamento para NFTs pagos
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct PaymentProof {
    /// Hash da transação Solana (88 chars base58)
    pub transaction_hash: String,
    /// Endereço Solana do pagador (44 chars base58)
    pub sender_address: String,
    /// Valor pago em USDT (6 decimais)
    pub amount_usdt: u64,
    /// Timestamp da transação
    pub timestamp: u64,
}

/// Status de verificação de pagamento
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum PaymentVerificationStatus {
    /// Pagamento não verificado
    NotVerified,
    /// Pagamento verificado e válido
    Verified,
    /// Pagamento inválido
    Invalid,
    /// Transação já usada
    AlreadyUsed,
}

/// Erros específicos do ICO
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ICOError {
    /// Saldo de LUNES insuficiente para mintar NFTs adicionais
    InsufficientLunesBalance,
    /// Limite máximo de NFTs gratuitos atingido
    MaxFreeNFTsReached,
    /// ICO não está ativo
    ICONotActive,
    /// Período de mineração já encerrado
    MiningPeriodEnded,
    /// NFT não encontrado
    NFTNotFound,
    /// NFT não pertence ao chamador
    NotNFTOwner,
    /// NFT está inativo
    NFTInactive,
    /// Saldo insuficiente para a operação
    InsufficientBalance,
    /// Tipo de NFT inválido
    InvalidNFTType,
    /// Supply máximo atingido
    MaxSupplyReached,
    /// Pagamento insuficiente
    InsufficientPayment,
    /// Mineração não ativa
    MiningNotActive,
    /// Período de vesting não terminou
    VestingNotEnded,
    /// Tokens insuficientes para staking
    InsufficientTokensForStaking,
    /// Posição de vesting não encontrada
    VestingPositionNotFound,
    /// Operação não autorizada
    Unauthorized,
    /// Pagamento não fornecido para NFT pago
    PaymentRequired,
    /// Prova de pagamento inválida
    InvalidPaymentProof,
    /// Transação de pagamento já utilizada
    PaymentAlreadyUsed,
    /// Valor de pagamento incorreto
    PaymentAmountMismatch,
    /// Hash de transação inválido
    InvalidTransactionHash,
    /// Sistema de evolução não está ativo
    EvolutionSystemNotActive,
    /// NFTs insuficientes para evolução (mínimo 2)
    EvolutionInsufficientNFTs,
    /// NFTs de tipos diferentes não podem evoluir juntos
    EvolutionTypeMismatch,
    /// Tier máximo atingido, não pode evoluir mais
    EvolutionMaxTierReached,
    /// Operação inválida
    InvalidOperation,
}

impl From<ICOError> for crate::don_fiapo::Error {
    fn from(error: ICOError) -> Self {
        match error {
            ICOError::InsufficientBalance => crate::don_fiapo::Error::InsufficientBalance,
            ICOError::Unauthorized => crate::don_fiapo::Error::Unauthorized,
            _ => crate::don_fiapo::Error::InvalidOperation,
        }
    }
}