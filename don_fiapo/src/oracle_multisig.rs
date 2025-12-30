//! # Sistema de Oracle Multi-Sig
//!
//! Este módulo implementa um sistema de consenso para confirmação de pagamentos
//! externos (Solana USDT). Requer M de N confirmações para processar um pagamento.
//!
//! ## Fluxo
//! 1. Oracle 1 submete confirmação com hash e detalhes
//! 2. Oracle 2 submete confirmação com mesmos dados
//! 3. Após M confirmações idênticas, pagamento é processado automaticamente

use ink::prelude::string::{String, ToString};
use ink::prelude::vec::Vec;
use ink::primitives::AccountId;
use scale::{Decode, Encode};

/// Configuração do sistema Multi-Sig
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct OracleMultiSigConfig {
    /// Lista de oracles autorizados (máximo 5)
    pub oracles: Vec<AccountId>,
    /// Número mínimo de confirmações necessárias
    pub required_confirmations: u8,
    /// Timeout para confirmações pendentes (em milissegundos)
    pub confirmation_timeout_ms: u64,
    /// Se o sistema está ativo
    pub is_active: bool,
}

impl Default for OracleMultiSigConfig {
    fn default() -> Self {
        Self {
            oracles: Vec::new(),
            required_confirmations: 2,
            confirmation_timeout_ms: 3600 * 1000, // 1 hora
            is_active: true,
        }
    }
}

/// Detalhes de um pagamento pendente
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct PendingPayment {
    /// Hash da transação Solana
    pub tx_hash: String,
    /// Endereço do pagador (Solana)
    pub sender_address: String,
    /// Valor em USDT (6 decimais)
    pub amount: u128,
    /// Beneficiário no contrato Lunes
    pub beneficiary: AccountId,
    /// Tipo de pagamento (staking_entry, governance, etc.)
    pub payment_type: String,
    /// Oracles que já confirmaram
    pub confirmations: Vec<AccountId>,
    /// Timestamp da primeira confirmação
    pub created_at: u64,
    /// Status do pagamento
    pub status: PaymentStatus,
}

/// Status de um pagamento pendente
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum PaymentStatus {
    /// Aguardando confirmações
    Pending,
    /// Confirmado e processado
    Confirmed,
    /// Rejeitado (confirmações conflitantes)
    Rejected,
    /// Expirado (timeout)
    Expired,
}

/// Erros do sistema Multi-Sig
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum OracleMultiSigError {
    /// Chamador não é um oracle autorizado
    UnauthorizedOracle,
    /// Sistema Multi-Sig não está ativo
    SystemInactive,
    /// Oracle já confirmou este pagamento
    AlreadyConfirmed,
    /// Pagamento não encontrado
    PaymentNotFound,
    /// Pagamento já foi processado
    PaymentAlreadyProcessed,
    /// Pagamento expirou
    PaymentExpired,
    /// Dados do pagamento não coincidem
    PaymentDataMismatch,
    /// Número máximo de oracles atingido
    MaxOraclesReached,
    /// Oracle já está na lista
    OracleAlreadyExists,
    /// Não pode remover - mínimo necessário
    MinimumOraclesRequired,
    /// Configuração inválida
    InvalidConfiguration,
}

/// Evento emitido quando um pagamento é confirmado por um oracle
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct PaymentConfirmationSubmitted {
    pub tx_hash: String,
    pub oracle: AccountId,
    pub current_confirmations: u8,
    pub required_confirmations: u8,
    pub timestamp: u64,
}

/// Evento emitido quando um pagamento atinge consenso
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct PaymentConsensusReached {
    pub tx_hash: String,
    pub amount: u128,
    pub beneficiary: AccountId,
    pub payment_type: String,
    pub confirmations: Vec<AccountId>,
    pub timestamp: u64,
}

/// Gerenciador do sistema Oracle Multi-Sig
/// Sem Mapping aninhado para compatibilidade com ink! 4.3.0
#[derive(Debug, Clone, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct OracleMultiSig {
    /// Configuração do sistema
    pub config: OracleMultiSigConfig,
    /// Pagamentos pendentes (limitado a 100 para controle de memória)
    pub pending_payments: Vec<PendingPayment>,
    /// Contador de pagamentos processados
    pub processed_count: u64,
    /// Contador de pagamentos rejeitados
    pub rejected_count: u64,
}

// Encode/Decode agora derivados automaticamente

impl Default for OracleMultiSig {
    fn default() -> Self {
        Self {
            config: OracleMultiSigConfig::default(),
            pending_payments: Vec::new(),
            processed_count: 0,
            rejected_count: 0,
        }
    }
}

impl OracleMultiSig {
    /// Cria um novo gerenciador com configuração customizada
    pub fn new(oracles: Vec<AccountId>, required_confirmations: u8) -> Result<Self, OracleMultiSigError> {
        if oracles.is_empty() {
            return Err(OracleMultiSigError::InvalidConfiguration);
        }
        if required_confirmations == 0 || required_confirmations as usize > oracles.len() {
            return Err(OracleMultiSigError::InvalidConfiguration);
        }
        if oracles.len() > 5 {
            return Err(OracleMultiSigError::MaxOraclesReached);
        }

        Ok(Self {
            config: OracleMultiSigConfig {
                oracles,
                required_confirmations,
                ..Default::default()
            },
            pending_payments: Vec::new(),
            processed_count: 0,
            rejected_count: 0,
        })
    }

    /// Verifica se uma conta é um oracle autorizado
    pub fn is_authorized_oracle(&self, account: &AccountId) -> bool {
        self.config.oracles.contains(account)
    }

    /// Submete uma confirmação de pagamento
    /// Retorna true se consenso foi atingido
    pub fn submit_confirmation(
        &mut self,
        oracle: AccountId,
        tx_hash: String,
        sender_address: String,
        amount: u128,
        beneficiary: AccountId,
        payment_type: String,
        current_time: u64,
    ) -> Result<bool, OracleMultiSigError> {
        // Verificar se é oracle autorizado
        if !self.is_authorized_oracle(&oracle) {
            return Err(OracleMultiSigError::UnauthorizedOracle);
        }

        // Verificar se sistema está ativo
        if !self.config.is_active {
            return Err(OracleMultiSigError::SystemInactive);
        }

        // Buscar pagamento pendente existente
        let existing_idx = self.pending_payments.iter().position(|p| p.tx_hash == tx_hash);
        
        if let Some(idx) = existing_idx {
            let pending = &mut self.pending_payments[idx];
            
            // Verificar timeout
            if current_time.saturating_sub(pending.created_at) > self.config.confirmation_timeout_ms {
                pending.status = PaymentStatus::Expired;
                return Err(OracleMultiSigError::PaymentExpired);
            }

            // Verificar se já foi processado
            if pending.status != PaymentStatus::Pending {
                return Err(OracleMultiSigError::PaymentAlreadyProcessed);
            }

            // Verificar se oracle já confirmou
            if pending.confirmations.contains(&oracle) {
                return Err(OracleMultiSigError::AlreadyConfirmed);
            }

            // Verificar se dados coincidem
            if pending.sender_address != sender_address 
                || pending.amount != amount 
                || pending.beneficiary != beneficiary 
                || pending.payment_type != payment_type 
            {
                pending.status = PaymentStatus::Rejected;
                self.rejected_count = self.rejected_count.saturating_add(1);
                return Err(OracleMultiSigError::PaymentDataMismatch);
            }

            // Adicionar confirmação
            pending.confirmations.push(oracle);

            // Verificar se atingiu consenso
            if pending.confirmations.len() >= self.config.required_confirmations as usize {
                pending.status = PaymentStatus::Confirmed;
                self.processed_count = self.processed_count.saturating_add(1);
                return Ok(true); // Consenso atingido!
            }

            Ok(false)
        } else {
            // Limitar a 100 pagamentos pendentes para controle de memória
            if self.pending_payments.len() >= 100 {
                // Remover pagamentos antigos confirmados/rejeitados/expirados
                self.pending_payments.retain(|p| p.status == PaymentStatus::Pending);
            }
            
            // Criar novo pagamento pendente
            let pending = PendingPayment {
                tx_hash,
                sender_address,
                amount,
                beneficiary,
                payment_type,
                confirmations: ink::prelude::vec![oracle],
                created_at: current_time,
                status: PaymentStatus::Pending,
            };

            self.pending_payments.push(pending);

            // Se requer apenas 1 confirmação, já está pronto
            if self.config.required_confirmations == 1 {
                if let Some(last) = self.pending_payments.last_mut() {
                    last.status = PaymentStatus::Confirmed;
                }
                self.processed_count = self.processed_count.saturating_add(1);
                return Ok(true);
            }

            Ok(false)
        }
    }


    /// Adiciona um novo oracle à lista
    pub fn add_oracle(&mut self, caller: AccountId, owner: AccountId, new_oracle: AccountId) -> Result<(), OracleMultiSigError> {
        if caller != owner {
            return Err(OracleMultiSigError::UnauthorizedOracle);
        }
        if self.config.oracles.len() >= 5 {
            return Err(OracleMultiSigError::MaxOraclesReached);
        }
        if self.config.oracles.contains(&new_oracle) {
            return Err(OracleMultiSigError::OracleAlreadyExists);
        }

        self.config.oracles.push(new_oracle);
        Ok(())
    }

    /// Remove um oracle da lista
    pub fn remove_oracle(&mut self, caller: AccountId, owner: AccountId, oracle_to_remove: AccountId) -> Result<(), OracleMultiSigError> {
        if caller != owner {
            return Err(OracleMultiSigError::UnauthorizedOracle);
        }
        
        // Garantir que sobram oracles suficientes
        if self.config.oracles.len() <= self.config.required_confirmations as usize {
            return Err(OracleMultiSigError::MinimumOraclesRequired);
        }

        self.config.oracles.retain(|o| *o != oracle_to_remove);
        Ok(())
    }

    /// Obtém status de um pagamento
    pub fn get_payment_status(&self, tx_hash: &str) -> Option<PendingPayment> {
        self.pending_payments.iter().find(|p| p.tx_hash == tx_hash).cloned()
    }

    /// Obtém lista de oracles
    pub fn get_oracles(&self) -> Vec<AccountId> {
        self.config.oracles.clone()
    }

    /// Obtém estatísticas do sistema
    pub fn get_stats(&self) -> (u64, u64, u8, u8) {
        (
            self.processed_count,
            self.rejected_count,
            self.config.oracles.len() as u8,
            self.config.required_confirmations,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_account(seed: u8) -> AccountId {
        let mut bytes = [0u8; 32];
        bytes[0] = seed;
        AccountId::from(bytes)
    }

    #[ink::test]
    fn new_multisig_works() {
        let oracles = vec![create_test_account(1), create_test_account(2), create_test_account(3)];
        let multisig = OracleMultiSig::new(oracles.clone(), 2).unwrap();
        
        assert_eq!(multisig.config.oracles.len(), 3);
        assert_eq!(multisig.config.required_confirmations, 2);
        assert!(multisig.config.is_active);
    }

    #[ink::test]
    fn invalid_config_rejected() {
        // Sem oracles
        assert!(OracleMultiSig::new(vec![], 1).is_err());
        
        // Required > oracles
        let oracles = vec![create_test_account(1)];
        assert!(OracleMultiSig::new(oracles, 2).is_err());
    }

    #[ink::test]
    fn single_confirmation_not_enough() {
        let oracles = vec![create_test_account(1), create_test_account(2), create_test_account(3)];
        let mut multisig = OracleMultiSig::new(oracles.clone(), 2).unwrap();

        let result = multisig.submit_confirmation(
            create_test_account(1),
            "hash123".to_string(),
            "sender123".to_string(),
            1000,
            create_test_account(10),
            "staking_entry".to_string(),
            1000,
        ).unwrap();

        assert!(!result); // Não atingiu consenso ainda
    }

    #[ink::test]
    fn two_confirmations_reach_consensus() {
        let oracles = vec![create_test_account(1), create_test_account(2), create_test_account(3)];
        let mut multisig = OracleMultiSig::new(oracles.clone(), 2).unwrap();

        // Primeira confirmação
        let result1 = multisig.submit_confirmation(
            create_test_account(1),
            "hash123".to_string(),
            "sender123".to_string(),
            1000,
            create_test_account(10),
            "staking_entry".to_string(),
            1000,
        ).unwrap();
        assert!(!result1);

        // Segunda confirmação
        let result2 = multisig.submit_confirmation(
            create_test_account(2),
            "hash123".to_string(),
            "sender123".to_string(),
            1000,
            create_test_account(10),
            "staking_entry".to_string(),
            1000,
        ).unwrap();
        assert!(result2); // Consenso atingido!
    }

    #[ink::test]
    fn duplicate_confirmation_rejected() {
        let oracles = vec![create_test_account(1), create_test_account(2)];
        let mut multisig = OracleMultiSig::new(oracles.clone(), 2).unwrap();

        // Primeira confirmação
        multisig.submit_confirmation(
            create_test_account(1),
            "hash123".to_string(),
            "sender123".to_string(),
            1000,
            create_test_account(10),
            "staking_entry".to_string(),
            1000,
        ).unwrap();

        // Mesma oracle tenta confirmar novamente
        let result = multisig.submit_confirmation(
            create_test_account(1),
            "hash123".to_string(),
            "sender123".to_string(),
            1000,
            create_test_account(10),
            "staking_entry".to_string(),
            1000,
        );
        assert_eq!(result, Err(OracleMultiSigError::AlreadyConfirmed));
    }

    #[ink::test]
    fn mismatched_data_rejected() {
        let oracles = vec![create_test_account(1), create_test_account(2)];
        let mut multisig = OracleMultiSig::new(oracles.clone(), 2).unwrap();

        // Primeira confirmação
        multisig.submit_confirmation(
            create_test_account(1),
            "hash123".to_string(),
            "sender123".to_string(),
            1000, // 1000
            create_test_account(10),
            "staking_entry".to_string(),
            1000,
        ).unwrap();

        // Segunda confirmação com valor diferente
        let result = multisig.submit_confirmation(
            create_test_account(2),
            "hash123".to_string(),
            "sender123".to_string(),
            2000, // 2000 - diferente!
            create_test_account(10),
            "staking_entry".to_string(),
            1000,
        );
        assert_eq!(result, Err(OracleMultiSigError::PaymentDataMismatch));
    }

    #[ink::test]
    fn unauthorized_oracle_rejected() {
        let oracles = vec![create_test_account(1), create_test_account(2)];
        let mut multisig = OracleMultiSig::new(oracles.clone(), 2).unwrap();

        // Oracle não autorizado tenta confirmar
        let result = multisig.submit_confirmation(
            create_test_account(99), // Não está na lista
            "hash123".to_string(),
            "sender123".to_string(),
            1000,
            create_test_account(10),
            "staking_entry".to_string(),
            1000,
        );
        assert_eq!(result, Err(OracleMultiSigError::UnauthorizedOracle));
    }
}
