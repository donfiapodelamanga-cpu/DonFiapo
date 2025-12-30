//! Módulo de integração com USDT da rede Solana
//!
//! Este módulo implementa a funcionalidade para aceitar pagamentos de taxas
//! de staking em USDT da rede Solana, conforme especificado nos requisitos.
//!
//! Funcionalidades:
//! - Verificação de transações USDT na rede Solana
//! - Validação de pagamentos de taxas de entrada
//! - Sistema de oracle/bridge para comunicação entre redes
//! - Conversão de valores entre LUSDT e USDT Solana

use scale::{Decode, Encode};
use ink::prelude::string::{String, ToString};
use ink::prelude::vec::Vec;

#[cfg(feature = "std")]
use ink::storage::traits::StorageLayout;


/// Tipos de pagamento suportados para taxas de staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub enum PaymentMethod {
    /// Pagamento em LUSDT na rede Lunes
    LUSDT,
    /// Pagamento em USDT na rede Solana
    SolanaUSDT,
}

/// Status de uma transação de pagamento
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub enum PaymentStatus {
    /// Pagamento pendente de verificação
    Pending,
    /// Pagamento confirmado
    Confirmed,
    /// Pagamento rejeitado/inválido
    Rejected,
    /// Pagamento expirado
    Expired,
}

/// Informações de uma transação de pagamento Solana
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct SolanaPayment {
    /// Hash da transação na rede Solana
    pub transaction_hash: String,
    /// Endereço do remetente na Solana
    pub sender_address: String,
    /// Endereço de destino na Solana (nosso endereço)
    pub recipient_address: String,
    /// Valor em USDT (com 6 decimais - padrão USDT)
    pub amount_usdt: u64,
    /// Timestamp da transação
    pub timestamp: u64,
    /// Número do bloco
    pub block_number: u64,
    /// Status da verificação
    pub status: PaymentStatus,
}

/// Registro de pagamento de taxa de staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct StakingFeePayment {
    /// ID único do pagamento
    pub payment_id: u64,
    /// Conta do usuário na rede Lunes
    pub user_account: ink::primitives::AccountId,
    /// Método de pagamento utilizado
    pub payment_method: PaymentMethod,
    /// Valor da taxa em LUSDT/USDT
    pub fee_amount: u128,
    /// Quantidade de $FIAPO para staking
    pub fiapo_amount: u128,
    /// Informações do pagamento Solana (se aplicável)
    pub solana_payment: Option<SolanaPayment>,
    /// Timestamp da criação
    pub created_at: u64,
    /// Status do pagamento
    pub status: PaymentStatus,
}

/// Confirmação de um oracle para uma transação
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct OracleConfirmation {
    /// Endereço do oracle que confirmou
    pub oracle: ink::primitives::AccountId,
    /// Hash da transação confirmada
    pub transaction_hash: String,
    /// Valor confirmado em USDT
    pub amount_usdt: u64,
    /// Timestamp da confirmação
    pub confirmed_at: u64,
}

/// Transação pendente aguardando confirmações de múltiplos oracles
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct PendingMultiOraclePayment {
    /// Hash da transação Solana
    pub transaction_hash: String,
    /// Endereço do remetente na Solana
    pub sender_address: String,
    /// Valor esperado em USDT
    pub expected_amount: u64,
    /// Confirmações recebidas dos oracles
    pub confirmations: Vec<OracleConfirmation>,
    /// Timestamp de criação
    pub created_at: u64,
    /// Se já foi finalizado (aprovado ou rejeitado)
    pub finalized: bool,
}

/// Configuração do sistema multi-oracle
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct MultiOracleConfig {
    /// Lista de oracles autorizados
    pub oracles: Vec<ink::primitives::AccountId>,
    /// Número mínimo de confirmações necessárias (ex: 2 de 3)
    pub required_confirmations: u8,
    /// Timeout para confirmações (em segundos)
    pub confirmation_timeout: u64,
    /// Se o sistema multi-oracle está ativo
    pub enabled: bool,
}

impl Default for MultiOracleConfig {
    fn default() -> Self {
        Self {
            oracles: Vec::new(),
            required_confirmations: 2, // Requer 2 de N oracles
            confirmation_timeout: 3600, // 1 hora
            enabled: false, // Desabilitado por padrão
        }
    }
}

/// Configuração do bridge Solana
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct SolanaBridgeConfig {
    /// Endereço USDT na rede Solana para receber pagamentos
    pub usdt_recipient_address: String,
    /// Taxa de conversão LUSDT/USDT (em basis points)
    pub conversion_rate_bps: u16,
    /// Tempo limite para confirmação (em segundos)
    pub confirmation_timeout: u64,
    /// Número mínimo de confirmações na blockchain Solana
    pub min_confirmations: u32,
    /// Oracle autorizado para verificar transações (modo single-oracle)
    pub authorized_oracle: ink::primitives::AccountId,
    /// Configuração multi-oracle (opcional)
    pub multi_oracle: MultiOracleConfig,
}

/// Gerenciador do bridge Solana
#[derive(Debug, Clone, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
pub struct SolanaBridgeManager {
    /// Configuração do bridge
    config: SolanaBridgeConfig,
    /// Próximo ID de pagamento
    next_payment_id: u64,
    /// Cache de transações verificadas
    verified_transactions: Vec<String>,
    /// Pagamentos pendentes aguardando confirmações multi-oracle
    pending_multi_oracle_payments: Vec<PendingMultiOraclePayment>,
}

impl Default for SolanaBridgeManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SolanaBridgeManager {
    /// Cria um novo gerenciador com configuração padrão
    pub fn new() -> Self {
        Self {
            config: SolanaBridgeConfig {
                usdt_recipient_address: "DonFiapoUSDTReceiver1234567890123456789012".to_string(),
                conversion_rate_bps: 10000, // 1:1 por padrão
                confirmation_timeout: 3600, // 1 hora
                min_confirmations: 12,
                authorized_oracle: ink::primitives::AccountId::from([0u8; 32]),
                multi_oracle: MultiOracleConfig::default(),
            },
            next_payment_id: 1,
            verified_transactions: Vec::new(),
            pending_multi_oracle_payments: Vec::new(),
        }
    }

    /// Verifica se um endereço é um oráculo autorizado (single ou multi-oracle)
    pub fn is_authorized_oracle(&self, oracle: ink::primitives::AccountId) -> bool {
        // Modo single-oracle
        if self.config.authorized_oracle == oracle {
            return true;
        }
        
        // Modo multi-oracle
        if self.config.multi_oracle.enabled {
            return self.config.multi_oracle.oracles.contains(&oracle);
        }
        
        false
    }

    // ==================== SISTEMA MULTI-ORACLE ====================

    /// Configura o sistema multi-oracle (apenas admin)
    /// 
    /// # Segurança
    /// - Requer pelo menos 2 oracles para habilitar
    /// - required_confirmations deve ser <= número de oracles
    pub fn configure_multi_oracle(
        &mut self,
        oracles: Vec<ink::primitives::AccountId>,
        required_confirmations: u8,
        confirmation_timeout: u64,
    ) -> Result<(), &'static str> {
        // Validar número mínimo de oracles
        if oracles.len() < 2 {
            return Err("Multi-oracle requires at least 2 oracles");
        }
        
        // Validar required_confirmations
        if required_confirmations < 2 {
            return Err("Requires at least 2 confirmations");
        }
        
        if required_confirmations as usize > oracles.len() {
            return Err("Required confirmations exceeds oracle count");
        }
        
        // Validar endereços únicos
        for i in 0..oracles.len() {
            for j in i + 1..oracles.len() {
                if oracles[i] == oracles[j] {
                    return Err("Duplicate oracle address");
                }
            }
        }
        
        self.config.multi_oracle = MultiOracleConfig {
            oracles,
            required_confirmations,
            confirmation_timeout,
            enabled: true,
        };
        
        Ok(())
    }

    /// Desabilita o sistema multi-oracle, voltando ao single-oracle
    pub fn disable_multi_oracle(&mut self) {
        self.config.multi_oracle.enabled = false;
    }

    /// Adiciona um oracle à lista de oracles autorizados
    pub fn add_oracle(&mut self, oracle: ink::primitives::AccountId) -> Result<(), &'static str> {
        if self.config.multi_oracle.oracles.contains(&oracle) {
            return Err("Oracle already exists");
        }
        
        self.config.multi_oracle.oracles.push(oracle);
        Ok(())
    }

    /// Remove um oracle da lista de oracles autorizados
    pub fn remove_oracle(&mut self, oracle: ink::primitives::AccountId) -> Result<(), &'static str> {
        let initial_len = self.config.multi_oracle.oracles.len();
        self.config.multi_oracle.oracles.retain(|o| o != &oracle);
        
        if self.config.multi_oracle.oracles.len() == initial_len {
            return Err("Oracle not found");
        }
        
        // Verificar se ainda temos oracles suficientes
        if self.config.multi_oracle.enabled 
            && self.config.multi_oracle.oracles.len() < self.config.multi_oracle.required_confirmations as usize {
            self.config.multi_oracle.enabled = false;
        }
        
        Ok(())
    }

    /// Inicia um pagamento que requer confirmação multi-oracle
    pub fn initiate_multi_oracle_payment(
        &mut self,
        transaction_hash: String,
        sender_address: String,
        expected_amount: u64,
        current_time: u64,
    ) -> Result<(), &'static str> {
        // Validar que multi-oracle está habilitado
        if !self.config.multi_oracle.enabled {
            return Err("Multi-oracle not enabled");
        }
        
        // Verificar se transação já foi processada
        if self.verified_transactions.contains(&transaction_hash) {
            return Err("Transaction already processed");
        }
        
        // Verificar se já existe pagamento pendente para esta transação
        if self.pending_multi_oracle_payments.iter().any(|p| p.transaction_hash == transaction_hash) {
            return Err("Payment already pending");
        }
        
        // Criar pagamento pendente
        let pending = PendingMultiOraclePayment {
            transaction_hash,
            sender_address,
            expected_amount,
            confirmations: Vec::new(),
            created_at: current_time,
            finalized: false,
        };
        
        self.pending_multi_oracle_payments.push(pending);
        Ok(())
    }

    /// Oracle confirma um pagamento pendente
    /// 
    /// # Segurança
    /// - Apenas oracles autorizados podem confirmar
    /// - Cada oracle só pode confirmar uma vez
    /// - Verifica timeout
    /// - Retorna true se atingiu o número necessário de confirmações
    pub fn oracle_confirm_payment(
        &mut self,
        transaction_hash: String,
        amount_usdt: u64,
        oracle_account: ink::primitives::AccountId,
        current_time: u64,
    ) -> Result<bool, &'static str> {
        // Verificar se oracle é autorizado
        if !self.config.multi_oracle.oracles.contains(&oracle_account) {
            return Err("Unauthorized oracle");
        }
        
        // Encontrar pagamento pendente
        let pending = self.pending_multi_oracle_payments
            .iter_mut()
            .find(|p| p.transaction_hash == transaction_hash && !p.finalized)
            .ok_or("Pending payment not found")?;
        
        // Verificar timeout
        if current_time > pending.created_at.saturating_add(self.config.multi_oracle.confirmation_timeout) {
            pending.finalized = true;
            return Err("Payment confirmation timeout");
        }
        
        // Verificar se oracle já confirmou
        if pending.confirmations.iter().any(|c| c.oracle == oracle_account) {
            return Err("Oracle already confirmed");
        }
        
        // Verificar se valor está correto (com 1% de tolerância)
        let min_amount = pending.expected_amount.saturating_mul(99).saturating_div(100);
        let max_amount = pending.expected_amount.saturating_mul(101).saturating_div(100);
        if amount_usdt < min_amount || amount_usdt > max_amount {
            return Err("Amount mismatch");
        }
        
        // Adicionar confirmação
        pending.confirmations.push(OracleConfirmation {
            oracle: oracle_account,
            transaction_hash: transaction_hash.clone(),
            amount_usdt,
            confirmed_at: current_time,
        });
        
        // Verificar se atingiu número necessário de confirmações
        let has_enough = pending.confirmations.len() >= self.config.multi_oracle.required_confirmations as usize;
        
        if has_enough {
            pending.finalized = true;
            self.verified_transactions.push(transaction_hash);
        }
        
        Ok(has_enough)
    }

    /// Finaliza um pagamento multi-oracle (após atingir confirmações necessárias)
    pub fn finalize_multi_oracle_payment(
        &mut self,
        transaction_hash: String,
        sender_address: String,
        amount_usdt: u64,
        timestamp: u64,
        block_number: u64,
    ) -> Result<SolanaPayment, &'static str> {
        // Verificar se pagamento foi confirmado por multi-oracle
        let pending = self.pending_multi_oracle_payments
            .iter()
            .find(|p| p.transaction_hash == transaction_hash && p.finalized)
            .ok_or("Payment not confirmed by oracles")?;
        
        // Verificar se atingiu confirmações necessárias
        if pending.confirmations.len() < self.config.multi_oracle.required_confirmations as usize {
            return Err("Insufficient oracle confirmations");
        }
        
        // Criar pagamento confirmado
        let solana_payment = SolanaPayment {
            transaction_hash,
            sender_address,
            recipient_address: self.config.usdt_recipient_address.clone(),
            amount_usdt,
            timestamp,
            block_number,
            status: PaymentStatus::Confirmed,
        };
        
        Ok(solana_payment)
    }

    /// Retorna o status de um pagamento pendente multi-oracle
    pub fn get_pending_payment_status(&self, transaction_hash: &String) -> Option<(usize, u8, bool)> {
        self.pending_multi_oracle_payments
            .iter()
            .find(|p| &p.transaction_hash == transaction_hash)
            .map(|p| (
                p.confirmations.len(),
                self.config.multi_oracle.required_confirmations,
                p.finalized,
            ))
    }

    /// Limpa pagamentos pendentes expirados
    pub fn cleanup_expired_payments(&mut self, current_time: u64) {
        let timeout = self.config.multi_oracle.confirmation_timeout;
        self.pending_multi_oracle_payments.retain(|p| {
            !p.finalized || current_time <= p.created_at.saturating_add(timeout)
        });
    }

    /// Retorna configuração multi-oracle
    pub fn get_multi_oracle_config(&self) -> &MultiOracleConfig {
        &self.config.multi_oracle
    }

    /// Verifica se multi-oracle está habilitado
    pub fn is_multi_oracle_enabled(&self) -> bool {
        self.config.multi_oracle.enabled
    }

    // ==================== FIM SISTEMA MULTI-ORACLE ====================

    /// Cria um pagamento de queima pendente
    pub fn create_burn_payment(
        &mut self,
        _user: ink::primitives::AccountId,
        _amount: u128,
        _fee_amount: u128,
        _solana_usdt_address: String,
    ) -> Result<u64, &'static str> {
        let payment_id = self.next_payment_id;
        self.next_payment_id = self.next_payment_id.saturating_add(1);

        // Em uma implementação real, armazenaria o pagamento
        // Por enquanto, apenas retorna o ID
        Ok(payment_id)
    }

    /// Obtém um pagamento de queima
    pub fn get_burn_payment(&self, _payment_id: u64) -> Option<StakingFeePayment> {
        // Em uma implementação real, buscaria do storage
        None
    }

    /// Marca um pagamento de queima como processado
    pub fn mark_burn_payment_processed(&mut self, _payment_id: u64) -> Result<(), &'static str> {
        // Em uma implementação real, atualizaria o status no storage
        Ok(())
    }

    /// Configura o bridge (apenas admin)
    pub fn configure_bridge(
        &mut self,
        config: SolanaBridgeConfig,
    ) -> Result<(), &'static str> {
        self.config = config;
        Ok(())
    }

    /// Inicia um pagamento de taxa via USDT Solana
    pub fn initiate_solana_payment(
        &mut self,
        user_account: ink::primitives::AccountId,
        fee_amount_lusdt: u128,
        fiapo_amount: u128,
        current_time: u64,
    ) -> Result<StakingFeePayment, &'static str> {
        // Converte valor para USDT Solana (6 decimais)
        let fee_amount_usdt = self.convert_lusdt_to_solana_usdt(fee_amount_lusdt)?;
        
        let payment = StakingFeePayment {
            payment_id: self.next_payment_id,
            user_account,
            payment_method: PaymentMethod::SolanaUSDT,
            fee_amount: fee_amount_usdt as u128,
            fiapo_amount,
            solana_payment: None,
            created_at: current_time,
            status: PaymentStatus::Pending,
        };

        self.next_payment_id = self.next_payment_id.saturating_add(1);
        Ok(payment)
    }

    /// Confirma um pagamento Solana (chamado pelo backend oracle autorizado)
    /// 
    /// # Segurança
    /// - Apenas o oracle autorizado pode chamar esta função
    /// - A verificação real da transação Solana é feita off-chain pelo backend
    /// - O contrato apenas registra pagamentos já verificados
    /// 
    /// # Parâmetros
    /// - `transaction_hash`: Hash da transação Solana (88 chars base58)
    /// - `sender_address`: Endereço Solana do pagador (44 chars base58)
    /// - `amount_usdt`: Valor em USDT (6 decimais)
    /// - `timestamp`: Timestamp Unix da transação
    /// - `block_number`: Slot/bloco da transação Solana
    /// - `oracle_account`: AccountId do oracle que está chamando
    pub fn confirm_solana_payment(
        &mut self,
        transaction_hash: String,
        sender_address: String,
        amount_usdt: u64,
        timestamp: u64,
        block_number: u64,
        oracle_account: ink::primitives::AccountId,
    ) -> Result<SolanaPayment, &'static str> {
        // 1. Verifica se o oracle é autorizado
        if oracle_account != self.config.authorized_oracle {
            return Err("Unauthorized oracle");
        }

        // 2. Valida formato do hash (Solana: 87-88 chars base58)
        if transaction_hash.len() < 87 || transaction_hash.len() > 88 {
            return Err("Invalid transaction hash format");
        }

        // 3. Valida formato do endereço (Solana: 44 chars base58)
        if sender_address.len() != 44 {
            return Err("Invalid sender address format");
        }

        // 4. Verifica se a transação já foi processada (prevenção double-spend)
        if self.verified_transactions.contains(&transaction_hash) {
            return Err("Transaction already processed");
        }

        // 5. Valida valor mínimo (0.01 USDT = 10000 com 6 decimais)
        if amount_usdt < 10000 {
            return Err("Amount below minimum");
        }

        // 6. Cria o registro da transação confirmada
        let solana_payment = SolanaPayment {
            transaction_hash: transaction_hash.clone(),
            sender_address,
            recipient_address: self.config.usdt_recipient_address.clone(),
            amount_usdt,
            timestamp,
            block_number,
            status: PaymentStatus::Confirmed,
        };

        // 7. Registra transação como processada
        self.verified_transactions.push(transaction_hash);

        Ok(solana_payment)
    }

    /// Verifica se uma transação já foi processada
    pub fn is_transaction_processed(&self, transaction_hash: &String) -> bool {
        self.verified_transactions.contains(transaction_hash)
    }

    /// Converte valor de LUSDT (6 decimais) para USDT Solana (6 decimais)
    /// Conversão 1:1 pois ambos têm 6 casas decimais
    fn convert_lusdt_to_solana_usdt(&self, lusdt_amount: u128) -> Result<u64, &'static str> {
        // LUSDT e USDT Solana ambos têm 6 decimais - conversão 1:1
        // Aplica taxa de conversão se necessária (padrão 10000 bps = 1:1)
        let converted = lusdt_amount
            .saturating_mul(self.config.conversion_rate_bps as u128)
            .saturating_div(10000);
        
        u64::try_from(converted).map_err(|_| "Amount too large for USDT")
    }

    /// Converte valor de USDT Solana (6 decimais) para LUSDT (6 decimais)
    /// Conversão 1:1 pois ambos têm 6 casas decimais
    pub fn convert_solana_usdt_to_lusdt(&self, usdt_amount: u64) -> u128 {
        // USDT Solana e LUSDT ambos têm 6 decimais - conversão 1:1
        (usdt_amount as u128)
            .saturating_mul(10000)
            .saturating_div(self.config.conversion_rate_bps as u128)
    }

    /// Verifica se um pagamento expirou
    pub fn is_payment_expired(&self, payment: &StakingFeePayment, current_time: u64) -> bool {
        current_time > payment.created_at.saturating_add(self.config.confirmation_timeout)
    }

    /// Retorna a configuração atual do bridge
    pub fn get_config(&self) -> &SolanaBridgeConfig {
        &self.config
    }

    /// Retorna o endereço USDT para pagamentos
    pub fn get_usdt_payment_address(&self) -> &String {
        &self.config.usdt_recipient_address
    }

    /// Calcula o valor em USDT Solana para uma taxa
    pub fn calculate_solana_usdt_amount(&self, lusdt_amount: u128) -> Result<u64, &'static str> {
        self.convert_lusdt_to_solana_usdt(lusdt_amount)
    }

    /// Obtém o próximo ID de pagamento
    pub fn get_next_payment_id(&self) -> u64 {
        self.next_payment_id
    }

    /// Define o oráculo autorizado
    pub fn set_authorized_oracle(&mut self, oracle: ink::primitives::AccountId) {
        self.config.authorized_oracle = oracle;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn solana_bridge_manager_creation_works() {
        let manager = SolanaBridgeManager::new();
        assert_eq!(manager.next_payment_id, 1);
        assert_eq!(manager.config.conversion_rate_bps, 10000); // 1:1
        assert!(manager.verified_transactions.is_empty());
    }

    #[test]
    fn initiate_solana_payment_works() {
        let mut manager = SolanaBridgeManager::new();
        let user = ink::primitives::AccountId::from([1u8; 32]);
        let fee_amount = 1_000_000u128; // 1 LUSDT (6 decimais)
        let fiapo_amount = 1000_000_000_000u128; // 10000 FIAPO
        
        let result = manager.initiate_solana_payment(
            user,
            fee_amount,
            fiapo_amount,
            1000000,
        );
        
        assert!(result.is_ok());
        let payment = result.unwrap();
        assert_eq!(payment.payment_id, 1);
        assert_eq!(payment.user_account, user);
        assert_eq!(payment.payment_method, PaymentMethod::SolanaUSDT);
        assert_eq!(payment.status, PaymentStatus::Pending);
    }

    #[test]
    fn conversion_lusdt_to_solana_usdt_works() {
        let manager = SolanaBridgeManager::new();
        
        // 1 LUSDT (6 decimais) = 1 USDT Solana (6 decimais) - conversão 1:1
        let lusdt_amount = 1_000_000u128; // 1 LUSDT
        let result = manager.convert_lusdt_to_solana_usdt(lusdt_amount);
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1_000_000u64); // 1 USDT Solana
    }

    #[test]
    fn conversion_solana_usdt_to_lusdt_works() {
        let manager = SolanaBridgeManager::new();
        
        // 1 USDT Solana (6 decimais) = 1 LUSDT (6 decimais) - conversão 1:1
        let usdt_amount = 1_000_000u64; // 1 USDT Solana
        let result = manager.convert_solana_usdt_to_lusdt(usdt_amount);
        
        assert_eq!(result, 1_000_000u128); // 1 LUSDT
    }

    #[test]
    fn confirm_solana_payment_unauthorized_oracle_fails() {
        let mut manager = SolanaBridgeManager::new();
        let unauthorized_oracle = ink::primitives::AccountId::from([1u8; 32]);
        
        // Hash e endereço válidos no formato Solana
        let valid_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih";
        let valid_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        
        let result = manager.confirm_solana_payment(
            valid_hash.to_string(),
            valid_address.to_string(),
            1_000_000,
            1000000,
            12345,
            unauthorized_oracle,
        );
        
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Unauthorized oracle");
    }

    #[test]
    fn confirm_solana_payment_with_authorized_oracle_works() {
        let mut manager = SolanaBridgeManager::new();
        let oracle = ink::primitives::AccountId::from([0u8; 32]); // Oracle padrão
        
        let valid_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih";
        let valid_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        
        let result = manager.confirm_solana_payment(
            valid_hash.to_string(),
            valid_address.to_string(),
            1_000_000, // 1 USDT
            1000000,
            12345,
            oracle,
        );
        
        assert!(result.is_ok());
        let payment = result.unwrap();
        assert_eq!(payment.amount_usdt, 1_000_000);
        assert_eq!(payment.status, PaymentStatus::Confirmed);
    }

    #[test]
    fn confirm_solana_payment_prevents_double_spend() {
        let mut manager = SolanaBridgeManager::new();
        let oracle = ink::primitives::AccountId::from([0u8; 32]);
        
        let valid_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih";
        let valid_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        
        // Primeira confirmação - sucesso
        let result1 = manager.confirm_solana_payment(
            valid_hash.to_string(),
            valid_address.to_string(),
            1_000_000,
            1000000,
            12345,
            oracle,
        );
        assert!(result1.is_ok());
        
        // Segunda confirmação - deve falhar (double-spend)
        let result2 = manager.confirm_solana_payment(
            valid_hash.to_string(),
            valid_address.to_string(),
            1_000_000,
            1000000,
            12345,
            oracle,
        );
        assert!(result2.is_err());
        assert_eq!(result2.unwrap_err(), "Transaction already processed");
    }

    #[test]
    fn payment_expiration_works() {
        let manager = SolanaBridgeManager::new();
        let user = ink::primitives::AccountId::from([1u8; 32]);
        
        let payment = StakingFeePayment {
            payment_id: 1,
            user_account: user,
            payment_method: PaymentMethod::SolanaUSDT,
            fee_amount: 1_000_000,
            fiapo_amount: 1000_000_000_000,
            solana_payment: None,
            created_at: 1000000,
            status: PaymentStatus::Pending,
        };
        
        // Não expirado
        assert!(!manager.is_payment_expired(&payment, 1000000));
        
        // Expirado
        assert!(manager.is_payment_expired(&payment, 1000000 + 3601));
    }

    // ==================== TESTES MULTI-ORACLE ====================

    #[test]
    fn configure_multi_oracle_works() {
        let mut manager = SolanaBridgeManager::new();
        let oracle1 = ink::primitives::AccountId::from([1u8; 32]);
        let oracle2 = ink::primitives::AccountId::from([2u8; 32]);
        let oracle3 = ink::primitives::AccountId::from([3u8; 32]);
        
        let result = manager.configure_multi_oracle(
            vec![oracle1, oracle2, oracle3],
            2, // Requer 2 de 3
            3600,
        );
        
        assert!(result.is_ok());
        assert!(manager.is_multi_oracle_enabled());
        assert_eq!(manager.get_multi_oracle_config().required_confirmations, 2);
        assert_eq!(manager.get_multi_oracle_config().oracles.len(), 3);
    }

    #[test]
    fn configure_multi_oracle_fails_with_less_than_2_oracles() {
        let mut manager = SolanaBridgeManager::new();
        let oracle1 = ink::primitives::AccountId::from([1u8; 32]);
        
        let result = manager.configure_multi_oracle(
            vec![oracle1],
            2,
            3600,
        );
        
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Multi-oracle requires at least 2 oracles");
    }

    #[test]
    fn configure_multi_oracle_fails_with_duplicate_oracles() {
        let mut manager = SolanaBridgeManager::new();
        let oracle1 = ink::primitives::AccountId::from([1u8; 32]);
        
        let result = manager.configure_multi_oracle(
            vec![oracle1, oracle1], // Duplicado
            2,
            3600,
        );
        
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Duplicate oracle address");
    }

    #[test]
    fn multi_oracle_confirmation_flow_works() {
        let mut manager = SolanaBridgeManager::new();
        let oracle1 = ink::primitives::AccountId::from([1u8; 32]);
        let oracle2 = ink::primitives::AccountId::from([2u8; 32]);
        let oracle3 = ink::primitives::AccountId::from([3u8; 32]);
        
        // Configurar multi-oracle (2 de 3)
        manager.configure_multi_oracle(
            vec![oracle1, oracle2, oracle3],
            2,
            3600,
        ).unwrap();
        
        let tx_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih".to_string();
        let sender = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string();
        let amount = 1_000_000u64; // 1 USDT
        let current_time = 1000000u64;
        
        // Iniciar pagamento
        manager.initiate_multi_oracle_payment(
            tx_hash.clone(),
            sender.clone(),
            amount,
            current_time,
        ).unwrap();
        
        // Primeira confirmação (oracle1) - não completa ainda
        let result1 = manager.oracle_confirm_payment(
            tx_hash.clone(),
            amount,
            oracle1,
            current_time + 100,
        );
        assert!(result1.is_ok());
        assert!(!result1.unwrap()); // false = não completou ainda
        
        // Segunda confirmação (oracle2) - completa!
        let result2 = manager.oracle_confirm_payment(
            tx_hash.clone(),
            amount,
            oracle2,
            current_time + 200,
        );
        assert!(result2.is_ok());
        assert!(result2.unwrap()); // true = completou!
        
        // Verificar status
        let status = manager.get_pending_payment_status(&tx_hash);
        assert!(status.is_some());
        let (confirmations, required, finalized) = status.unwrap();
        assert_eq!(confirmations, 2);
        assert_eq!(required, 2);
        assert!(finalized);
    }

    #[test]
    fn multi_oracle_rejects_duplicate_confirmation() {
        let mut manager = SolanaBridgeManager::new();
        let oracle1 = ink::primitives::AccountId::from([1u8; 32]);
        let oracle2 = ink::primitives::AccountId::from([2u8; 32]);
        
        manager.configure_multi_oracle(
            vec![oracle1, oracle2],
            2,
            3600,
        ).unwrap();
        
        let tx_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih".to_string();
        
        manager.initiate_multi_oracle_payment(
            tx_hash.clone(),
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string(),
            1_000_000,
            1000000,
        ).unwrap();
        
        // Primeira confirmação
        manager.oracle_confirm_payment(tx_hash.clone(), 1_000_000, oracle1, 1000100).unwrap();
        
        // Segunda confirmação do MESMO oracle - deve falhar
        let result = manager.oracle_confirm_payment(tx_hash.clone(), 1_000_000, oracle1, 1000200);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Oracle already confirmed");
    }

    #[test]
    fn multi_oracle_rejects_unauthorized_oracle() {
        let mut manager = SolanaBridgeManager::new();
        let oracle1 = ink::primitives::AccountId::from([1u8; 32]);
        let oracle2 = ink::primitives::AccountId::from([2u8; 32]);
        let unauthorized = ink::primitives::AccountId::from([99u8; 32]);
        
        manager.configure_multi_oracle(
            vec![oracle1, oracle2],
            2,
            3600,
        ).unwrap();
        
        let tx_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih".to_string();
        
        manager.initiate_multi_oracle_payment(
            tx_hash.clone(),
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string(),
            1_000_000,
            1000000,
        ).unwrap();
        
        // Oracle não autorizado tenta confirmar
        let result = manager.oracle_confirm_payment(tx_hash.clone(), 1_000_000, unauthorized, 1000100);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Unauthorized oracle");
    }

    #[test]
    fn multi_oracle_rejects_wrong_amount() {
        let mut manager = SolanaBridgeManager::new();
        let oracle1 = ink::primitives::AccountId::from([1u8; 32]);
        let oracle2 = ink::primitives::AccountId::from([2u8; 32]);
        
        manager.configure_multi_oracle(
            vec![oracle1, oracle2],
            2,
            3600,
        ).unwrap();
        
        let tx_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih".to_string();
        
        manager.initiate_multi_oracle_payment(
            tx_hash.clone(),
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string(),
            1_000_000, // Esperado: 1 USDT
            1000000,
        ).unwrap();
        
        // Oracle tenta confirmar com valor errado (50% diferente)
        let result = manager.oracle_confirm_payment(tx_hash.clone(), 500_000, oracle1, 1000100);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Amount mismatch");
    }

    #[test]
    fn is_authorized_oracle_works_in_both_modes() {
        let mut manager = SolanaBridgeManager::new();
        let single_oracle = ink::primitives::AccountId::from([0u8; 32]); // Oracle padrão
        let multi_oracle1 = ink::primitives::AccountId::from([1u8; 32]);
        let multi_oracle2 = ink::primitives::AccountId::from([2u8; 32]);
        let unauthorized = ink::primitives::AccountId::from([99u8; 32]);
        
        // Modo single-oracle
        assert!(manager.is_authorized_oracle(single_oracle));
        assert!(!manager.is_authorized_oracle(multi_oracle1));
        
        // Ativar multi-oracle
        manager.configure_multi_oracle(
            vec![multi_oracle1, multi_oracle2],
            2,
            3600,
        ).unwrap();
        
        // Agora ambos single e multi oracles são autorizados
        assert!(manager.is_authorized_oracle(single_oracle)); // Single ainda funciona
        assert!(manager.is_authorized_oracle(multi_oracle1)); // Multi também
        assert!(manager.is_authorized_oracle(multi_oracle2));
        assert!(!manager.is_authorized_oracle(unauthorized));
    }
}