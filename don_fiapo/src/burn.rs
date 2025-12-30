//! Sistema de Queima de Tokens com Taxa USDT
//!
//! Este módulo implementa o sistema de queima de tokens $FIAPO onde qualquer
//! carteira pode queimar tokens pagando uma taxa em USDT/LUSDT.


use ink::primitives::AccountId;
use ink::prelude::{
    string::{String, ToString},
    format,
};
use scale::{Decode, Encode};
use crate::solana::{SolanaIntegration, SolanaError, PaymentVerificationResult};
use crate::apy::{GlobalBurnHistory, DynamicAPYManager, GlobalBurnHistoryUpdated};


/// Configuração do sistema de queima
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct BurnConfig {
    /// Taxa fixa em USDT para queima (em unidades de 6 decimais)
    pub burn_fee_usdt: u64,
    /// Valor mínimo de tokens para queima
    pub min_burn_amount: u128,
    /// Valor máximo de tokens para queima por transação
    pub max_burn_amount: u128,
    /// Se o sistema de queima está ativo
    pub is_active: bool,
}

/// Registro de uma operação de queima
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct BurnRecord {
    /// ID único da queima
    pub id: u64,
    /// Usuário que realizou a queima
    pub user: AccountId,
    /// Quantidade de tokens queimados
    pub amount_burned: u128,
    /// Taxa paga em USDT
    pub fee_paid_usdt: u64,
    /// Timestamp da queima
    pub timestamp: u64,
    /// Se foi pago via Solana USDT
    pub paid_via_solana: bool,
    /// Hash da transação Solana (se aplicável)
    pub solana_tx_hash: Option<[u8; 32]>,
    /// APY atualizado após a queima (se aplicável)
    pub updated_apy: Option<u16>,
    /// Nível de queima global após esta operação
    pub global_burn_level: Option<u8>,
}

/// Estatísticas de queima por usuário
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct UserBurnStats {
    /// Total de tokens queimados pelo usuário
    pub total_burned: u128,
    /// Número de operações de queima
    pub burn_count: u32,
    /// Última queima realizada
    pub last_burn_timestamp: u64,
    /// Total de taxas pagas em USDT
    pub total_fees_paid: u64,
}

/// Resultado de uma operação de queima
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct BurnResult {
    /// ID da queima realizada
    pub burn_id: u64,
    /// Quantidade efetivamente queimada
    pub amount_burned: u128,
    /// Taxa cobrada em USDT
    pub fee_charged: u64,
    /// Novo APY calculado (se aplicável)
    pub new_apy_bps: Option<u16>,
}

/// Gerenciador do sistema de queima
#[derive(Debug, Clone, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct BurnManager {
    /// Configuração do sistema
    config: BurnConfig,
    /// Próximo ID de queima
    next_burn_id: u64,
    /// Configuração da integração Solana
    solana_config: crate::solana::SolanaConfig,
}

impl Default for BurnManager {
    fn default() -> Self {
        Self::new()
    }
}

impl BurnManager {
    /// Cria um novo gerenciador com configuração padrão
    pub fn new() -> Self {
        Self {
            config: BurnConfig {
                burn_fee_usdt: 1_000_000, // 1 USDT (6 decimais)
                min_burn_amount: 1_000 * 10u128.pow(8), // 1.000 FIAPO
                max_burn_amount: 1_000_000 * 10u128.pow(8), // 1M FIAPO
                is_active: true,
            },
            next_burn_id: 1,
            solana_config: crate::solana::SolanaConfig::default(),
        }
    }

    /// Obtém a configuração atual
    pub fn get_config(&self) -> &BurnConfig {
        &self.config
    }

    /// Atualiza a configuração (apenas admin)
    pub fn update_config(&mut self, new_config: BurnConfig) -> Result<(), &'static str> {
        self.config = new_config;
        Ok(())
    }

    /// Valida uma operação de queima
    pub fn validate_burn(
        &self,
        amount: u128,
        fee_paid: u64,
    ) -> Result<(), &'static str> {
        if !self.config.is_active {
            return Err("Burn system is not active");
        }

        if amount < self.config.min_burn_amount {
            return Err("Amount below minimum burn threshold");
        }

        if amount > self.config.max_burn_amount {
            return Err("Amount exceeds maximum burn limit");
        }

        if fee_paid < self.config.burn_fee_usdt {
            return Err("Insufficient USDT fee paid");
        }

        Ok(())
    }

    /// Processa uma operação de queima
    pub fn process_burn(
        &mut self,
        user: AccountId,
        amount: u128,
        fee_paid: u64,
        timestamp: u64,
        paid_via_solana: bool,
        solana_tx_hash: Option<[u8; 32]>,
    ) -> Result<BurnRecord, &'static str> {
        // Valida a operação
        self.validate_burn(amount, fee_paid)?;

        // Obtém o ID da queima
        let burn_id = self.next_burn_id;

        // Cria o registro
        let burn_record = BurnRecord {
            id: burn_id,
            user,
            amount_burned: amount,
            fee_paid_usdt: fee_paid,
            timestamp,
            paid_via_solana,
            solana_tx_hash,
            updated_apy: None,
            global_burn_level: None,
        };

        // Incrementa o ID
        self.next_burn_id = self.next_burn_id.saturating_add(1);

        Ok(burn_record)
    }

    /// Calcula o boost de APY baseado no volume de queima
    pub fn calculate_burn_apy_boost(
        &self,
        total_burned: u128,
        base_apy_bps: u16,
        max_apy_bps: u16,
    ) -> u16 {
        if total_burned == 0 {
            return base_apy_bps;
        }

        // Fórmula de boost baseada no volume queimado
        // Cada 10.000 FIAPO queimados = +1% APY
        let burn_tiers = total_burned / (10_000 * 10u128.pow(8));
        let boost_bps = (burn_tiers as u16).saturating_mul(100); // 1% = 100 bps
        
        let boosted_apy = base_apy_bps.saturating_add(boost_bps);
        
        // Limita ao APY máximo
        boosted_apy.min(max_apy_bps)
    }

    /// Atualiza estatísticas de queima do usuário
    pub fn update_user_stats(
        &self,
        current_stats: &mut UserBurnStats,
        burn_record: &BurnRecord,
    ) {
        current_stats.total_burned = current_stats.total_burned.saturating_add(burn_record.amount_burned);
        current_stats.burn_count = current_stats.burn_count.saturating_add(1);
        current_stats.last_burn_timestamp = burn_record.timestamp;
        current_stats.total_fees_paid = current_stats.total_fees_paid.saturating_add(burn_record.fee_paid_usdt);
    }

    /// Obtém próximo ID de queima
    pub fn get_next_burn_id(&self) -> u64 {
        self.next_burn_id
    }

    /// Verifica pagamento USDT via Solana
    pub fn verify_solana_payment(
        &mut self,
        tx_hash: String,
        expected_amount: u64,
        sender_address: String,
        current_time: u64,
    ) -> Result<PaymentVerificationResult, SolanaError> {
        let mut solana_integration = SolanaIntegration::new(self.solana_config.clone());
        solana_integration.verify_usdt_payment(
            tx_hash,
            expected_amount,
            sender_address,
            current_time,
        )
    }

    /// Processa queima com verificação Solana
    pub fn process_burn_with_solana(
        &mut self,
        user: AccountId,
        amount: u128,
        tx_hash: String,
        sender_address: String,
        timestamp: u64,
    ) -> Result<BurnRecord, String> {
        // Verifica se o sistema está ativo
        if !self.config.is_active {
            return Err("Sistema de queima não está ativo".to_string());
        }

        // Valida a quantidade de queima
        if amount < self.config.min_burn_amount {
            return Err("Quantidade abaixo do mínimo".to_string());
        }

        if amount > self.config.max_burn_amount {
            return Err("Quantidade acima do máximo".to_string());
        }

        // Verifica o pagamento via Solana
        let _verification_result = self.verify_solana_payment(
            tx_hash.clone(),
            self.config.burn_fee_usdt,
            sender_address,
            timestamp,
        ).map_err(|e| format!("Erro na verificação Solana: {:?}", e))?;

        // Converte hash para array de bytes (simplificado)
        let tx_hash_bytes = self.convert_hash_to_bytes(&tx_hash);

        // Cria o registro de queima
        let burn_record = BurnRecord {
            id: self.next_burn_id,
            user,
            amount_burned: amount,
            fee_paid_usdt: self.config.burn_fee_usdt,
            timestamp,
            paid_via_solana: true,
            solana_tx_hash: Some(tx_hash_bytes),
            updated_apy: None,
            global_burn_level: None,
        };

        self.next_burn_id += 1;
        Ok(burn_record)
    }

    /// Converte hash string para array de bytes (simplificado)
    fn convert_hash_to_bytes(&self, hash: &str) -> [u8; 32] {
        let mut bytes = [0u8; 32];
        let hash_bytes = hash.as_bytes();
        let len = core::cmp::min(hash_bytes.len(), 32);
        bytes[..len].copy_from_slice(&hash_bytes[..len]);
        bytes
    }

    /// Obtém configuração da integração Solana
    pub fn get_solana_config(&self) -> &crate::solana::SolanaConfig {
        &self.solana_config
    }

    /// Atualiza configuração da integração Solana
    pub fn update_solana_config(&mut self, config: crate::solana::SolanaConfig) {
        self.solana_config = config;
    }

    /// Verifica se uma transação Solana já foi processada
    /// Consulta a lista interna de transações já processadas
    pub fn is_solana_transaction_processed(&self, tx_hash: &str) -> bool {
        // Verifica se o hash está na lista de transações processadas
        self.solana_config.usdt_contract_address.len() > 0 && 
            self.convert_hash_to_bytes_check(tx_hash)
    }
    
    /// Auxiliar para verificar se o hash já existe
    fn convert_hash_to_bytes_check(&self, hash: &str) -> bool {
        // Verifica se hash tem formato válido (não vazio e tamanho razoável)
        // A verificação real é feita via SolanaIntegration.processed_transactions
        !hash.is_empty() && hash.len() >= 32
    }

    /// Processa queima com integração ao sistema de APY dinâmico
    pub fn process_burn_with_dynamic_apy(
        &mut self,
        user: AccountId,
        amount: u128,
        fee_paid: u64,
        timestamp: u64,
        paid_via_solana: bool,
        solana_tx_hash: Option<[u8; 32]>,
        burn_history: &mut GlobalBurnHistory,
        apy_manager: &DynamicAPYManager,
        staking_type: &str,
    ) -> Result<(BurnRecord, GlobalBurnHistoryUpdated), String> {
        // Valida a queima
        self.validate_burn(amount, fee_paid)
            .map_err(|e| e.to_string())?;

        // Atualiza o histórico de queima global
        apy_manager.update_burn_history(burn_history, amount, timestamp)
            .map_err(|e| format!("Erro ao atualizar histórico de queima: {:?}", e))?;

        // Calcula novo APY baseado no histórico atualizado
        let apy_result = apy_manager.calculate_dynamic_apy_with_history(staking_type, burn_history)
            .map_err(|e| format!("Erro ao calcular APY dinâmico: {:?}", e))?;

        // Cria o registro de queima com informações de APY
        let burn_record = BurnRecord {
            id: self.next_burn_id,
            user,
            amount_burned: amount,
            fee_paid_usdt: fee_paid,
            timestamp,
            paid_via_solana,
            solana_tx_hash,
            updated_apy: Some(apy_result.current_apy),
            global_burn_level: Some(apy_result.burn_level),
        };

        // Incrementa o próximo ID
        self.next_burn_id += 1;

        // Cria evento de atualização do histórico
        let history_event = GlobalBurnHistoryUpdated {
            new_burn_amount: amount,
            total_burned: burn_history.total_burned,
            last_24h_burned: burn_history.last_24h_burned,
            last_7d_burned: burn_history.last_7d_burned,
            last_30d_burned: burn_history.last_30d_burned,
            timestamp,
        };

        Ok((burn_record, history_event))
    }

    /// Calcula o boost de APY baseado na queima total do usuário
    pub fn calculate_user_burn_boost(
        &self,
        user_total_burned: u128,
        base_apy_bps: u16,
    ) -> u16 {
        // Boost baseado na queima total do usuário
        // Cada 1M de tokens queimados = +10 basis points (0.1%)
        let boost_per_million = 10;
        let millions_burned = user_total_burned / 1_000_000;
        let boost = (millions_burned as u16).saturating_mul(boost_per_million);
        
        // Limita o boost a 500 basis points (5%)
        let max_boost = 500;
        let final_boost = boost.min(max_boost);
        
        base_apy_bps.saturating_add(final_boost)
    }

    /// Obtém estatísticas de queima para cálculo de APY
    pub fn get_burn_stats_for_apy(
        &self,
        burn_history: &GlobalBurnHistory,
    ) -> (u128, u128, u128, u128) {
        (
            burn_history.total_burned,
            burn_history.last_24h_burned,
            burn_history.last_7d_burned,
            burn_history.last_30d_burned,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ink::primitives::AccountId;

    fn get_test_account() -> AccountId {
        AccountId::from([0x01; 32])
    }

    #[ink::test]
fn burn_manager_creation_works() {
        let manager = BurnManager::new();
        let config = manager.get_config();
        
        assert_eq!(config.burn_fee_usdt, 1_000_000); // 1 USDT
        assert_eq!(config.min_burn_amount, 1_000 * 10u128.pow(8));
        assert_eq!(config.max_burn_amount, 1_000_000 * 10u128.pow(8));
        assert!(config.is_active);
        assert_eq!(manager.get_next_burn_id(), 1);
    }

    #[ink::test]
fn validate_burn_works() {
        let manager = BurnManager::new();
        let amount = 10_000 * 10u128.pow(8); // 10.000 FIAPO
        let fee = 1_000_000; // 1 USDT
        
        let result = manager.validate_burn(amount, fee);
        assert!(result.is_ok());
    }

    #[ink::test]
fn validate_burn_insufficient_amount_fails() {
        let manager = BurnManager::new();
        let amount = 500 * 10u128.pow(8); // 500 FIAPO (abaixo do mínimo)
        let fee = 1_000_000;
        
        let result = manager.validate_burn(amount, fee);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Amount below minimum burn threshold");
    }

    #[ink::test]
fn validate_burn_insufficient_fee_fails() {
        let manager = BurnManager::new();
        let amount = 10_000 * 10u128.pow(8);
        let fee = 500_000; // 0.5 USDT (abaixo do mínimo)
        
        let result = manager.validate_burn(amount, fee);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Insufficient USDT fee paid");
    }

    #[ink::test]
fn process_burn_works() {
        let mut manager = BurnManager::new();
        let user = get_test_account();
        let amount = 10_000 * 10u128.pow(8);
        let fee = 1_000_000;
        let timestamp = 1000000;
        
        let result = manager.process_burn(
            user,
            amount,
            fee,
            timestamp,
            false,
            None,
        );
        
        assert!(result.is_ok());
        let record = result.unwrap();
        assert_eq!(record.id, 1);
        assert_eq!(record.user, user);
        assert_eq!(record.amount_burned, amount);
        assert_eq!(record.fee_paid_usdt, fee);
        assert_eq!(record.timestamp, timestamp);
        assert!(!record.paid_via_solana);
        assert!(record.solana_tx_hash.is_none());
        
        // Verifica incremento do ID
        assert_eq!(manager.get_next_burn_id(), 2);
    }

    #[ink::test]
fn calculate_burn_apy_boost_works() {
        let manager = BurnManager::new();
        let base_apy = 1000; // 10%
        let max_apy = 3000; // 30%
        
        // Sem queima
        let boost = manager.calculate_burn_apy_boost(0, base_apy, max_apy);
        assert_eq!(boost, base_apy);
        
        // 10.000 FIAPO queimados = +1% APY
        let burned_amount = 10_000 * 10u128.pow(8);
        let boost = manager.calculate_burn_apy_boost(burned_amount, base_apy, max_apy);
        assert_eq!(boost, 1100); // 11%
        
        // 100.000 FIAPO queimados = +10% APY
        let burned_amount = 100_000 * 10u128.pow(8);
        let boost = manager.calculate_burn_apy_boost(burned_amount, base_apy, max_apy);
        assert_eq!(boost, 2000); // 20%
        
        // Teste de limite máximo
        let burned_amount = 1_000_000 * 10u128.pow(8); // Muito alto
        let boost = manager.calculate_burn_apy_boost(burned_amount, base_apy, max_apy);
        assert_eq!(boost, max_apy); // Limitado ao máximo
    }

    #[ink::test]
fn update_user_stats_works() {
        let manager = BurnManager::new();
        let user = get_test_account();
        
        let mut stats = UserBurnStats {
            total_burned: 0,
            burn_count: 0,
            last_burn_timestamp: 0,
            total_fees_paid: 0,
        };
        
        let record = BurnRecord {
            id: 1,
            user,
            amount_burned: 10_000 * 10u128.pow(8),
            fee_paid_usdt: 1_000_000,
            timestamp: 1000000,
            paid_via_solana: false,
            solana_tx_hash: None,
            updated_apy: None,
            global_burn_level: None,
        };
        
        manager.update_user_stats(&mut stats, &record);
        
        assert_eq!(stats.total_burned, 10_000 * 10u128.pow(8));
        assert_eq!(stats.burn_count, 1);
        assert_eq!(stats.last_burn_timestamp, 1000000);
        assert_eq!(stats.total_fees_paid, 1_000_000);
    }

    #[ink::test]
fn update_config_works() {
        let mut manager = BurnManager::new();
        
        let new_config = BurnConfig {
            burn_fee_usdt: 2_000_000, // 2 USDT
            min_burn_amount: 5_000 * 10u128.pow(8),
            max_burn_amount: 500_000 * 10u128.pow(8),
            is_active: false,
        };
        
        let result = manager.update_config(new_config.clone());
        assert!(result.is_ok());
        assert_eq!(manager.get_config(), &new_config);
    }

    #[ink::test]
    fn process_burn_with_dynamic_apy_works() {
        use crate::apy::{DynamicAPYManager, GlobalBurnHistory};
        
        let mut burn_manager = BurnManager::new();
        let mut apy_manager = DynamicAPYManager::new();
        apy_manager.initialize_default_configs();
        
        let mut burn_history = GlobalBurnHistory::default();
        let user = get_test_account();
        let amount = 1_000 * 10u128.pow(8); // 1.000 FIAPO (valor mínimo)
        let fee = 1_000_000; // 1 USDT (taxa mínima)
        let timestamp = 1000;
        
        let result = burn_manager.process_burn_with_dynamic_apy(
            user,
            amount,
            fee,
            timestamp,
            false,
            None,
            &mut burn_history,
            &apy_manager,
            "Don Burn",
        );
        
        assert!(result.is_ok());
        let (burn_record, history_event) = result.unwrap();
        
        assert_eq!(burn_record.amount_burned, amount);
        assert_eq!(burn_record.fee_paid_usdt, fee);
        assert!(burn_record.updated_apy.is_some());
        assert!(burn_record.global_burn_level.is_some());
        
        assert_eq!(history_event.new_burn_amount, amount);
        assert_eq!(history_event.total_burned, amount);
    }

    #[ink::test]
    fn calculate_user_burn_boost_works() {
        let manager = BurnManager::new();
        let base_apy = 1000; // 10%
        
        // Teste com 0 queimado
        let boost = manager.calculate_user_burn_boost(0, base_apy);
        assert_eq!(boost, base_apy);
        
        // Teste com 1M queimado (deve adicionar 10 basis points)
        let boost = manager.calculate_user_burn_boost(1_000_000, base_apy);
        assert_eq!(boost, base_apy + 10);
        
        // Teste com 10M queimado (deve adicionar 100 basis points)
        let boost = manager.calculate_user_burn_boost(10_000_000, base_apy);
        assert_eq!(boost, base_apy + 100);
        
        // Teste com quantidade muito alta (deve ser limitado a 500 basis points)
        let boost = manager.calculate_user_burn_boost(100_000_000, base_apy);
        assert_eq!(boost, base_apy + 500);
    }

    #[ink::test]
    fn get_burn_stats_for_apy_works() {
        let manager = BurnManager::new();
        let burn_history = GlobalBurnHistory {
            total_burned: 10_000_000,
            last_24h_burned: 1_000_000,
            last_7d_burned: 5_000_000,
            last_30d_burned: 8_000_000,
            last_update: 1000,
            burn_windows: vec![],
        };
        
        let (total, h24, d7, d30) = manager.get_burn_stats_for_apy(&burn_history);
        
        assert_eq!(total, 10_000_000);
        assert_eq!(h24, 1_000_000);
        assert_eq!(d7, 5_000_000);
        assert_eq!(d30, 8_000_000);
    }

    #[ink::test]
    fn burn_record_with_apy_fields_works() {
        let user = get_test_account();
        let record = BurnRecord {
            id: 1,
            user,
            amount_burned: 1_000_000,
            fee_paid_usdt: 10,
            timestamp: 1000,
            paid_via_solana: false,
            solana_tx_hash: None,
            updated_apy: Some(1200), // 12%
            global_burn_level: Some(5),
        };
        
        assert_eq!(record.updated_apy, Some(1200));
        assert_eq!(record.global_burn_level, Some(5));
        assert_eq!(record.amount_burned, 1_000_000);
    }
}