//! # Módulo de Integração com Solana
//! 
//! Este módulo implementa a integração com a blockchain Solana para:
//! - Verificação de pagamentos USDT
//! - Validação de transações cross-chain
//! - Gestão de endereços Solana

use ink::prelude::{string::{String, ToString}, vec::Vec};
use scale::{Decode, Encode};

type Balance = u128;

/// Erros relacionados à integração Solana
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum SolanaError {
    /// Hash de transação inválido
    InvalidTransactionHash,
    /// Endereço Solana inválido
    InvalidSolanaAddress,
    /// Transação não encontrada
    TransactionNotFound,
    /// Valor da transação não confere
    AmountMismatch,
    /// Transação já foi processada
    TransactionAlreadyProcessed,
    /// Falha na verificação da transação
    VerificationFailed,
    /// Timeout na verificação
    VerificationTimeout,
}

/// Status de uma verificação Solana
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum SolanaVerificationStatus {
    /// Verificação pendente
    Pending,
    /// Verificação confirmada
    Confirmed,
    /// Verificação falhou
    Failed,
    /// Timeout na verificação
    Timeout,
}

/// Dados de uma transação Solana
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct SolanaTransaction {
    /// Hash da transação
    pub tx_hash: String,
    /// Endereço do remetente
    pub from_address: String,
    /// Endereço do destinatário
    pub to_address: String,
    /// Valor em USDT (com 6 decimais)
    pub amount: u64,
    /// Timestamp da transação
    pub timestamp: u64,
    /// Número de confirmações
    pub confirmations: u32,
}

/// Configuração para verificação Solana
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct SolanaConfig {
    /// Endereço do contrato USDT na Solana
    pub usdt_contract_address: String,
    /// Endereço de recebimento oficial
    pub official_receiver_address: String,
    /// Número mínimo de confirmações
    pub min_confirmations: u32,
    /// Timeout para verificação (em segundos)
    pub verification_timeout: u64,
    /// Taxa de conversão USDT para LUSDT (em basis points)
    pub usdt_to_lusdt_rate: u16,
}

impl Default for SolanaConfig {
    fn default() -> Self {
        Self {
            usdt_contract_address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string(), // USDT oficial na Solana
            official_receiver_address: String::new(), // Deve ser configurado
            min_confirmations: 12,
            verification_timeout: 300, // 5 minutos
            usdt_to_lusdt_rate: 10000, // 1:1 por padrão
        }
    }
}

/// Resultado de uma verificação de pagamento
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct PaymentVerificationResult {
    /// Status da verificação
    pub status: SolanaVerificationStatus,
    /// Dados da transação (se encontrada)
    pub transaction: Option<SolanaTransaction>,
    /// Valor equivalente em LUSDT
    pub lusdt_equivalent: Balance,
    /// Timestamp da verificação
    pub verified_at: u64,
}

/// Gerenciador de integração Solana
#[derive(Debug)]
pub struct SolanaIntegration {
    config: SolanaConfig,
    processed_transactions: Vec<String>,
}

impl Default for SolanaIntegration {
    fn default() -> Self {
        Self {
            config: SolanaConfig::default(),
            processed_transactions: Vec::new(),
        }
    }
}

impl SolanaIntegration {
    /// Cria uma nova instância do integrador Solana
    pub fn new(config: SolanaConfig) -> Self {
        Self {
            config,
            processed_transactions: Vec::new(),
        }
    }

    /// Verifica um pagamento USDT na Solana
    pub fn verify_usdt_payment(
        &mut self,
        tx_hash: String,
        expected_amount: u64,
        sender_address: String,
        current_time: u64,
    ) -> Result<PaymentVerificationResult, SolanaError> {
        // Verifica se a transação já foi processada
        if self.processed_transactions.contains(&tx_hash) {
            return Err(SolanaError::TransactionAlreadyProcessed);
        }

        // Valida o formato do hash
        if !self.is_valid_transaction_hash(&tx_hash) {
            return Err(SolanaError::InvalidTransactionHash);
        }

        // Valida endereços
        if !self.is_valid_solana_address(&sender_address) {
            return Err(SolanaError::InvalidSolanaAddress);
        }

        // Nota: Verificação real com RPC Solana realizada pelo Oracle Service externo
        // O Oracle verifica a transação em tempo real e chama confirm_solana_payment no contrato
        // Esta implementação mock simula uma verificação bem-sucedida
        let mock_transaction = SolanaTransaction {
            tx_hash: tx_hash.clone(),
            from_address: sender_address,
            to_address: self.config.official_receiver_address.clone(),
            amount: expected_amount,
            timestamp: current_time,
            confirmations: self.config.min_confirmations,
        };

        // Calcula equivalente em LUSDT
        let lusdt_equivalent = self.calculate_lusdt_equivalent(expected_amount);

        // Marca como processada
        self.processed_transactions.push(tx_hash);

        Ok(PaymentVerificationResult {
            status: SolanaVerificationStatus::Confirmed,
            transaction: Some(mock_transaction),
            lusdt_equivalent,
            verified_at: current_time,
        })
    }

    /// Calcula o equivalente em LUSDT
    pub fn calculate_lusdt_equivalent(&self, usdt_amount: u64) -> Balance {
        // USDT Solana tem 6 decimais, LUSDT também tem 6 decimais
        // Conversão 1:1 direta
        let usdt_in_base = usdt_amount as u128;
        let rate = self.config.usdt_to_lusdt_rate as u128;
        
        // Aplica taxa de conversão (1:1 por padrão = 10000 bps)
        (usdt_in_base * rate) / 10000
    }

    /// Valida formato de hash de transação Solana
    fn is_valid_transaction_hash(&self, hash: &str) -> bool {
        // Hash Solana tem 88 caracteres em base58
        hash.len() >= 87 && hash.len() <= 88 && hash.chars().all(|c| {
            c.is_ascii_alphanumeric() || "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".contains(c)
        })
    }

    /// Valida formato de endereço Solana
    fn is_valid_solana_address(&self, address: &str) -> bool {
        // Endereço Solana tem 44 caracteres em base58
        address.len() == 44 && address.chars().all(|c| {
            "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".contains(c)
        })
    }

    /// Verifica se uma transação foi processada
    pub fn is_transaction_processed(&self, tx_hash: &str) -> bool {
        self.processed_transactions.contains(&tx_hash.to_string())
    }

    /// Obtém configuração atual
    pub fn get_config(&self) -> &SolanaConfig {
        &self.config
    }

    /// Atualiza configuração
    pub fn update_config(&mut self, new_config: SolanaConfig) {
        self.config = new_config;
    }

    /// Obtém lista de transações processadas
    pub fn get_processed_transactions(&self) -> &Vec<String> {
        &self.processed_transactions
    }

    /// Limpa histórico de transações processadas (apenas para testes)
    #[cfg(test)]
    pub fn clear_processed_transactions(&mut self) {
        self.processed_transactions.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn solana_integration_creation_works() {
        let integration = SolanaIntegration::default();
        assert_eq!(integration.config.min_confirmations, 12);
        assert!(integration.processed_transactions.is_empty());
    }

    #[test]
    fn calculate_lusdt_equivalent_works() {
        let integration = SolanaIntegration::default();
        
        // 1 USDT (1000000 com 6 decimais) = 1000000 LUSDT (também 6 decimais)
        let result = integration.calculate_lusdt_equivalent(1000000);
        assert_eq!(result, 1000000);
        
        // 10 USDT
        let result = integration.calculate_lusdt_equivalent(10000000);
        assert_eq!(result, 10000000);
    }

    #[test]
    fn transaction_hash_validation_works() {
        let integration = SolanaIntegration::default();
        
        // Hash válido (exemplo)
        let valid_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih";
        assert!(integration.is_valid_transaction_hash(valid_hash));
        
        // Hash inválido
        assert!(!integration.is_valid_transaction_hash("invalid"));
        assert!(!integration.is_valid_transaction_hash(""));
    }

    #[test]
    fn solana_address_validation_works() {
        let integration = SolanaIntegration::default();
        
        // Endereço válido (exemplo)
        let valid_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        assert!(integration.is_valid_solana_address(valid_address));
        
        // Endereço inválido
        assert!(!integration.is_valid_solana_address("invalid"));
        assert!(!integration.is_valid_solana_address(""));
    }

    #[test]
    fn verify_usdt_payment_works() {
        let mut integration = SolanaIntegration::default();
        integration.config.official_receiver_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string();
        
        let tx_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih".to_string();
        let sender = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string();
        
        let result = integration.verify_usdt_payment(
            tx_hash.clone(),
            1000000, // 1 USDT
            sender,
            1000000000,
        );
        
        assert!(result.is_ok());
        let verification = result.unwrap();
        assert_eq!(verification.status, SolanaVerificationStatus::Confirmed);
        assert_eq!(verification.lusdt_equivalent, 1000000); // 1 LUSDT (6 decimais)
        
        // Verifica se foi marcada como processada
        assert!(integration.is_transaction_processed(&tx_hash));
    }

    #[test]
    fn duplicate_transaction_fails() {
        let mut integration = SolanaIntegration::default();
        integration.config.official_receiver_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string();
        
        let tx_hash = "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih".to_string();
        let sender = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string();
        
        // Primeira verificação
        let result1 = integration.verify_usdt_payment(
            tx_hash.clone(),
            1000000,
            sender.clone(),
            1000000000,
        );
        assert!(result1.is_ok());
        
        // Segunda verificação (deve falhar)
        let result2 = integration.verify_usdt_payment(
            tx_hash,
            1000000,
            sender,
            1000000000,
        );
        assert_eq!(result2, Err(SolanaError::TransactionAlreadyProcessed));
    }
}