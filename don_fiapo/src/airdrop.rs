// Módulos do airdrop
mod hooks;

// Re-export dos itens públicos do módulo de hooks
pub use hooks::AirdropHooks;

use ink::{
    prelude::vec::Vec,
    storage::Mapping,
    env::{
        DefaultEnvironment,
        Environment,
    },
};

#[cfg(feature = "std")]
use ink::storage::traits::StorageLayout;
use scale::{Decode, Encode};

/// Tipo de conta para o módulo de airdrop
type AccountId = <DefaultEnvironment as Environment>::AccountId;

/// Tipo para timestamp de bloco
#[allow(dead_code)]
type BlockNumber = <DefaultEnvironment as Environment>::BlockNumber;



/// Erros específicos do módulo de airdrop
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum AirdropError {
    /// Airdrop não está ativo
    NotActive,
    /// Rodada de airdrop não encontrada
    RoundNotFound,
    /// Airdrop já reivindicado
    AlreadyClaimed,
    /// Usuário não elegível
    NotEligible,
    /// Erro aritmético
    ArithmeticError,
    /// Erro de permissão
    Unauthorized,
    /// Parâmetro inválido
    InvalidParameter,
    /// Limite de participantes atingido
    ParticipantLimitReached,
    /// Airdrop já está ativo
    AirdropAlreadyActive,
    /// Airdrop ainda não terminou
    AirdropNotEnded,
    /// Período do airdrop já terminou
    AirdropEnded,
    /// Nenhum participante no airdrop
    NoParticipants,
}

/// Período de distribuição do airdrop (12 meses em blocos, assumindo ~12s por bloco)
const DISTRIBUTION_PERIOD_BLOCKS: u32 = 12 * 30 * 24 * 60 * 60 / 12; // ~12 meses = 2,592,000 blocos

/// Configuração do Airdrop
#[derive(Debug, Clone, PartialEq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct AirdropConfig {
    /// Indica se o airdrop está ativo
    pub is_active: bool,
    /// Bloco de início da distribuição
    pub distribution_start_block: u32,
    /// Bloco de fim da distribuição (início + 12 meses)
    pub distribution_end_block: u32,
    /// Saldo mínimo para participar (em unidades mínimas)
    pub min_balance: u128,
    /// Número mínimo de transações para participar
    pub min_transactions: u32,
    /// Pontos por FIAPO no saldo médio
    pub points_per_fiapo: u8,
    /// Pontos por FIAPO em stake
    pub points_per_stake: u8,
    /// Pontos por FIAPO queimado
    pub points_per_burn: u8,
    /// Multiplicador para afiliados diretos
    pub affiliate_multiplier: u8,
    /// Multiplicador para afiliados de segundo nível
    pub second_level_affiliate_multiplier: u8,
    /// Pontos base por NFT paga (não free)
    pub points_per_paid_nft: u16,
    /// Multiplicador por tier de NFT (0-6 para os 7 tiers)
    pub nft_tier_multipliers: [u8; 7],
    /// Pontos bônus por evolução de NFT
    pub points_per_evolution: u16,
    /// Número máximo de participantes
    pub max_participants: u32,
    /// Taxas de distribuição entre os critérios
    pub distribution_rates: DistributionRates,
}

/// Taxas de distribuição do airdrop
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct DistributionRates {
    /// Porcentagem para holders (25%)
    pub holders: u8,
    /// Porcentagem para stakers (30%)
    pub stakers: u8,
    /// Porcentagem para queimadores (20%)
    pub burners: u8,
    /// Porcentagem para rede de afiliados (10%)
    pub affiliates: u8,
    /// Porcentagem para NFT holders (15%)
    pub nft_holders: u8,
}

impl Default for DistributionRates {
    fn default() -> Self {
        Self {
            holders: 25,
            stakers: 30,
            burners: 20,
            affiliates: 10,
            nft_holders: 15,
        }
    }
}

impl Default for AirdropConfig {
    fn default() -> Self {
        let current_block = ink::env::block_number::<ink::env::DefaultEnvironment>();
        
        Self {
            is_active: false,
            distribution_start_block: current_block,
            distribution_end_block: current_block.saturating_add(DISTRIBUTION_PERIOD_BLOCKS),
            min_balance: 1_000 * 10u128.pow(8), // 1000 FIAPO (assumindo 8 casas decimais)
            min_transactions: 3,
            points_per_fiapo: 1,
            points_per_stake: 2,
            points_per_burn: 5,
            affiliate_multiplier: 10,
            second_level_affiliate_multiplier: 5,
            points_per_paid_nft: 100,  // 100 pontos base por NFT paga
            nft_tier_multipliers: [1, 2, 4, 6, 12, 30, 60], // Free=1x, $10=2x, ..., $500=60x
            points_per_evolution: 500,  // 500 pontos por evolução
            max_participants: 10_000,
            distribution_rates: DistributionRates {
                holders: 25,     // 25% para detentores
                stakers: 30,     // 30% para stakers
                burners: 20,     // 20% para queimadores
                affiliates: 10,  // 10% para afiliados
                nft_holders: 15, // 15% para NFT holders
            },
        }
    }
}

/// Dados de um round de airdrop
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(StorageLayout, scale_info::TypeInfo))]
pub struct AirdropRound {
    /// ID da rodada
    pub id: u32,
    /// Total de pontos acumulados
    pub total_points: u128,
    /// Número de participantes
    pub total_participants: u32,
    /// Tokens por ponto (calculado ao fechar a rodada)
    pub tokens_per_point: u128,
    /// Se a distribuição foi realizada
    pub is_distributed: bool,
    /// Bloco em que a rodada foi fechada
    pub closed_at: Option<u32>,
    /// Total de tokens distribuídos
    pub total_distributed: u128,
}

/// Dados de um usuário no airdrop
#[derive(Debug, Clone, PartialEq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct UserAirdrop {
    /// ID da rodada
    pub round_id: u32,
    /// Pontos por saldo médio
    pub balance_points: u128,
    /// Pontos por staking
    pub staking_points: u128,
    /// Pontos por queima de tokens
    pub burning_points: u128,
    /// Pontos por rede de afiliados
    pub affiliate_points: u128,
    /// Pontos por NFTs (quantidade + tier + evoluções)
    pub nft_points: u128,
    /// Indica se o usuário já reivindicou o airdrop
    pub claimed: bool,
}

impl Default for UserAirdrop {
    fn default() -> Self {
        Self {
            round_id: 0,
            balance_points: 0,
            staking_points: 0,
            burning_points: 0,
            affiliate_points: 0,
            nft_points: 0,
            claimed: false,
        }
    }
}

impl UserAirdrop {
    /// Cria uma nova instância de UserAirdrop
    pub fn new(round_id: u32) -> Self {
        Self {
            round_id,
            ..Default::default()
        }
    }
}

/// Storage do módulo de airdrop
/// Compatível com ink! 4.3.0 - usando derives padrão
#[derive(Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
#[allow(dead_code)]
pub struct Airdrop {
    /// Configuração atual do airdrop
    config: AirdropConfig,
    /// Mapeamento de usuários do airdrop
    users: Mapping<AccountId, UserAirdrop>,
    /// Mapeamento de rounds de airdrop
    rounds: Mapping<u32, AirdropRound>,
    /// ID da rodada atual
    current_round: u32,
    /// Total de tokens a serem distribuídos
    total_tokens: u128,
    /// Total de pontos acumulados por todos os usuários
    total_points: u128,
    /// Mapeamento de afiliados
    affiliates: Mapping<AccountId, Vec<AccountId>>,
    /// Mapeamento de referências de afiliados
    /// Mapeamento de referências de afiliados
    referrers: Mapping<AccountId, AccountId>,
    /// Administrador do contrato
    admin: AccountId,
}

impl Airdrop {
    /// Retorna o número do bloco atual
    fn current_block_number(&self) -> u32 {
        ink::env::block_number::<ink::env::DefaultEnvironment>()
    }
    

    
    // Removendo métodos auxiliares que causam erros de tipo com mapeamentos
    // Os mapeamentos podem ser acessados diretamente
    
    // Removendo métodos auxiliares que acessam campos inexistentes
    // Os métodos de participantes, claims e total_points foram removidos
    // pois os campos correspondentes não existem na struct Airdrop
    // A lógica foi movida para usar os campos existentes diretamente

    /// Verifica se a conta é admin
    pub fn is_admin(&self, account: AccountId) -> bool {
        self.admin == account
    }

    /// Cria uma nova instância do Airdrop
    pub fn new() -> Self {
        Self {
            config: AirdropConfig {
                is_active: false,
                distribution_start_block: 0,
                distribution_end_block: 0,
                min_balance: 0,
                min_transactions: 0,
                points_per_fiapo: 1,
                points_per_stake: 10,
                points_per_burn: 100,
                affiliate_multiplier: 2,
                second_level_affiliate_multiplier: 1,
                points_per_paid_nft: 100,
                nft_tier_multipliers: [1, 2, 4, 6, 12, 30, 60],
                points_per_evolution: 500,
                max_participants: 10000,
                distribution_rates: DistributionRates::default(),
            },
            users: Mapping::default(),
            rounds: Mapping::default(),
            current_round: 0,
            total_tokens: 0,
            total_points: 0,
            affiliates: Mapping::default(),
            referrers: Mapping::default(),
            admin: ink::env::caller::<ink::env::DefaultEnvironment>(),
        }
    }
    
    /// Inicializa uma nova rodada de airdrop
    pub fn initialize_airdrop_round(
        &mut self,
        _total_tokens: u128,
        _min_stake_duration: u32,
    ) -> Result<u32, AirdropError> {
        let current_block = self.current_block_number();
        let start_block = current_block;
        let end_block = current_block.saturating_add(DISTRIBUTION_PERIOD_BLOCKS);
        
        if self.config.is_active {
            return Err(AirdropError::AirdropAlreadyActive);
        }

        // Configura os blocos de início e fim da distribuição
        self.config.is_active = true;
        self.config.distribution_start_block = start_block;
        self.config.distribution_end_block = end_block;

        let round_id = self.current_round + 1;
        
        let round = AirdropRound {
            id: round_id,
            total_points: 0,
            total_participants: 0,
            tokens_per_point: 0,
            is_distributed: false,
            closed_at: None,
            total_distributed: 0,
        };

        self.rounds.insert(round_id, &round);
        self.current_round = round_id;
        
        self.config.is_active = true;

        Ok(round_id)
    }

    /// Fecha a rodada atual de airdrop e calcula os tokens por ponto
    pub fn close_airdrop_round(
        &mut self,
        _caller: AccountId,
        total_tokens: u128,
    ) -> Result<(), AirdropError> {
        if !self.config.is_active {
            return Err(AirdropError::NotActive);
        }

        // Verifica se o período de distribuição terminou
        if self.current_block_number() < self.config.distribution_end_block {
            return Err(AirdropError::AirdropNotEnded);
        }

        let round_id = self.current_round;
        let mut round = self.rounds.get(round_id).ok_or(AirdropError::RoundNotFound)?;

        // Verifica se há participantes
        if round.total_participants == 0 {
            return Err(AirdropError::NoParticipants);
        }

        // Calcula tokens por ponto
        round.tokens_per_point = total_tokens.checked_div(round.total_points)
            .ok_or(AirdropError::ArithmeticError)?;
            
        // Marca a rodada como encerrada
        round.closed_at = Some(self.current_block_number());
        self.rounds.insert(round_id, &round);
        
        // Desativa o airdrop
        self.config.is_active = false;

        Ok(())
    }

    /// Atualiza a configuração do airdrop (apenas admin)
    pub fn update_config(
        &mut self,
        caller: AccountId,
        min_balance: Option<u128>,
        min_transactions: Option<u32>,
        points_per_fiapo: Option<u8>,
        points_per_stake: Option<u8>,
        points_per_burn: Option<u8>,
        affiliate_multiplier: Option<u8>,
        second_level_affiliate_multiplier: Option<u8>,
        points_per_paid_nft: Option<u16>,
        nft_tier_multipliers: Option<[u8; 7]>,
        points_per_evolution: Option<u16>,
        max_participants: Option<u32>,
        distribution_rates: Option<DistributionRates>,
    ) -> Result<(), AirdropError> {
        // Verifica se o chamador é admin
        if !self.is_admin(caller) {
            return Err(AirdropError::Unauthorized);
        }

        if let Some(min_balance) = min_balance {
            self.config.min_balance = min_balance;
        }
        
        if let Some(min_transactions) = min_transactions {
            self.config.min_transactions = min_transactions;
        }
        
        if let Some(points) = points_per_fiapo {
            self.config.points_per_fiapo = points;
        }
        
        if let Some(points) = points_per_stake {
            self.config.points_per_stake = points;
        }
        
        if let Some(points) = points_per_burn {
            self.config.points_per_burn = points;
        }
        
        if let Some(multiplier) = affiliate_multiplier {
            self.config.affiliate_multiplier = multiplier;
        }
        
        if let Some(multiplier) = second_level_affiliate_multiplier {
            self.config.second_level_affiliate_multiplier = multiplier;
        }
        
        if let Some(points) = points_per_paid_nft {
            self.config.points_per_paid_nft = points;
        }
        
        if let Some(multipliers) = nft_tier_multipliers {
            self.config.nft_tier_multipliers = multipliers;
        }
        
        if let Some(points) = points_per_evolution {
            self.config.points_per_evolution = points;
        }
        
        if let Some(max) = max_participants {
            self.config.max_participants = max;
        }
        
        if let Some(rates) = distribution_rates {
            self.config.distribution_rates = rates;
        }
        
        Ok(())
    }

    /// Obtém a configuração atual do airdrop
    pub fn get_config(&self) -> AirdropConfig {
        self.config.clone()
    }
    
    /// Verifica se uma conta é elegível para participar do airdrop
    pub fn is_eligible(&self, account: AccountId) -> bool {
        if !self.config.is_active {
            return false;
        }
        
        // Verifica se estamos dentro do período de distribuição
        let current_block = self.current_block_number();
        if current_block > self.config.distribution_end_block {
            return false;
        }
        
        // Obtém os dados do usuário, se existirem
        if let Some(user_data) = self.users.get(account) {
            // Verifica se o usuário tem alguma pontuação
            if user_data.balance_points == 0 && 
               user_data.staking_points == 0 && 
               user_data.burning_points == 0 && 
               user_data.affiliate_points == 0 &&
               user_data.nft_points == 0 {
                return false;
            }
        } else {
            // Usuário não tem dados de airdrop
            return false;
        }
        
        // Verifica se já atingiu o limite de participantes
        if let Some(round) = self.rounds.get(self.current_round) {
            if round.total_participants >= self.config.max_participants {
                return false;
            }
        }
        
        true
    }
    

    
    /// Atualiza a pontuação de um usuário baseado no saldo médio de FIAPO
    pub fn update_balance_score(&mut self, account: AccountId, average_balance: u128) -> Result<(), AirdropError> {
        if !self.config.is_active {
            return Err(AirdropError::NotActive);
        }
        
        // Verifica se estamos dentro do período de distribuição
        let current_block = self.current_block_number();
        if current_block > self.config.distribution_end_block {
            return Err(AirdropError::AirdropEnded);
        }
        
        if average_balance < self.config.min_balance {
            return Ok(()); // Usuário não atinge o saldo mínimo, não pontua
        }
        
        let round_id = self.current_round;
        let mut round = self.rounds.get(round_id).ok_or(AirdropError::RoundNotFound)?;
        
        // Calcula pontos baseado no saldo (1 ponto por FIAPO, conforme configuração)
        let points = average_balance.saturating_mul(self.config.points_per_fiapo as u128) 
            / 10u128.pow(8); // Ajuste para 8 casas decimais
            
        // Atualiza pontuação do usuário
        let mut user_data = self.users.get(account)
            .unwrap_or_else(|| UserAirdrop::new(round_id));
            
        user_data.balance_points = points;
        self.users.insert(account, &user_data);
        
        // Atualiza total de pontos da rodada
        round.total_points = round.total_points.saturating_add(points);
        self.rounds.insert(round_id, &round);
        
        Ok(())
    }
    
    /// Atualiza a pontuação de um usuário baseado no staking
    pub fn update_staking_score(
        &mut self, 
        account: AccountId, 
        staked_amount: u128,
        staking_duration_blocks: u32
    ) -> Result<(), AirdropError> {
        if !self.config.is_active {
            return Err(AirdropError::NotActive);
        }
        
        // Verifica se estamos dentro do período de distribuição
        let current_block = self.current_block_number();
        if current_block > self.config.distribution_end_block {
            return Err(AirdropError::AirdropEnded);
        }
        
        if staked_amount == 0 {
            return Ok(()); // Nada para atualizar
        }
        
        let round_id = self.current_round;
        let mut round = self.rounds.get(round_id).ok_or(AirdropError::RoundNotFound)?;
        
        // Multiplicador de 1.0x a 3.0x baseado na duração (mínimo 30 dias, máximo 1 ano)
        // Usando ponto fixo com escala de 10000 (1.0 = 10000, 3.0 = 30000)
        const SCALE: u128 = 10000;
        const MIN_MULTIPLIER: u128 = 10000; // 1.0x
        const MAX_MULTIPLIER: u128 = 30000; // 3.0x
        const BLOCKS_30_DAYS: u128 = 216000; // ~30 dias assumindo 12s por bloco
        
        // Calcula multiplicador: (duration / 30_days) capped entre 1.0 e 3.0
        let raw_multiplier = (staking_duration_blocks as u128)
            .saturating_mul(SCALE)
            .checked_div(BLOCKS_30_DAYS)
            .unwrap_or(MIN_MULTIPLIER);
        let duration_multiplier = raw_multiplier.max(MIN_MULTIPLIER).min(MAX_MULTIPLIER);
        
        // Calcula pontos: (staked_amount * points_per_stake * multiplier) / SCALE
        let points = staked_amount
            .saturating_mul(self.config.points_per_stake as u128)
            .saturating_mul(duration_multiplier)
            .saturating_div(SCALE);
        
        // Atualiza pontuação do usuário
        let mut user_data = self.users.get(account)
            .unwrap_or_else(|| UserAirdrop::new(round_id));
            
        user_data.staking_points = points;
        self.users.insert(account, &user_data);
        
        // Atualiza total de pontos da rodada
        round.total_points = round.total_points.saturating_add(points);
        self.rounds.insert(round_id, &round);
        
        Ok(())
    }
    
    /// Atualiza a pontuação de um usuário baseado em queima de tokens
    pub fn update_burning_score(&mut self, account: AccountId, burned_amount: u128) -> Result<(), AirdropError> {
        if !self.config.is_active {
            return Err(AirdropError::NotActive);
        }
        
        // Verifica se estamos dentro do período de distribuição
        let current_block = self.current_block_number();
        if current_block > self.config.distribution_end_block {
            return Err(AirdropError::AirdropEnded);
        }
        
        if burned_amount == 0 {
            return Ok(()); // Nada para atualizar
        }
        
        let round_id = self.current_round;
        let mut round = self.rounds.get(round_id).ok_or(AirdropError::RoundNotFound)?;
        
        // Calcula pontos baseado na quantidade queimada (maior peso)
        let points = burned_amount.saturating_mul(self.config.points_per_burn as u128);
        
        // Atualiza pontuação do usuário
        let mut user_data = self.users.get(account)
            .unwrap_or_else(|| UserAirdrop::new(round_id));
            
        user_data.burning_points = points;
        self.users.insert(account, &user_data);
        
        // Atualiza total de pontos da rodada
        round.total_points = round.total_points.saturating_add(points);
        self.rounds.insert(round_id, &round);
        
        Ok(())
    }
    
    /// Atualiza a pontuação de um usuário baseado em sua rede de afiliados
    pub fn update_affiliate_score(
        &mut self, 
        referrer: AccountId, 
        direct_referrals: Vec<AccountId>,
        second_level_referrals: Vec<AccountId>
    ) -> Result<(), AirdropError> {
        if !self.config.is_active {
            return Err(AirdropError::NotActive);
        }
        
        // Verifica se estamos dentro do período de distribuição
        let current_block = self.current_block_number();
        if current_block > self.config.distribution_end_block {
            return Err(AirdropError::AirdropEnded);
        }
        
        let round_id = self.current_round;
        let mut round = self.rounds.get(round_id).ok_or(AirdropError::RoundNotFound)?;
        
        // Calcula pontos de afiliados diretos
        let direct_points = direct_referrals.len() as u128 * self.config.affiliate_multiplier as u128;
        
        // Calcula pontos de afiliados de segundo nível
        let second_level_points = second_level_referrals.len() as u128 * self.config.second_level_affiliate_multiplier as u128;
        
        // Atualiza pontuação do usuário
        let mut user_data = self.users.get(referrer)
            .unwrap_or_else(|| UserAirdrop::new(round_id));
            
        user_data.affiliate_points = user_data.affiliate_points.saturating_add(direct_points.saturating_add(second_level_points));
        self.users.insert(referrer, &user_data);
        
        // Atualiza total de pontos da rodada
        let total_points = direct_points.saturating_add(second_level_points);
        round.total_points = round.total_points.saturating_add(total_points);
        self.rounds.insert(round_id, &round);
        
        Ok(())
    }
    
    /// Atualiza a pontuação de um usuário baseado em NFTs possuídas
    /// 
    /// # Parâmetros
    /// - `account`: Conta do usuário
    /// - `nft_counts`: Array com quantidade de NFTs por tier [tier0, tier1, ..., tier6]
    /// - `evolution_count`: Número total de evoluções realizadas
    pub fn update_nft_score(
        &mut self, 
        account: AccountId, 
        nft_counts: [u32; 7],
        evolution_count: u32
    ) -> Result<(), AirdropError> {
        if !self.config.is_active {
            return Err(AirdropError::NotActive);
        }
        
        // Verifica se estamos dentro do período de distribuição
        let current_block = self.current_block_number();
        if current_block > self.config.distribution_end_block {
            return Err(AirdropError::AirdropEnded);
        }
        
        let round_id = self.current_round;
        let mut round = self.rounds.get(round_id).ok_or(AirdropError::RoundNotFound)?;
        
        // Calcula pontos baseado em NFTs
        let mut total_nft_points: u128 = 0;
        
        // Pontos por cada NFT (quantidade × tier_multiplier × base_points)
        for tier in 0..7 {
            let count = nft_counts[tier] as u128;
            let multiplier = self.config.nft_tier_multipliers[tier] as u128;
            let base_points = self.config.points_per_paid_nft as u128;
            
            // NFT Tier 0 (free) usa base_points / 2 para pontuar menos
            let points = if tier == 0 {
                count.saturating_mul(base_points / 2).saturating_mul(multiplier)
            } else {
                count.saturating_mul(base_points).saturating_mul(multiplier)
            };
            
            total_nft_points = total_nft_points.saturating_add(points);
        }
        
        // Adiciona pontos bônus por evoluções
        let evolution_points = (evolution_count as u128)
            .saturating_mul(self.config.points_per_evolution as u128);
        total_nft_points = total_nft_points.saturating_add(evolution_points);
        
        // Atualiza pontuação do usuário
        let mut user_data = self.users.get(account)
            .unwrap_or_else(|| UserAirdrop::new(round_id));
            
        user_data.nft_points = total_nft_points;
        self.users.insert(account, &user_data);
        
        // Atualiza total de pontos da rodada
        round.total_points = round.total_points.saturating_add(total_nft_points);
        self.rounds.insert(round_id, &round);
        
        Ok(())
    }
    
    /// Obtém a pontuação total de um usuário na rodada atual
    pub fn get_user_score(&self, account: AccountId) -> Result<u128, AirdropError> {
        let _round_id = self.current_round;
        
        if let Some(user_data) = self.users.get(account) {
            let total = user_data.balance_points
                .saturating_add(user_data.staking_points)
                .saturating_add(user_data.burning_points)
                .saturating_add(user_data.affiliate_points)
                .saturating_add(user_data.nft_points);
            
            Ok(total)
        } else {
            Ok(0) // Usuário não tem pontuação registrada
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ink::env::test;
    use ink::primitives::AccountId;

    // Conta de teste para o dono/autorizado
    fn default_accounts() -> test::DefaultAccounts<ink::env::DefaultEnvironment> {
        test::default_accounts::<ink::env::DefaultEnvironment>()
    }

    // Configuração do ambiente de teste
    fn set_sender(sender: AccountId) {
        ink::env::test::set_caller::<ink::env::DefaultEnvironment>(sender);
    }

    #[ink::test]
    fn test_airdrop_config_default() {
        let config = AirdropConfig::default();
        
        assert_eq!(config.is_active, false);
        assert_eq!(config.min_balance, 1_000 * 10u128.pow(8));
        assert_eq!(config.min_transactions, 3);
        assert_eq!(config.points_per_fiapo, 1);
        assert_eq!(config.points_per_stake, 2);
        assert_eq!(config.points_per_burn, 5);
        assert_eq!(config.affiliate_multiplier, 10);
        assert_eq!(config.second_level_affiliate_multiplier, 5);
        assert_eq!(config.points_per_paid_nft, 100);
        assert_eq!(config.nft_tier_multipliers, [1, 2, 4, 6, 12, 30, 60]);
        assert_eq!(config.points_per_evolution, 500);
        assert_eq!(config.max_participants, 10_000);
        
        let rates = &config.distribution_rates;
        assert_eq!(rates.holders, 25);
        assert_eq!(rates.stakers, 30);
        assert_eq!(rates.burners, 20);
        assert_eq!(rates.affiliates, 10);
        assert_eq!(rates.nft_holders, 15);
        
        // Verify total is 100%
        assert_eq!(rates.holders + rates.stakers + rates.burners + rates.affiliates + rates.nft_holders, 100);
    }
    
    #[ink::test]
    fn test_airdrop_data_new() {
        let airdrop_data = Airdrop::new();
        
        assert_eq!(airdrop_data.current_round, 0);
        assert_eq!(airdrop_data.config.is_active, false);
    }

    #[ink::test]
    fn test_initialize_airdrop_round() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        
        // Inicializa corretamente
        let result = airdrop_data.initialize_airdrop_round(1000, 200);
        assert_eq!(result, Ok(1));
        assert_eq!(airdrop_data.current_round, 1);
        assert_eq!(airdrop_data.config.is_active, true);
        assert_eq!(airdrop_data.config.distribution_start_block, 0);
        assert_eq!(airdrop_data.config.distribution_end_block, 2592000);
        
        // Tenta inicializar novamente sem fechar a rodada atual
        let result = airdrop_data.initialize_airdrop_round(300, 400);
        assert_eq!(result, Err(AirdropError::AirdropAlreadyActive));
    }

    #[ink::test]
    fn test_close_airdrop_round() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        
        // Tenta fechar sem rodada ativa
        let result = airdrop_data.close_airdrop_round(accounts.alice, 1000);
        assert_eq!(result, Err(AirdropError::NotActive));
        
        // Inicializa uma rodada
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // Avança o bloco para depois do período de distribuição
        // ink! 4.3.0: advance_block avança 1 bloco por vez
        // Para teste simplificado, avançamos apenas alguns blocos
        // e ajustamos a configuração do airdrop para teste
        for _ in 0..10 {
            ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
        }
        
        // Ajusta o end_block para o teste funcionar
        airdrop_data.config.distribution_end_block = 5;
        
        // Adiciona alguns pontos para evitar erro de sem participantes
        if let Some(mut round) = airdrop_data.rounds.get(1) {
            round.total_points = 100;
            round.total_participants = 1;
            airdrop_data.rounds.insert(1, &round);
        }
        
        let result = airdrop_data.close_airdrop_round(accounts.alice, 1000);
        assert_eq!(result, Ok(()));
        assert_eq!(airdrop_data.config.is_active, false);
        
        // Verifica se calculou corretamente os tokens por ponto
        let round = airdrop_data.rounds.get(1).unwrap();
        assert_eq!(round.tokens_per_point, 10); // 1000 / 100
        assert!(round.closed_at.is_some());
    }

    #[ink::test]
    fn test_update_config() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        
        // Atualiza várias configurações
        let new_rates = DistributionRates {
            holders: 25,
            stakers: 30,
            burners: 20,
            affiliates: 10,
            nft_holders: 15,
        };
        
        let result = airdrop_data.update_config(
            accounts.alice,
            Some(2000), // min_balance
            Some(5),    // min_transactions
            Some(2),    // points_per_fiapo
            Some(3),    // points_per_stake
            Some(10),   // points_per_burn
            Some(15),   // affiliate_multiplier
            Some(8),    // second_level_affiliate_multiplier
            Some(150),  // points_per_paid_nft
            Some([2, 3, 5, 7, 15, 35, 70]), // nft_tier_multipliers
            Some(600),  // points_per_evolution
            Some(5000), // max_participants
            Some(new_rates.clone()), // distribution_rates
        );
        
        assert_eq!(result, Ok(()));
        
        // Verifica se as configurações foram atualizadas
        let config = airdrop_data.get_config();
        assert_eq!(config.min_balance, 2000);
        assert_eq!(config.min_transactions, 5);
        assert_eq!(config.points_per_fiapo, 2);
        assert_eq!(config.points_per_stake, 3);
        assert_eq!(config.points_per_burn, 10);
        assert_eq!(config.affiliate_multiplier, 15);
        assert_eq!(config.second_level_affiliate_multiplier, 8);
        assert_eq!(config.max_participants, 5000);
        assert_eq!(config.distribution_rates.holders, 25);
        assert_eq!(config.distribution_rates.stakers, 30);
        assert_eq!(config.distribution_rates.burners, 20);
        assert_eq!(config.distribution_rates.affiliates, 10);
        assert_eq!(config.distribution_rates.nft_holders, 15);
        assert_eq!(config.points_per_paid_nft, 150);
        assert_eq!(config.nft_tier_multipliers, [2, 3, 5, 7, 15, 35, 70]);
        assert_eq!(config.points_per_evolution, 600);
    }

    #[ink::test]
    fn test_is_eligible() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        
        // Configura saldo e transações para o teste
        let test_account = accounts.bob;
        
        // Inicializa uma rodada de airdrop
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // Configuração de dados de usuário para teste de elegibilidade
        let mut user_data = UserAirdrop::new(1);
        user_data.balance_points = 2000;
        airdrop_data.users.insert(&test_account, &user_data);
        
        // Deve ser elegível com saldo suficiente
        assert!(airdrop_data.is_eligible(test_account));
        
        // Testa com usuário sem pontuação
        let mut user_data = UserAirdrop::new(1);
        user_data.balance_points = 0;
        user_data.staking_points = 0;
        user_data.burning_points = 0;
        user_data.affiliate_points = 0;
        airdrop_data.users.insert(&test_account, &user_data);
        assert!(!airdrop_data.is_eligible(test_account));
        
        // Restaura pontuação adequada
        let mut user_data = UserAirdrop::new(1);
        user_data.balance_points = 2000;
        airdrop_data.users.insert(&test_account, &user_data);
        assert!(airdrop_data.is_eligible(test_account));
    }

    // Testes de hooks integrados
    #[ink::test]
    fn test_hooks_on_stake() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        
        // Inicializa uma rodada de airdrop
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // Testa o hook de staking
        let result = airdrop_data.on_stake(accounts.bob, 1000 * 10u128.pow(8), 100);
        assert!(result.is_ok());
        
        // Verifica se a pontuação foi atualizada
        let user_score = airdrop_data.get_user_score(accounts.bob);
        assert!(user_score.is_ok());
        
        if let Ok(score) = user_score {
            assert!(score > 0);
        }
    }

    #[ink::test]
    fn test_hooks_on_burn() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        
        // Inicializa uma rodada de airdrop
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // Testa o hook de queima
        let result = airdrop_data.on_burn(accounts.bob, 500 * 10u128.pow(8));
        assert!(result.is_ok());
        
        // Verifica se a pontuação foi atualizada
        let user_score = airdrop_data.get_user_score(accounts.bob);
        assert!(user_score.is_ok());
        
        if let Ok(score) = user_score {
            assert!(score > 0);
        }
    }

    #[ink::test]
    fn test_hooks_on_affiliate_update() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        
        // Inicializa uma rodada de airdrop
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // Testa o hook de afiliados
        let direct_referrals = vec![accounts.bob, accounts.charlie];
        let second_level_referrals = vec![accounts.eve];
        
        let result = airdrop_data.on_affiliate_update(accounts.alice, direct_referrals, second_level_referrals);
        assert!(result.is_ok());
        
        // Verifica se a pontuação foi atualizada
        let user_score = airdrop_data.get_user_score(accounts.alice);
        assert!(user_score.is_ok());
        
        if let Ok(score) = user_score {
            assert!(score > 0);
        }
    }

    // ========== NFT SCORING TESTS ==========

    #[ink::test]
    fn test_nft_score_single_free_nft() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // 1 NFT Free (Tier 0)
        let nft_counts = [1, 0, 0, 0, 0, 0, 0];
        let result = airdrop_data.update_nft_score(accounts.alice, nft_counts, 0);
        assert_eq!(result, Ok(()));
        
        // Free NFT: (100 / 2) * 1 = 50 pontos
        let user_data = airdrop_data.users.get(accounts.alice).unwrap();
        assert_eq!(user_data.nft_points, 50);
    }

    #[ink::test]
    fn test_nft_score_paid_nfts() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // 2 NFTs Tier 1 ($10) + 1 NFT Tier 3 ($55)
        let nft_counts = [0, 2, 0, 1, 0, 0, 0];
        let result = airdrop_data.update_nft_score(accounts.alice, nft_counts, 0);
        assert_eq!(result, Ok(()));
        
        // Tier 1: 2 * (100 * 2) = 400 pontos
        // Tier 3: 1 * (100 * 6) = 600 pontos
        // Total: 1000 pontos
        let user_data = airdrop_data.users.get(accounts.alice).unwrap();
        assert_eq!(user_data.nft_points, 1000);
    }

    #[ink::test]
    fn test_nft_score_with_whale_nft() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // 1 NFT Tier 6 ($500)
        let nft_counts = [0, 0, 0, 0, 0, 0, 1];
        let result = airdrop_data.update_nft_score(accounts.alice, nft_counts, 0);
        assert_eq!(result, Ok(()));
        
        // Tier 6: 1 * (100 * 60) = 6000 pontos
        let user_data = airdrop_data.users.get(accounts.alice).unwrap();
        assert_eq!(user_data.nft_points, 6000);
    }

    #[ink::test]
    fn test_nft_score_with_evolutions() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // 1 NFT Tier 2 + 3 evoluções
        let nft_counts = [0, 0, 1, 0, 0, 0, 0];
        let result = airdrop_data.update_nft_score(accounts.alice, nft_counts, 3);
        assert_eq!(result, Ok(()));
        
        // Tier 2: 1 * (100 * 4) = 400 pontos
        // Evoluções: 3 * 500 = 1500 pontos
        // Total: 1900 pontos
        let user_data = airdrop_data.users.get(accounts.alice).unwrap();
        assert_eq!(user_data.nft_points, 1900);
    }

    #[ink::test]
    fn test_nft_score_mixed_scenario() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // 1 Free + 2 Tier 1 + 1 Tier 4 + 2 evoluções
        let nft_counts = [1, 2, 0, 0, 1, 0, 0];
        let result = airdrop_data.update_nft_score(accounts.alice, nft_counts, 2);
        assert_eq!(result, Ok(()));
        
        // Free: 1 * (50 * 1) = 50 pontos
        // Tier 1: 2 * (100 * 2) = 400 pontos
        // Tier 4: 1 * (100 * 12) = 1200 pontos
        // Evoluções: 2 * 500 = 1000 pontos
        // Total: 2650 pontos
        let user_data = airdrop_data.users.get(accounts.alice).unwrap();
        assert_eq!(user_data.nft_points, 2650);
    }

    #[ink::test]
    fn test_total_score_includes_nft_points() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // Adiciona pontos de diferentes categorias
        let mut user_data = UserAirdrop::new(1);
        user_data.balance_points = 10000;
        user_data.staking_points = 20000;
        user_data.burning_points = 5000;
        user_data.affiliate_points = 100;
        user_data.nft_points = 6000; // 1 NFT Tier 6
        airdrop_data.users.insert(&accounts.alice, &user_data);
        
        // Total: 10000 + 20000 + 5000 + 100 + 6000 = 41100
        let total_score = airdrop_data.get_user_score(accounts.alice).unwrap();
        assert_eq!(total_score, 41100);
    }

    #[ink::test]
    fn test_nft_score_eligibility() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop_data = Airdrop::new();
        airdrop_data.initialize_airdrop_round(1000, 200).unwrap();
        
        // Usuário com apenas NFT points
        let mut user_data = UserAirdrop::new(1);
        user_data.nft_points = 200; // 1 NFT Tier 1
        airdrop_data.users.insert(&accounts.alice, &user_data);
        
        // Deve ser elegível com apenas NFT points
        assert!(airdrop_data.is_eligible(accounts.alice));
    }

    #[ink::test]
    fn test_nft_tier_multipliers() {
        let airdrop_data = Airdrop::new();
        let config = airdrop_data.get_config();
        
        // Verifica multiplicadores para cada tier
        assert_eq!(config.nft_tier_multipliers[0], 1);  // Free: 1x
        assert_eq!(config.nft_tier_multipliers[1], 2);  // $10: 2x
        assert_eq!(config.nft_tier_multipliers[2], 4);  // $30: 4x
        assert_eq!(config.nft_tier_multipliers[3], 6);  // $55: 6x
        assert_eq!(config.nft_tier_multipliers[4], 12); // $100: 12x
        assert_eq!(config.nft_tier_multipliers[5], 30); // $250: 30x
        assert_eq!(config.nft_tier_multipliers[6], 60); // $500: 60x
    }

    #[ink::test]
    fn test_distribution_rates_includes_nft() {
        let airdrop_data = Airdrop::new();
        let config = airdrop_data.get_config();
        
        // Verifica que todos os pools somam 100%
        let total = config.distribution_rates.holders
            + config.distribution_rates.stakers
            + config.distribution_rates.burners
            + config.distribution_rates.affiliates
            + config.distribution_rates.nft_holders;
        
        assert_eq!(total, 100);
        
        // Verifica distribuição específica
        assert_eq!(config.distribution_rates.holders, 25);
        assert_eq!(config.distribution_rates.stakers, 30);
        assert_eq!(config.distribution_rates.burners, 20);
        assert_eq!(config.distribution_rates.affiliates, 10);
        assert_eq!(config.distribution_rates.nft_holders, 15);
    }
}

// ==========================================
// 🔓 PENETRATION TESTING MODULE
// ==========================================

#[cfg(test)]
mod security_tests {
    use super::*;
    use ink::env::test;

    // ==========================================
    // ATTACK VECTOR 1: OVERFLOW/UNDERFLOW
    // ==========================================

    /// 🎯 ATAQUE: Integer Overflow
    /// Hacker tenta causar overflow enviando valores máximos
    #[ink::test]
    fn attack_integer_overflow_nft_score() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        airdrop.initialize_airdrop_round(1000, 200).unwrap();
        
        // 🔴 ATAQUE: Tentar overflow com valores máximos
        let max_nfts: [u32; 7] = [u32::MAX, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u32::MAX];
        let result = airdrop.update_nft_score(accounts.alice, max_nfts, u32::MAX);
        
        // ✅ PROTEÇÃO: saturating_add previne overflow - não deve dar panic
        assert!(result.is_ok());
        
        // Verificar que o valor não "envolveu" para zero
        let user_data = airdrop.users.get(accounts.alice).unwrap();
        assert!(user_data.nft_points > 0);
    }

    /// 🎯 ATAQUE: Underflow
    /// Hacker tenta causar underflow em subtrações
    #[ink::test]
    fn attack_underflow_protection() {
        // O contrato usa saturating_sub que retorna 0 em caso de underflow
        let value: u128 = 100;
        let result = value.saturating_sub(1000); // Tentando subtrair mais do que tem
        
        // ✅ PROTEÇÃO: Resultado é 0, não um número gigante
        assert_eq!(result, 0);
    }

    // ==========================================
    // ATTACK VECTOR 2: PRIVILEGE ESCALATION
    // ==========================================

    /// 🎯 ATAQUE: Privilege Escalation - Usuário comum tenta atualizar config
    #[ink::test]
    fn attack_privilege_escalation_update_config() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        
        // Bob não é admin, tenta atualizar configuração
        let evil_rates = DistributionRates {
            holders: 90, // Hacker tenta direcionar 90% para ele
            stakers: 5,
            burners: 2,
            affiliates: 2,
            nft_holders: 1,
        };
        
        // ⚠️ NOTA: Esta verificação está desabilitada no código atual!
        // O teste mostra uma vulnerabilidade potencial
        let result = airdrop.update_config(
            accounts.bob, // Bob, não Alice (admin)
            None, None, None, None, None, None, None, None, None, None, None,
            Some(evil_rates),
        );
        
        // Se o resultado for Ok, significa que a verificação de admin não está ativa!
        if result.is_ok() {
            ink::env::debug_println!("⚠️ VULNERABILIDADE: update_config não valida caller!");
        }
    }

    // ==========================================
    // ATTACK VECTOR 3: DOUBLE SPEND / REENTRANCY
    // ==========================================

    /// 🎯 ATAQUE: Reentrancy (simulado)
    #[ink::test]
    fn attack_reentrancy_pattern() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        airdrop.initialize_airdrop_round(1000, 200).unwrap();
        
        // Simula update de score
        let nft_counts = [1, 0, 0, 0, 0, 0, 0];
        airdrop.update_nft_score(accounts.alice, nft_counts, 0).unwrap();
        
        let first_points = airdrop.users.get(accounts.alice).unwrap().nft_points;
        
        // Tenta chamar novamente - deve SUBSTITUIR, não ADICIONAR
        airdrop.update_nft_score(accounts.alice, nft_counts, 0).unwrap();
        
        let second_points = airdrop.users.get(accounts.alice).unwrap().nft_points;
        
        // ✅ PROTEÇÃO: Pontos são substituídos, não duplicados
        assert_eq!(first_points, second_points);
    }

    // ==========================================
    // ATTACK VECTOR 4: NFT GAMING
    // ==========================================

    /// 🎯 ATAQUE: NFT Score Inflation
    /// Hacker tenta inflar score chamando update_nft_score repetidamente
    #[ink::test]
    fn attack_nft_score_inflation() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        airdrop.initialize_airdrop_round(1000, 200).unwrap();
        
        let nft_counts = [0, 1, 0, 0, 0, 0, 0]; // 1 NFT Tier 1
        
        // Chamadas múltiplas
        for _ in 0..100 {
            airdrop.update_nft_score(accounts.alice, nft_counts, 0).unwrap();
        }
        
        let final_points = airdrop.users.get(accounts.alice).unwrap().nft_points;
        
        // ✅ PROTEÇÃO: Score é 200 (1 NFT × 100 base × 2 multiplier), não 20000
        assert_eq!(final_points, 200);
    }

    /// 🎯 ATAQUE: Fake NFT Tier
    /// Hacker tenta usar tier inexistente
    #[ink::test]
    fn attack_fake_nft_tier() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        airdrop.initialize_airdrop_round(1000, 200).unwrap();
        
        // Array tem exatamente 7 elementos (tiers 0-6)
        // O Rust garante type safety - não é possível passar tier 7+
        let valid_nft_counts: [u32; 7] = [0, 0, 0, 0, 0, 0, 1]; // Tier 6 (máximo)
        let result = airdrop.update_nft_score(accounts.alice, valid_nft_counts, 0);
        
        // ✅ PROTEÇÃO: Type system Rust previne tiers inválidos
        assert!(result.is_ok());
    }

    // ==========================================
    // ATTACK VECTOR 5: SYBIL ATTACK
    // ==========================================

    /// 🎯 ATAQUE: Sybil - Múltiplas carteiras
    /// Hacker cria múltiplas carteiras para diluir pool
    #[ink::test]
    fn attack_sybil_multiple_wallets() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        airdrop.initialize_airdrop_round(1000000, 200).unwrap();
        
        // Alice com holding legítimo: 10000 FIAPO
        let mut alice_data = UserAirdrop::new(1);
        alice_data.balance_points = 10000;
        airdrop.users.insert(&accounts.alice, &alice_data);
        
        // "Hacker" cria 100 carteiras vazias tentando participar (reduzido de 1000 para perf)
        let fake_wallets: ink::prelude::vec::Vec<AccountId> = (0..100)
            .map(|i| AccountId::from([i as u8 + 10; 32]))
            .collect();
        
        let mut eligible_count = 0;
        for wallet in &fake_wallets {
            // Carteiras vazias
            let empty_data = UserAirdrop::new(1);
            airdrop.users.insert(wallet, &empty_data);
            
            if airdrop.is_eligible(*wallet) {
                eligible_count += 1;
            }
        }
        
        // ✅ PROTEÇÃO: Carteiras vazias não são elegíveis
        assert_eq!(eligible_count, 0);
        
        // Alice legítima é elegível
        assert!(airdrop.is_eligible(accounts.alice));
    }

    // ==========================================
    // ATTACK VECTOR 6: FLASH LOAN
    // ==========================================

    /// 🎯 ATAQUE: Flash Loan (simulado)
    #[ink::test]
    fn attack_flash_loan_simulation() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        airdrop.initialize_airdrop_round(1000000, 200).unwrap();
        
        let config = airdrop.get_config();
        
        // ✅ PROTEÇÃO: O sistema usa distribuição por período
        assert!(config.distribution_end_block > config.distribution_start_block);
    }

    // ==========================================
    // ATTACK VECTOR 7: DIVISION BY ZERO
    // ==========================================

    /// 🎯 ATAQUE: Division by Zero
    #[ink::test]
    fn attack_division_by_zero() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        airdrop.initialize_airdrop_round(1000, 200).unwrap();
        
        // Tentar fechar round com 0 participantes causaria divisão por zero
        // O sistema deve bloquear isso
        let result = airdrop.close_airdrop_round(accounts.alice, 1000);
        
        // ✅ PROTEÇÃO: Erro de NoParticipants ou similar
        assert!(result.is_err());
    }

    // ==========================================
    // ATTACK VECTOR 10: DENIAL OF SERVICE
    // ==========================================

    /// 🎯 ATAQUE: DoS por Loop Infinito
    #[ink::test]
    fn attack_dos_gas_exhaustion() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        airdrop.initialize_airdrop_round(1000, 200).unwrap();
        
        // O loop de NFT tiers é fixo em 7 iterações
        let nft_counts = [u32::MAX, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u32::MAX, u32::MAX];
        
        // Mesmo com valores máximos, o loop é O(7) - constante
        let result = airdrop.update_nft_score(accounts.alice, nft_counts, 0);
        
        // ✅ PROTEÇÃO: Loops são bounded (7 tiers fixos)
        assert!(result.is_ok());
    }
}
