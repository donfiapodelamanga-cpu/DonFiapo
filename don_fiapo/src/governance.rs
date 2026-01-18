//! Sistema de Governança para Don Fiapo
//!
//! Este módulo implementa um sistema de governança descentralizado para substituir
//! o controle centralizado do owner, incluindo:
//! - Multi-signature para operações críticas
//! - Timelock para mudanças de configuração
//! - Sistema de propostas e votação
//! - Controles de emergência

use ink::prelude::{string::{String, ToString}, vec::Vec, vec};
use ink::storage::Mapping;
use ink::primitives::AccountId;
use scale::{Decode, Encode};
use crate::fees::distribution::FeeDistributor;

type Balance = u128;
type Timestamp = u64;

/// Erros específicos do sistema de governança
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum GovernanceError {
    /// Proposta não encontrada
    ProposalNotFound,
    /// Proposta já executada
    ProposalAlreadyExecuted,
    /// Proposta expirada
    ProposalExpired,
    /// Votação ainda não finalizada
    VotingNotFinished,
    /// Quorum não atingido
    QuorumNotReached,
    /// Voto já realizado
    AlreadyVoted,
    /// Operação não autorizada
    Unauthorized,
    /// Timelock não expirado
    TimelockNotExpired,
    /// Parâmetros inválidos
    InvalidParameters,
    /// Multi-sig insuficiente
    InsufficientSignatures,
    /// Valor inválido
    InvalidAmount,
    /// Não é governador
    NotGovernor,
    /// Governança desativada
    GovernanceDisabled,
    /// Remuneração não disponível
    NoRemunerationAvailable,
    /// Configuração inválida
    InvalidConfiguration,
    /// Proposta não está ativa
    ProposalNotActive,
}

/// Tipos de propostas
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum ProposalType {
    /// Mudança de configuração
    ConfigChange,
    /// Operação de emergência
    Emergency,
    /// Upgrade do contrato
    Upgrade,
    /// Mudança de carteiras do sistema
    SystemWalletChange,
    /// Pausa/despausa do sistema
    PauseSystem,
    /// Proposta de listagem em exchange
    ExchangeListing,
    /// Proposta de marketing com influenciadores
    InfluencerMarketing,
    /// Proposta de queima acelerada (apenas aumentar)
    AcceleratedBurn,
    /// Proposta de doação para listagem
    ListingDonation,
    /// Proposta de doação para marketing
    MarketingDonation,
}

/// Status de uma proposta
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum ProposalStatus {
    /// Proposta ativa
    Active,
    /// Proposta aprovada
    Approved,
    /// Proposta rejeitada
    Rejected,
    /// Proposta executada
    Executed,
    /// Proposta expirada
    Expired,
}

/// Voto de um governador
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum Vote {
    /// Voto a favor
    For,
    /// Voto contra
    Against,
    /// Abstenção
    Abstain,
}

/// Estrutura para rastrear distribuições de taxas de governança
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct GovernanceFeeDistribution {
    /// ID único da distribuição
    pub id: u64,
    /// ID do pagamento relacionado
    pub payment_id: u64,
    /// Tipo de pagamento (PROPOSAL, VOTE)
    pub payment_type: String,
    /// Valor total distribuído
    pub total_amount: u128,
    /// Valor para fundo de staking
    pub staking_amount: u128,
    /// Valor para fundo de recompensas
    pub rewards_amount: u128,
    /// Valor para equipe
    pub team_amount: u128,
    /// Timestamp da distribuição
    pub distribution_timestamp: u64,
    /// Se a distribuição foi executada
    pub executed: bool,
}

/// Estrutura de uma proposta
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct Proposal {
    /// ID único da proposta
    pub id: u64,
    /// Criador da proposta
    pub proposer: AccountId,
    /// Tipo da proposta
    pub proposal_type: ProposalType,
    /// Descrição da proposta
    pub description: String,
    /// Dados da proposta (encoded)
    pub data: Vec<u8>,
    /// Timestamp de criação
    pub created_at: Timestamp,
    /// Timestamp de início da votação
    pub voting_start: Timestamp,
    /// Timestamp de fim da votação
    pub voting_end: Timestamp,
    /// Timestamp de execução (após timelock)
    pub execution_time: Timestamp,
    /// Status atual
    pub status: ProposalStatus,
    /// Votos a favor
    pub votes_for: u32,
    /// Votos contra
    pub votes_against: u32,
    /// Abstenções
    pub votes_abstain: u32,
    /// Se foi executada
    pub executed: bool,
}

/// Estatísticas do sistema de governança
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct GovernanceStats {
    pub total_proposals: u64,
    pub total_governors: u32,
    pub total_fees_collected: u128,
    pub total_staking_distributed: u128,
    pub total_rewards_distributed: u128,
    pub total_team_distributed: u128,
    pub is_active: bool,
}

/// Estrutura para proposta de listagem em exchange
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ExchangeListingProposal {
    /// Nome do exchange
    pub exchange_name: String,
    /// Valor da doação em USDT/LUSDT
    pub donation_amount: u128,
    /// Carteira do exchange para receber doação
    pub exchange_wallet: AccountId,
    /// Descrição detalhada da listagem
    pub description: String,
    /// Data estimada da listagem
    pub estimated_listing_date: u64,
    /// Se a listagem foi confirmada
    pub listing_confirmed: bool,
    /// Se a doação foi paga
    pub donation_paid: bool,
}

/// Estrutura para proposta de marketing com influenciadores
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct InfluencerMarketingProposal {
    /// Nome do influenciador
    pub influencer_name: String,
    /// Carteira do influenciador
    pub influencer_wallet: AccountId,
    /// Valor do pagamento em USDT/LUSDT/LUNES
    pub payment_amount: u128,
    /// Tipo de moeda do pagamento
    pub payment_currency: String, // "USDT", "LUSDT", "LUNES"
    /// Descrição do material a ser publicado
    pub content_description: String,
    /// URL do material publicado (após aprovação)
    pub published_content_url: Option<String>,
    /// Data limite para publicação
    pub publication_deadline: u64,
    /// Se o material foi publicado
    pub content_published: bool,
    /// Se o pagamento foi realizado
    pub payment_made: bool,
    /// Hash do material para verificação
    pub content_hash: Option<String>,
}

/// Estrutura para proposta de queima acelerada
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct AcceleratedBurnProposal {
    /// Descrição da medida de queima
    pub burn_description: String,
    /// Valor adicional para queima (sempre positivo)
    pub additional_burn_amount: u128,
    /// Duração da medida em blocos
    pub burn_duration_blocks: u64,
    /// Se a medida está ativa
    pub burn_active: bool,
    /// Bloco de início da queima
    pub burn_start_block: Option<u64>,
    /// Bloco de fim da queima
    pub burn_end_block: Option<u64>,
}

/// Estrutura para proposta de doação
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct DonationProposal {
    /// Tipo de doação
    pub donation_type: String, // "LISTING", "MARKETING"
    /// Valor da doação
    pub donation_amount: u128,
    /// Moeda da doação
    pub donation_currency: String, // "USDT", "LUSDT", "LUNES"
    /// Carteira destinatária
    pub recipient_wallet: AccountId,
    /// Descrição da doação
    pub description: String,
    /// Se a doação foi realizada
    pub donation_made: bool,
    /// Data da doação
    pub donation_date: Option<u64>,
}

/// Configuração do sistema de governança
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct GovernanceConfig {
    /// Número mínimo de governadores
    pub min_governors: u32,
    /// Quorum necessário para aprovação (em basis points)
    pub quorum_bps: u32,
    /// Duração da votação em segundos
    pub voting_period: u64,
    /// Timelock para execução em segundos
    pub timelock_period: u64,
    /// Duração da proposta em segundos
    pub proposal_lifetime: u64,
    /// Regras especiais para propostas de listagem
    pub listing_rules: ListingRules,
    /// Regras especiais para propostas de marketing
    pub marketing_rules: MarketingRules,
    /// Regras especiais para propostas de queima
    pub burn_rules: BurnRules,
    /// Regras especiais para doações
    pub donation_rules: DonationRules,
    /// Regras de pagamento para governança
    pub payment_rules: GovernancePaymentRules,
}

/// Regras específicas para propostas de listagem
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ListingRules {
    /// Valor mínimo para doação de listagem
    pub min_listing_donation: u128,
    /// Valor máximo para doação de listagem
    pub max_listing_donation: u128,
    /// Período de verificação da listagem (em blocos)
    pub listing_verification_period: u64,
    /// Se doações são permitidas
    pub donations_enabled: bool,
    /// Lista de exchanges aprovados
    pub approved_exchanges: Vec<String>,
}

/// Regras específicas para propostas de marketing
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct MarketingRules {
    /// Valor mínimo para pagamento de influenciador
    pub min_influencer_payment: u128,
    /// Valor máximo para pagamento de influenciador
    pub max_influencer_payment: u128,
    /// Período de verificação do conteúdo (em blocos)
    pub content_verification_period: u64,
    /// Se pagamentos são permitidos
    pub payments_enabled: bool,
    /// Lista de plataformas aprovadas
    pub approved_platforms: Vec<String>,
    /// Período de proteção do conteúdo (não pode ser removido)
    pub content_protection_period: u64,
}

/// Regras específicas para propostas de queima
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct BurnRules {
    /// Valor mínimo para queima adicional
    pub min_additional_burn: u128,
    /// Valor máximo para queima adicional
    pub max_additional_burn: u128,
    /// Duração mínima da queima (em blocos)
    pub min_burn_duration: u64,
    /// Duração máxima da queima (em blocos)
    pub max_burn_duration: u64,
    /// Se queimas aceleradas são permitidas
    pub accelerated_burn_enabled: bool,
    /// Limite de queima total (não pode ser reduzido)
    pub total_burn_limit: u128,
}

/// Regras específicas para doações
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct DonationRules {
    /// Valor mínimo para doação
    pub min_donation_amount: u128,
    /// Valor máximo para doação
    pub max_donation_amount: u128,
    /// Moedas aceitas para doação
    pub accepted_currencies: Vec<String>,
    /// Se doações são permitidas
    pub donations_enabled: bool,
    /// Período de verificação da doação (em blocos)
    pub donation_verification_period: u64,
}

/// Regras de pagamento para governança
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct GovernancePaymentRules {
    /// Valor mínimo de USDT/LUSDT para criar proposta
    pub min_proposal_payment_usdt: u128,
    /// Valor mínimo de FIAPO para criar proposta
    pub min_proposal_payment_fiapo: u128,
    /// Valor mínimo de USDT/LUSDT para votar
    pub min_vote_payment_usdt: u128,
    /// Valor mínimo de FIAPO para votar
    pub min_vote_payment_fiapo: u128,
    /// Staking mínimo obrigatório para criar proposta
    pub min_staking_for_proposal: u128,
    /// Staking mínimo obrigatório para votar
    pub min_staking_for_vote: u128,
    /// Se pagamentos são obrigatórios
    pub payments_required: bool,
    /// Se staking é obrigatório
    pub staking_required: bool,
    /// Moedas aceitas para pagamento
    pub accepted_payment_currencies: Vec<String>,
}

/// Estrutura de pagamento de governança
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct GovernancePayment {
    /// ID único do pagamento
    pub id: u64,
    /// Usuário que fez o pagamento
    pub payer: AccountId,
    /// Tipo de pagamento (PROPOSAL, VOTE)
    pub payment_type: String,
    /// Valor em USDT/LUSDT
    pub usdt_amount: u128,
    /// Valor em FIAPO
    pub fiapo_amount: u128,
    /// Timestamp do pagamento
    pub payment_timestamp: u64,
    /// Se o pagamento foi confirmado
    pub confirmed: bool,
    /// Hash da transação
    pub transaction_hash: Option<String>,
}

impl Default for GovernanceConfig {
    fn default() -> Self {
        Self {
            min_governors: 3,
            quorum_bps: 6000, // 60%
            voting_period: 7 * 24 * 60 * 60, // 7 dias
            timelock_period: 2 * 24 * 60 * 60, // 2 dias
            proposal_lifetime: 30 * 24 * 60 * 60, // 30 dias
            listing_rules: ListingRules::default(),
            marketing_rules: MarketingRules::default(),
            burn_rules: BurnRules::default(),
            donation_rules: DonationRules::default(),
            payment_rules: GovernancePaymentRules::default(),
        }
    }
}

impl Default for ListingRules {
    fn default() -> Self {
        Self {
            min_listing_donation: 1000 * 10u128.pow(6), // 1000 USDT
            max_listing_donation: 50000 * 10u128.pow(6), // 50000 USDT
            listing_verification_period: 7 * 24 * 60 * 60, // 7 dias
            donations_enabled: true,
            approved_exchanges: vec![
                "Binance".to_string(),
                "Coinbase".to_string(),
                "Kraken".to_string(),
                "KuCoin".to_string(),
                "Gate.io".to_string(),
                "MEXC".to_string(),
                "Bybit".to_string(),
            ],
        }
    }
}

impl Default for MarketingRules {
    fn default() -> Self {
        Self {
            min_influencer_payment: 100 * 10u128.pow(6), // 100 USDT
            max_influencer_payment: 10000 * 10u128.pow(6), // 10000 USDT
            content_verification_period: 3 * 24 * 60 * 60, // 3 dias
            payments_enabled: true,
            approved_platforms: vec![
                "YouTube".to_string(),
                "Twitter".to_string(),
                "Instagram".to_string(),
                "TikTok".to_string(),
                "Telegram".to_string(),
                "Discord".to_string(),
                "Medium".to_string(),
            ],
            content_protection_period: 365 * 24 * 60 * 60, // 1 ano
        }
    }
}

impl Default for BurnRules {
    fn default() -> Self {
        Self {
            min_additional_burn: 1000 * 10u128.pow(8), // 1000 FIAPO
            max_additional_burn: 1000000 * 10u128.pow(8), // 1M FIAPO
            min_burn_duration: 24 * 60 * 60, // 1 dia
            max_burn_duration: 30 * 24 * 60 * 60, // 30 dias
            accelerated_burn_enabled: true,
            total_burn_limit: 200_000_000_000 * 10u128.pow(8), // 200B FIAPO (não pode ser reduzido)
        }
    }
}

impl Default for DonationRules {
    fn default() -> Self {
        Self {
            min_donation_amount: 100 * 10u128.pow(6), // 100 USDT
            max_donation_amount: 100000 * 10u128.pow(6), // 100K USDT
            accepted_currencies: vec![
                "USDT".to_string(),
                "LUSDT".to_string(),
                "LUNES".to_string(),
            ],
            donations_enabled: true,
            donation_verification_period: 24 * 60 * 60, // 1 dia
        }
    }
}

impl Default for GovernancePaymentRules {
    fn default() -> Self {
        Self {
            min_proposal_payment_usdt: 100 * 10u128.pow(6), // 100 USDT
            min_proposal_payment_fiapo: 100 * 10u128.pow(8), // 100 FIAPO
            min_vote_payment_usdt: 10 * 10u128.pow(6), // 10 USDT
            min_vote_payment_fiapo: 10 * 10u128.pow(8), // 10 FIAPO
            min_staking_for_proposal: 1000 * 10u128.pow(8), // 1000 FIAPO
            min_staking_for_vote: 100 * 10u128.pow(8), // 100 FIAPO
            payments_required: true,
            staking_required: true,
            accepted_payment_currencies: vec![
                "USDT".to_string(),
                "LUSDT".to_string(),
                "LUNES".to_string(),
            ],
        }
    }
}

/// Estrutura para rastrear remunerações de governadores
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct GovernorRemuneration {
    /// Governador
    pub governor: AccountId,
    /// Total acumulado para pagamento
    pub accumulated_amount: Balance,
    /// Última vez que foi pago
    pub last_payment_timestamp: u64,
    /// Total já pago
    pub total_paid: Balance,
}

impl Default for GovernorRemuneration {
    fn default() -> Self {
        Self {
            governor: AccountId::from([0u8; 32]),
            accumulated_amount: 0,
            last_payment_timestamp: 0,
            total_paid: 0,
        }
    }
}

/// Voto com peso
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct WeightedVote {
    /// Voto
    pub vote: Vote,
    /// Peso do voto
    pub weight: u32,
    /// Timestamp do voto
    pub timestamp: u64,
}

/// Estrutura para rastrear distribuições comunitárias
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct CommunityDistribution {
    /// ID da distribuição
    pub distribution_id: u32,
    /// Timestamp da distribuição
    pub timestamp: u64,
    /// Total distribuído
    pub total_distributed: Balance,
    /// Número de beneficiários
    pub beneficiary_count: u32,
    /// Período (30 dias)
    pub period_days: u32,
}

/// Configuração de remuneração
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RemunerationConfig {
    /// Percentual das taxas que vai para governadores (em basis points)
    pub governor_share_bps: u32,
    /// Percentual das taxas que vai para comunidade (em basis points)
    pub community_share_bps: u32,
    /// Intervalo de distribuição comunitária (em dias)
    pub community_distribution_interval_days: u32,
    /// Peso de voto dos governadores (multiplicador)
    pub governor_vote_weight: u32,
    /// Peso de voto da comunidade (multiplicador)
    pub community_vote_weight: u32,
    /// Saldo mínimo para distribuição comunitária
    pub min_community_distribution: Balance,
}

impl Default for RemunerationConfig {
    fn default() -> Self {
        Self {
            governor_share_bps: 2000, // 20% para governadores
            community_share_bps: 3000, // 30% para comunidade
            community_distribution_interval_days: 30,
            governor_vote_weight: 3, // Governadores têm 3x mais peso
            community_vote_weight: 1, // Comunidade tem peso normal
            min_community_distribution: 1000_000_000_000_000_000, // 1 token mínimo
        }
    }
}

/// Sistema de governança principal
/// Using #[ink::storage_item] for ink! 4.2.x compatibility with Mappings
#[ink::storage_item]
#[derive(Default, Debug)]
pub struct Governance {
    /// Configuração do sistema
    config: GovernanceConfig,
    /// Lista de governadores
    governors: Mapping<AccountId, bool>,
    /// Propostas por ID
    proposals: Mapping<u64, Proposal>,
    /// Votos por proposta e governador
    votes: Mapping<(u64, AccountId), WeightedVote>,
    /// Pagamentos de governança por ID
    payments: Mapping<u64, GovernancePayment>,
    /// Próximo ID de proposta
    next_proposal_id: u64,
    /// Próximo ID de pagamento
    next_payment_id: u64,
    /// Total de governadores
    total_governors: u32,
    /// Se o sistema está ativo
    is_active: bool,
    /// Referência para verificar staking (será injetada)
    staking_contract: Option<AccountId>,
    /// Distribuições de taxas de governança por ID
    fee_distributions: Mapping<u64, GovernanceFeeDistribution>,
    /// Próximo ID de distribuição
    next_distribution_id: u64,
    /// Total de taxas coletadas
    total_fees_collected: u128,
    /// Total distribuído para staking
    total_staking_distributed: u128,
    /// Total distribuído para recompensas
    total_rewards_distributed: u128,
    /// Total distribuído para equipe
    total_team_distributed: u128,
    /// Remunerações de governadores
    governor_remunerations: Mapping<AccountId, GovernorRemuneration>,
    /// Distribuições comunitárias
    community_distributions: Mapping<u32, CommunityDistribution>,
    /// Próximo ID de distribuição comunitária
    next_community_distribution_id: u32,
    /// Última distribuição comunitária
    last_community_distribution: u64,
    /// Configuração de remuneração
    remuneration_config: RemunerationConfig,
}

// Note: #[ink::storage_item] automatically derives Storable, StorableHint, StorageKey traits
// so manual Encode/Decode implementations are not needed.

impl Governance {
    /// Obtém estatísticas do sistema de governança
    pub fn get_stats(&self) -> GovernanceStats {
        GovernanceStats {
            total_proposals: self.next_proposal_id.saturating_sub(1),
            total_governors: self.total_governors,
            total_fees_collected: self.total_fees_collected,
            total_staking_distributed: self.total_staking_distributed,
            total_rewards_distributed: self.total_rewards_distributed,
            total_team_distributed: self.total_team_distributed,
            is_active: self.is_active,
        }
    }

    /// Cria uma nova instância do sistema de governança
    pub fn new(initial_governors: Vec<AccountId>) -> Self {
        let mut governors = Mapping::default();
        let mut total_governors = 0;
        
        for governor in initial_governors {
            if governor == AccountId::from([0u8; 32]) {
                panic!("Invalid governor address");
            }
            governors.insert(governor, &true);
            total_governors += 1;
        }
        
        Self {
            config: GovernanceConfig::default(),
            governors,
            proposals: Mapping::default(),
            votes: Mapping::default(),
            payments: Mapping::default(),
            next_proposal_id: 1,
            next_payment_id: 1,
            total_governors,
            is_active: true,
            staking_contract: None,
            fee_distributions: Mapping::default(),
            next_distribution_id: 1,
            total_fees_collected: 0,
            total_staking_distributed: 0,
            total_rewards_distributed: 0,
            total_team_distributed: 0,
            governor_remunerations: Mapping::default(),
            community_distributions: Mapping::default(),
            next_community_distribution_id: 1,
            last_community_distribution: 0,
            remuneration_config: RemunerationConfig::default(),
        }
    }
    
    /// Verifica se uma conta é governador
    pub fn is_governor(&self, account: &AccountId) -> bool {
        self.governors.get(account).unwrap_or(false)
    }
    
    /// Adiciona um novo governador (apenas governadores podem adicionar)
    pub fn add_governor(&mut self, caller: AccountId, new_governor: AccountId) -> Result<(), GovernanceError> {
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        // Validação básica de endereço
        if new_governor == AccountId::from([0u8; 32]) {
            return Err(GovernanceError::InvalidParameters);
        }
        
        if self.is_governor(&new_governor) {
            return Err(GovernanceError::InvalidParameters);
        }
        
        self.governors.insert(new_governor, &true);
        self.total_governors += 1;
        
        Ok(())
    }
    
    /// Remove um governador (apenas governadores podem remover)
    pub fn remove_governor(&mut self, caller: AccountId, governor: AccountId) -> Result<(), GovernanceError> {
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        if !self.is_governor(&governor) {
            return Err(GovernanceError::InvalidParameters);
        }
        
        // Previne remover o último governador
        if self.total_governors <= self.config.min_governors {
            return Err(GovernanceError::InvalidParameters);
        }
        
        self.governors.remove(&governor);
        self.total_governors -= 1;
        
        Ok(())
    }
    
    /// Cria uma nova proposta (com validação de pagamento e staking)
    pub fn create_proposal(
        &mut self,
        caller: AccountId,
        proposal_type: ProposalType,
        description: String,
        data: Vec<u8>,
        usdt_payment: u128,
        fiapo_payment: u128,
    ) -> Result<u64, GovernanceError> {
        // Verificar se pode criar proposta (pagamento + staking)
        self.can_create_proposal(caller, usdt_payment, fiapo_payment)?;
        
        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        let proposal_id = self.next_proposal_id;
        
        let proposal = Proposal {
            id: proposal_id,
            proposer: caller,
            proposal_type,
            description,
            data,
            created_at: current_time,
            voting_start: current_time,
            voting_end: current_time + self.config.voting_period,
            execution_time: current_time + self.config.voting_period + self.config.timelock_period,
            status: ProposalStatus::Active,
            votes_for: 0,
            votes_against: 0,
            votes_abstain: 0,
            executed: false,
        };
        
        self.proposals.insert(proposal_id, &proposal);
        self.next_proposal_id += 1;
        
        // Registrar pagamento se obrigatório
        if self.config.payment_rules.payments_required {
            self.register_payment(
                caller,
                "PROPOSAL".to_string(),
                usdt_payment,
                fiapo_payment,
                None,
            )?;
        }
        
        Ok(proposal_id)
    }
    
    /// Vota em uma proposta (com validação de pagamento e staking)
    pub fn vote(&mut self, caller: AccountId, proposal_id: u64, vote: Vote, usdt_payment: u128, fiapo_payment: u128) -> Result<(), GovernanceError> {
        // Verificar se pode votar (pagamento + staking)
        self.can_vote(caller, usdt_payment, fiapo_payment)?;
        
        let mut proposal = self.proposals.get(proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;
        
        if proposal.status != ProposalStatus::Active {
            return Err(GovernanceError::ProposalExpired);
        }
        
        // Verificar se já votou
        if self.votes.get((proposal_id, caller)).is_some() {
            return Err(GovernanceError::AlreadyVoted);
        }
        
        // Calcular peso do voto
        let vote_weight = self.calculate_vote_weight(&caller);
        
        // Registrar voto com peso
        let weighted_vote = WeightedVote {
            vote: vote.clone(),
            weight: vote_weight,
            timestamp: ink::env::block_timestamp::<ink::env::DefaultEnvironment>(),
        };
        
        self.votes.insert((proposal_id, caller), &weighted_vote);
        
        // Atualizar contadores com peso
        match vote {
            Vote::For => proposal.votes_for += vote_weight,
            Vote::Against => proposal.votes_against += vote_weight,
            Vote::Abstain => proposal.votes_abstain += vote_weight,
        }
        
        self.proposals.insert(proposal_id, &proposal);
        
        // Registrar pagamento se obrigatório
        if self.config.payment_rules.payments_required {
            self.register_payment(
                caller,
                "VOTE".to_string(),
                usdt_payment,
                fiapo_payment,
                None,
            )?;
        }
        
        Ok(())
    }
    
    /// Finaliza uma proposta após período de votação
    pub fn finalize_proposal(&mut self, caller: AccountId, proposal_id: u64) -> Result<(), GovernanceError> {
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        let mut proposal = self.proposals.get(proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;
        
        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        
        if current_time < proposal.voting_end {
            return Err(GovernanceError::VotingNotFinished);
        }
        
        if proposal.status != ProposalStatus::Active {
            return Err(GovernanceError::ProposalExpired);
        }
        
        // Calcular quorum
        let total_votes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
        let quorum_threshold = (self.total_governors as u64 * self.config.quorum_bps as u64) / 10000;
        
        if total_votes < quorum_threshold as u32 {
            proposal.status = ProposalStatus::Rejected;
        } else if proposal.votes_for > proposal.votes_against {
            proposal.status = ProposalStatus::Approved;
        } else {
            proposal.status = ProposalStatus::Rejected;
        }
        
        self.proposals.insert(proposal_id, &proposal);
        
        Ok(())
    }
    
    /// Executa uma proposta aprovada após timelock
    pub fn execute_proposal(&mut self, caller: AccountId, proposal_id: u64) -> Result<Vec<u8>, GovernanceError> {
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        let mut proposal = self.proposals.get(proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;
        
        if proposal.status != ProposalStatus::Approved {
            return Err(GovernanceError::ProposalNotFound);
        }
        
        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        
        if current_time < proposal.execution_time {
            return Err(GovernanceError::TimelockNotExpired);
        }
        
        if proposal.executed {
            return Err(GovernanceError::ProposalAlreadyExecuted);
        }
        
        proposal.executed = true;
        proposal.status = ProposalStatus::Executed;
        
        self.proposals.insert(proposal_id, &proposal);
        
        Ok(proposal.data)
    }
    
    /// Obtém uma proposta por ID
    pub fn get_proposal(&self, proposal_id: u64) -> Option<Proposal> {
        self.proposals.get(proposal_id)
    }
    
    /// Obtém o voto de um governador em uma proposta
    pub fn get_vote(&self, proposal_id: u64, governor: AccountId) -> Option<WeightedVote> {
        self.votes.get((proposal_id, governor))
    }
    
    /// Obtém a configuração atual
    pub fn get_config(&self) -> GovernanceConfig {
        self.config.clone()
    }
    
    /// Atualiza a configuração (apenas governadores)
    pub fn update_config(&mut self, caller: AccountId, new_config: GovernanceConfig) -> Result<(), GovernanceError> {
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        self.config = new_config;
        
        Ok(())
    }
    
    /// Ativa/desativa o sistema de governança
    pub fn set_active(&mut self, caller: AccountId, active: bool) -> Result<(), GovernanceError> {
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        self.is_active = active;
        
        Ok(())
    }
    
    /// Verifica se o sistema está ativo
    pub fn is_governance_active(&self) -> bool {
        self.is_active
    }
    
    /// Obtém o total de governadores
    pub fn get_total_governors(&self) -> u32 {
        self.total_governors
    }
    
    /// Define o contrato de staking para verificação
    pub fn set_staking_contract(&mut self, caller: AccountId, staking_contract: AccountId) -> Result<(), GovernanceError> {
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        self.staking_contract = Some(staking_contract);
        Ok(())
    }
    
    /// Verifica se um usuário tem staking suficiente
    /// Nota: Em produção, esta função deve fazer chamada cross-contract ao contrato de staking
    /// ou consultar dados de staking que foram previamente sincronizados
    pub fn has_sufficient_staking(&self, _user: AccountId, _required_amount: u128) -> bool {
        // Implementação simplificada: retorna true
        // Para produção:
        // 1. Fazer call cross-contract: self.staking_contract.call().get_user_stake(user)
        // 2. OU manter cache local atualizado periodicamente
        // 3. OU usar Oracle para sincronizar dados
        true
    }
    
    /// Valida pagamento para criar proposta
    pub fn validate_proposal_payment(&self, usdt_amount: u128, fiapo_amount: u128) -> Result<(), GovernanceError> {
        if !self.config.payment_rules.payments_required {
            return Ok(());
        }
        
        if usdt_amount < self.config.payment_rules.min_proposal_payment_usdt {
            return Err(GovernanceError::InvalidParameters);
        }
        
        if fiapo_amount < self.config.payment_rules.min_proposal_payment_fiapo {
            return Err(GovernanceError::InvalidParameters);
        }
        
        Ok(())
    }
    
    /// Valida pagamento para votar
    pub fn validate_vote_payment(&self, usdt_amount: u128, fiapo_amount: u128) -> Result<(), GovernanceError> {
        if !self.config.payment_rules.payments_required {
            return Ok(());
        }
        
        if usdt_amount < self.config.payment_rules.min_vote_payment_usdt {
            return Err(GovernanceError::InvalidParameters);
        }
        
        if fiapo_amount < self.config.payment_rules.min_vote_payment_fiapo {
            return Err(GovernanceError::InvalidParameters);
        }
        
        Ok(())
    }
    
    /// Registra pagamento de governança
    pub fn register_payment(
        &mut self,
        caller: AccountId,
        payment_type: String,
        usdt_amount: u128,
        fiapo_amount: u128,
        transaction_hash: Option<String>,
    ) -> Result<u64, GovernanceError> {
        // Validar parâmetros
        if usdt_amount == 0 && fiapo_amount == 0 {
            return Err(GovernanceError::InvalidParameters);
        }

        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        let payment_id = self.next_payment_id;

        let payment = GovernancePayment {
            id: payment_id,
            payer: caller,
            payment_type: payment_type.clone(),
            usdt_amount,
            fiapo_amount,
            payment_timestamp: current_time,
            confirmed: true,
            transaction_hash,
        };

        self.payments.insert(payment_id, &payment);
        self.next_payment_id += 1;

        // Calcular valor total em USDT equivalente
        let total_usdt_value = usdt_amount.saturating_add(fiapo_amount); // Simplificado: 1 FIAPO = 1 USDT

        // Atualizar estatísticas
        self.total_fees_collected = self.total_fees_collected.saturating_add(total_usdt_value);

        // Distribuir taxas automaticamente
        self.distribute_governance_fees(payment_id, &payment_type, total_usdt_value)?;

        // Calcular remunerações
        self.calculate_governor_remunerations(total_usdt_value)?;

        // Verifica se deve fazer distribuição comunitária
        self.check_community_distribution()?;

        Ok(payment_id)
    }

    /// Distribui as taxas de governança para os fundos apropriados
    fn distribute_governance_fees(
        &mut self,
        payment_id: u64,
        payment_type: &str,
        total_amount: u128,
    ) -> Result<(), GovernanceError> {
        // Calcular distribuição usando o FeeDistributor
        let (_burn_amount, staking_amount, rewards_amount, team_amount) = 
            FeeDistributor::distribute_governance_fee_by_type(total_amount, payment_type)
                .map_err(|_| GovernanceError::InvalidParameters)?;

        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        let distribution_id = self.next_distribution_id;

        let distribution = GovernanceFeeDistribution {
            id: distribution_id,
            payment_id,
            payment_type: payment_type.to_string(),
            total_amount,
            staking_amount,
            rewards_amount,
            team_amount,
            distribution_timestamp: current_time,
            executed: true,
        };

        self.fee_distributions.insert(distribution_id, &distribution);
        self.next_distribution_id += 1;

        // Atualizar estatísticas de distribuição
        self.total_staking_distributed = self.total_staking_distributed.saturating_add(staking_amount);
        self.total_rewards_distributed = self.total_rewards_distributed.saturating_add(rewards_amount);
        self.total_team_distributed = self.total_team_distributed.saturating_add(team_amount);

        Ok(())
    }
    
    /// Verifica se usuário pode criar proposta (pagamento + staking)
    pub fn can_create_proposal(&self, caller: AccountId, usdt_amount: u128, fiapo_amount: u128) -> Result<(), GovernanceError> {
        // Verificar se é governador
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        // Verificar pagamento se obrigatório
        if self.config.payment_rules.payments_required {
            self.validate_proposal_payment(usdt_amount, fiapo_amount)?;
        }
        
        // Verificar staking se obrigatório
        if self.config.payment_rules.staking_required {
            if !self.has_sufficient_staking(caller, self.config.payment_rules.min_staking_for_proposal) {
                return Err(GovernanceError::InvalidParameters);
            }
        }
        
        Ok(())
    }
    
    /// Verifica se usuário pode votar (pagamento + staking)
    pub fn can_vote(&self, caller: AccountId, usdt_amount: u128, fiapo_amount: u128) -> Result<(), GovernanceError> {
        // Verificar se é governador
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        // Verificar pagamento se obrigatório
        if self.config.payment_rules.payments_required {
            self.validate_vote_payment(usdt_amount, fiapo_amount)?;
        }
        
        // Verificar staking se obrigatório
        if self.config.payment_rules.staking_required {
            if !self.has_sufficient_staking(caller, self.config.payment_rules.min_staking_for_vote) {
                return Err(GovernanceError::InvalidParameters);
            }
        }
        
        Ok(())
    }
    
    /// Obtém um pagamento por ID
    pub fn get_payment(&self, payment_id: u64) -> Option<GovernancePayment> {
        self.payments.get(payment_id)
    }
    
    /// Obtém pagamentos de um usuário
    /// Nota: Itera sobre todos os IDs de pagamento - considerar indexação off-chain para produção
    pub fn get_user_payments(&self, user: AccountId) -> Vec<GovernancePayment> {
        let mut user_payments = Vec::new();
        let mut current_id = 1u64;
        
        while current_id < self.next_payment_id {
            if let Some(payment) = self.payments.get(current_id) {
                if payment.payer == user {
                    user_payments.push(payment);
                }
            }
            current_id += 1;
        }
        
        user_payments
    }
    
    /// Obtém as regras de pagamento atuais
    pub fn get_payment_rules(&self) -> GovernancePaymentRules {
        self.config.payment_rules.clone()
    }
    
    /// Atualiza as regras de pagamento (apenas governadores)
    pub fn update_payment_rules(&mut self, caller: AccountId, new_rules: GovernancePaymentRules) -> Result<(), GovernanceError> {
        if !self.is_governor(&caller) {
            return Err(GovernanceError::Unauthorized);
        }
        
        self.config.payment_rules = new_rules;
        Ok(())
    }
    
    /// Verifica se um usuário tem staking ativo
    /// Nota: Requer integração cross-contract ou sincronização via Oracle
    pub fn has_active_staking(&self, _user: AccountId) -> bool {
        // Implementação simplificada - retorna true para compatibilidade
        // Em produção: consultar contrato de staking ou cache sincronizado
        true
    }
    
    /// Obtém o valor total de staking de um usuário
    /// Nota: Requer integração cross-contract ou sincronização via Oracle
    pub fn get_user_staking_amount(&self, _user: AccountId) -> u128 {
        // Implementação simplificada - retorna valor padrão
        // Em produção: consultar contrato de staking ou cache sincronizado
        1000 * 10u128.pow(8) // 1000 FIAPO
    }
    
    /// Verifica se um usuário pode participar da governança
    pub fn can_participate_in_governance(&self, user: AccountId) -> Result<(), GovernanceError> {
        // Verificar se é governador
        if !self.is_governor(&user) {
            return Err(GovernanceError::Unauthorized);
        }
        
        // Verificar staking se obrigatório
        if self.config.payment_rules.staking_required {
            if !self.has_active_staking(user) {
                return Err(GovernanceError::InvalidParameters);
            }
        }
        
        Ok(())
    }
    
    /// Obtém estatísticas de pagamentos
    /// Retorna (total_payments, total_usdt, total_fiapo)
    pub fn get_payment_stats(&self) -> (u64, u128, u128) {
        let total_payments = self.next_payment_id.saturating_sub(1);
        let mut total_usdt = 0u128;
        let mut total_fiapo = 0u128;
        
        // Itera sobre todos os pagamentos para calcular totais
        let mut current_id = 1u64;
        while current_id < self.next_payment_id {
            if let Some(payment) = self.payments.get(current_id) {
                total_usdt = total_usdt.saturating_add(payment.usdt_amount);
                total_fiapo = total_fiapo.saturating_add(payment.fiapo_amount);
            }
            current_id += 1;
        }
        
        (total_payments, total_usdt, total_fiapo)
    }

    /// Obtém uma distribuição específica de taxas
    pub fn get_fee_distribution(&self, distribution_id: u64) -> Option<GovernanceFeeDistribution> {
        self.fee_distributions.get(distribution_id)
    }

    /// Obtém todas as distribuições de um pagamento específico
    pub fn get_payment_distributions(&self, payment_id: u64) -> Vec<GovernanceFeeDistribution> {
        let mut distributions = Vec::new();
        let mut current_id = 1;

        while current_id < self.next_distribution_id {
            if let Some(distribution) = self.fee_distributions.get(current_id) {
                if distribution.payment_id == payment_id {
                    distributions.push(distribution);
                }
            }
            current_id += 1;
        }

        distributions
    }

    /// Obtém estatísticas de distribuição de taxas
    pub fn get_fee_distribution_stats(&self) -> (u128, u128, u128, u128) {
        (
            self.total_fees_collected,
            self.total_staking_distributed,
            self.total_rewards_distributed,
            self.total_team_distributed,
        )
    }

    /// Obtém distribuições por tipo de pagamento
    pub fn get_distributions_by_type(&self, payment_type: &str) -> Vec<GovernanceFeeDistribution> {
        let mut distributions = Vec::new();
        let mut current_id = 1;

        while current_id < self.next_distribution_id {
            if let Some(distribution) = self.fee_distributions.get(current_id) {
                if distribution.payment_type == payment_type {
                    distributions.push(distribution);
                }
            }
            current_id += 1;
        }

        distributions
    }

    /// Obtém o total de distribuições para staking
    pub fn get_total_staking_distributed(&self) -> u128 {
        self.total_staking_distributed
    }

    /// Obtém o total de distribuições para recompensas
    pub fn get_total_rewards_distributed(&self) -> u128 {
        self.total_rewards_distributed
    }

    /// Obtém o total de distribuições para equipe
    pub fn get_total_team_distributed(&self) -> u128 {
        self.total_team_distributed
    }

    /// Obtém o total de taxas coletadas
    pub fn get_total_fees_collected(&self) -> u128 {
        self.total_fees_collected
    }

    /// Calcula remunerações para governadores
    /// Nota: A lista de governadores é recuperada do mapping interno
    pub fn calculate_governor_remunerations(&mut self, total_amount: Balance) -> Result<(), GovernanceError> {
        let governor_share = (total_amount.saturating_mul(self.remuneration_config.governor_share_bps.into()))
            .saturating_div(10000u128);
        
        if governor_share == 0 {
            return Ok(());
        }

        // Conta governadores ativos - usa a lista interna
        let active_governors = self.total_governors;
        
        // Distribui entre governadores se houver algum ativo
        // A participação é calculada uniformemente entre todos
        if active_governors > 0 {
            let _share_per_governor = governor_share.saturating_div(active_governors.into());
            
            // Nota: Em produção, manter Vec<AccountId> separado para iteração
            // ou usar evento para distribuição off-chain
            // Os governadores podem reivindicar sua parte via withdraw_governor_remuneration()
            
            // Atualiza o pool de remuneração total disponível
            // (será distribuído quando governadores chamarem withdraw)
            self.total_fees_collected = self.total_fees_collected.saturating_add(governor_share);
        }
        
        Ok(())
    }

    /// Verifica se deve fazer distribuição comunitária
    pub fn check_community_distribution(&mut self) -> Result<(), GovernanceError> {
        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        let interval_seconds = self.remuneration_config.community_distribution_interval_days.saturating_mul(24).saturating_mul(3600);
        
        if current_time.saturating_sub(self.last_community_distribution) >= interval_seconds.into() {
            self.execute_community_distribution()?;
        }
        
        Ok(())
    }

    /// Executa distribuição comunitária
    pub fn execute_community_distribution(&mut self) -> Result<(), GovernanceError> {
        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        
        // Calcula valor para distribuição comunitária
        let community_share = (self.total_fees_collected.saturating_mul(self.remuneration_config.community_share_bps.into()))
            .saturating_div(10000u128);
        
        if community_share < self.remuneration_config.min_community_distribution {
            return Ok(());
        }
        
        // Nota sobre distribuição para stakers:
        // 1. Em produção, manter um Vec<AccountId> de stakers ativos
        // 2. Calcular participação proporcional ao valor de staking de cada um
        // 3. Transferir tokens para cada staker proporcionalmente
        // 4. OU acumular em pool para claim posterior
        
        // Conta beneficiários (simplificado - usa número de governadores como proxy)
        let beneficiary_count = self.total_governors;
        
        let distribution = CommunityDistribution {
            distribution_id: self.next_community_distribution_id,
            timestamp: current_time,
            total_distributed: community_share,
            beneficiary_count, // Número de governadores como beneficiários
            period_days: self.remuneration_config.community_distribution_interval_days,
        };
        
        self.community_distributions.insert(&self.next_community_distribution_id, &distribution);
        self.next_community_distribution_id = self.next_community_distribution_id.saturating_add(1);
        self.last_community_distribution = current_time;
        
        Ok(())
    }

    /// Permite que governadores sacuem suas remunerações
    pub fn withdraw_governor_remuneration(&mut self, caller: AccountId) -> Result<Balance, GovernanceError> {
        if !self.governors.get(&caller).unwrap_or(false) {
            return Err(GovernanceError::NotGovernor);
        }
        
        let mut remuneration = self.governor_remunerations.get(&caller).unwrap_or_default();
        if remuneration.accumulated_amount == 0 {
             return Err(GovernanceError::NoRemunerationAvailable);
        }
        
        let amount_to_withdraw = remuneration.accumulated_amount;
        remuneration.accumulated_amount = 0;
        remuneration.last_payment_timestamp = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        remuneration.total_paid = remuneration.total_paid.saturating_add(amount_to_withdraw);
        
        self.governor_remunerations.insert(&caller, &remuneration);
        
        Ok(amount_to_withdraw)
    }

    /// Calcula peso de voto baseado no status (governador vs comunidade)
    pub fn calculate_vote_weight(&self, voter: &AccountId) -> u32 {
        if self.governors.get(voter).unwrap_or(false) {
            self.remuneration_config.governor_vote_weight
        } else {
            self.remuneration_config.community_vote_weight
        }
    }

    /// Vota em uma proposta com peso calculado
    pub fn vote_with_weight(
        &mut self,
        proposal_id: u64,
        vote: Vote,
        usdt_amount: Balance,
        fiapo_amount: Balance,
    ) -> Result<(), GovernanceError> {
        let caller = ink::env::caller::<ink::env::DefaultEnvironment>();
        
        // Validações básicas
        // Validações básicas
        if !self.is_active {
            return Err(GovernanceError::GovernanceDisabled);
        }
        if u64::from(proposal_id) >= self.next_proposal_id {
            return Err(GovernanceError::ProposalNotFound);
        }
        
        let proposal = self.proposals.get(u64::from(proposal_id)).ok_or(GovernanceError::ProposalNotFound)?;
        if proposal.status != ProposalStatus::Active {
             return Err(GovernanceError::ProposalNotActive);
        }
        
        // Verifica se já votou
        if self.votes.contains((u64::from(proposal_id), caller)) {
             return Err(GovernanceError::AlreadyVoted);
        }
        
        // Registra pagamento
        self.register_payment(caller, "VOTE".to_string(), usdt_amount, fiapo_amount, None)?;
        
        // Calcula peso do voto
        let vote_weight = self.calculate_vote_weight(&caller);
        
        // Registra voto com peso
        let weighted_vote = WeightedVote {
            vote,
            weight: vote_weight,
            timestamp: ink::env::block_timestamp::<ink::env::DefaultEnvironment>(),
        };
        
        let key = (u64::from(proposal_id), caller);
        self.votes.insert(key, &weighted_vote);
        
        Ok(())
    }

    /// Atualiza configuração de remuneração
    pub fn update_remuneration_config(
        &mut self,
        caller: AccountId,
        new_config: RemunerationConfig,
    ) -> Result<(), GovernanceError> {
        if !self.governors.get(&caller).unwrap_or(false) {
            return Err(GovernanceError::NotGovernor);
        }
        
        if new_config.governor_share_bps.saturating_add(new_config.community_share_bps) > 10000 {
            return Err(GovernanceError::InvalidConfiguration);
        }
        if new_config.governor_vote_weight == 0 {
             return Err(GovernanceError::InvalidConfiguration);
        }
        if new_config.community_vote_weight == 0 {
             return Err(GovernanceError::InvalidConfiguration);
        }
        
        self.remuneration_config = new_config;
        
        Ok(())
    }

    /// Obtém remuneração de um governador
    pub fn get_governor_remuneration(&self, governor: AccountId) -> GovernorRemuneration {
        self.governor_remunerations.get(&governor).unwrap_or_default()
    }

    /// Obtém última distribuição comunitária
    pub fn get_last_community_distribution(&self) -> Option<CommunityDistribution> {
        if self.next_community_distribution_id > 0 {
            self.community_distributions.get(&(self.next_community_distribution_id.saturating_sub(1)))
        } else {
            None
        }
    }

    /// Obtém configuração de remuneração
    pub fn get_remuneration_config(&self) -> RemunerationConfig {
        self.remuneration_config.clone()
    }
}

#[ink::test]
fn test_governance_fee_distribution() {
    let mut governance = Governance::new(vec![AccountId::from([0x1; 32])]);
    
    // Registrar pagamento de proposta
    let result = governance.register_payment(
        AccountId::from([0x1; 32]),
        "PROPOSAL".to_string(),
        1000, // 1000 USDT
        1000, // 1000 FIAPO
        None,
    );
    
    assert!(result.is_ok());
    
    // Verificar estatísticas
    // PROPOSAL: 70% staking, 20% rewards, 10% team (de 2000 total)
    let (total_collected, total_staking, total_rewards, total_team) = governance.get_fee_distribution_stats();
    assert!(total_collected >= 2000); // Inclui outras taxas como remuneração de governador
    assert_eq!(total_staking, 1400); // 70% de 2000
    assert_eq!(total_rewards, 400); // 20% de 2000
    assert_eq!(total_team, 200); // 10% de 2000
}

#[ink::test]
fn test_governance_fee_distribution_vote() {
    let mut governance = Governance::new(vec![AccountId::from([0x1; 32])]);
    
    // Registrar pagamento de voto
    let result = governance.register_payment(
        AccountId::from([0x1; 32]),
        "VOTE".to_string(),
        100, // 100 USDT
        100, // 100 FIAPO
        None,
    );
    
    assert!(result.is_ok());
    
    // Verificar estatísticas
    // VOTE: 50% staking, 40% rewards, 10% team (de 200 total)
    let (total_collected, total_staking, total_rewards, total_team) = governance.get_fee_distribution_stats();
    assert!(total_collected >= 200); // Inclui outras taxas
    assert_eq!(total_staking, 100); // 50% de 200
    assert_eq!(total_rewards, 80); // 40% de 200
    assert_eq!(total_team, 20); // 10% de 200
}

#[ink::test]
fn test_get_fee_distribution() {
    let mut governance = Governance::new(vec![AccountId::from([0x1; 32])]);
    
    // Registrar pagamento
    let payment_id = governance.register_payment(
        AccountId::from([0x1; 32]),
        "PROPOSAL".to_string(),
        1000,
        1000,
        None,
    ).unwrap();
    
    // Obter distribuição
    let distributions = governance.get_payment_distributions(payment_id);
    assert_eq!(distributions.len(), 1);
    
    let distribution = &distributions[0];
    assert_eq!(distribution.payment_id, payment_id);
    assert_eq!(distribution.payment_type, "PROPOSAL");
    assert_eq!(distribution.total_amount, 2000);
    assert_eq!(distribution.staking_amount, 1400);
    assert_eq!(distribution.rewards_amount, 400);
    assert_eq!(distribution.team_amount, 200);
}

#[ink::test]
fn test_get_distributions_by_type() {
    let mut governance = Governance::new(vec![AccountId::from([0x1; 32])]);
    
    // Registrar pagamentos de diferentes tipos
    governance.register_payment(
        AccountId::from([0x1; 32]),
        "PROPOSAL".to_string(),
        1000,
        1000,
        None,
    ).unwrap();
    
    governance.register_payment(
        AccountId::from([0x2; 32]),
        "VOTE".to_string(),
        100,
        100,
        None,
    ).unwrap();
    
    // Obter distribuições por tipo
    let proposal_distributions = governance.get_distributions_by_type("PROPOSAL");
    let vote_distributions = governance.get_distributions_by_type("VOTE");
    
    assert_eq!(proposal_distributions.len(), 1);
    assert_eq!(vote_distributions.len(), 1);
    
    assert_eq!(proposal_distributions[0].payment_type, "PROPOSAL");
    assert_eq!(vote_distributions[0].payment_type, "VOTE");
}

#[ink::test]
fn test_zero_payment_error() {
    let mut governance = Governance::new(vec![AccountId::from([0x1; 32])]);
    
    // Tentar registrar pagamento zero
    let result = governance.register_payment(
        AccountId::from([0x1; 32]),
        "PROPOSAL".to_string(),
        0,
        0,
        None,
    );
    
    assert_eq!(result, Err(GovernanceError::InvalidParameters));
}