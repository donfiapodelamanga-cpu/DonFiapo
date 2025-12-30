//! Módulo de Segurança para Don Fiapo
//!
//! Este módulo fornece funcionalidades de segurança sem depender do OpenBrush,
//! implementando proteções contra vulnerabilidades comuns em smart contracts.
//!
//! Compatível com ink! 4.3.0

use ink::primitives::AccountId;
use ink::storage::Mapping;
use scale::{Decode, Encode};

/// Erros de segurança
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum SecurityError {
    IntegerOverflow,
    IntegerUnderflow,
    DivisionByZero,
    ReentrancyDetected,
    InvalidInput,
    ZeroAddress,
    InvalidAmount,
    InvalidAddress,
    Unauthorized,
    SystemPaused,
    RateLimitExceeded,
    CriticalOperationInProgress,
}

/// Sistema de limitação de taxa para operações críticas
/// Compatível com ink! 4.3.0 - usando SpreadAllocate
#[derive(Debug, Default)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RateLimiter {
    /// Mapeamento de conta para timestamp da última operação
    last_operation: Mapping<AccountId, u64>,
    /// Intervalo mínimo entre operações (em segundos)
    min_interval: u64,
}

impl RateLimiter {
    /// Cria um novo limitador de taxa
    pub fn new(min_interval_seconds: u64) -> Self {
        Self {
            last_operation: ink::storage::Mapping::default(),
            min_interval: min_interval_seconds,
        }
    }
    
    /// Verifica se uma operação pode ser executada
    pub fn can_execute(&self, account: &ink::primitives::AccountId, current_time: u64) -> bool {
        if let Some(last_time) = self.last_operation.get(account) {
            current_time >= last_time.saturating_add(self.min_interval)
        } else {
            true
        }
    }
    
    /// Registra uma operação executada
    pub fn record_operation(&mut self, account: &ink::primitives::AccountId, current_time: u64) {
        self.last_operation.insert(account, &current_time);
    }
    
    /// Executa uma operação com limitação de taxa
    pub fn execute_with_limit<F, R>(
        &mut self,
        account: &ink::primitives::AccountId,
        current_time: u64,
        operation: F,
    ) -> Result<R, SecurityError>
    where
        F: FnOnce() -> Result<R, SecurityError>,
    {
        if !self.can_execute(account, current_time) {
            return Err(SecurityError::RateLimitExceeded);
        }
        
        let result = operation()?;
        self.record_operation(account, current_time);
        
        Ok(result)
    }
}

/// Sistema de proteção contra reentrancy
/// Compatível com ink! 4.3.0
#[derive(Debug, Default, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ReentrancyGuard {
    /// Flag para detectar reentrancy
    locked: bool,
}

impl ReentrancyGuard {
    /// Cria uma nova instância do guard
    pub fn new() -> Self {
        Self { locked: false }
    }
    
    /// Executa uma operação crítica protegida contra reentrancy
    pub fn execute_critical<F, R>(&mut self, operation: F) -> Result<R, SecurityError>
    where
        F: FnOnce() -> Result<R, SecurityError>,
    {
        if self.locked {
            return Err(SecurityError::ReentrancyDetected);
        }
        
        self.locked = true;
        let result = operation();
        self.locked = false;
        
        result
    }
    
    /// Verifica se uma operação crítica está em andamento
    pub fn is_locked(&self) -> bool {
        self.locked
    }

    /// Verifica se não há reentrancy
    pub fn check_non_reentrant(&self) -> Result<(), SecurityError> {
        if self.locked {
            return Err(SecurityError::ReentrancyDetected);
        }
        Ok(())
    }

    /// Bloqueia para prevenir reentrancy
    pub fn lock(&mut self) {
        self.locked = true;
    }

    /// Desbloqueia após operação
    pub fn unlock(&mut self) {
        self.locked = false;
    }

    /// Executa função com proteção contra reentrancy
    pub fn with_guard<F, R>(&mut self, func: F) -> Result<R, SecurityError>
    where
        F: FnOnce() -> Result<R, SecurityError>,
    {
        self.check_non_reentrant()?;
        self.lock();
        
        let result = func();
        
        self.unlock();
        result
    }
}

/// Validações de segurança para operações matemáticas
pub struct MathValidator;

impl MathValidator {
    /// Verifica se a adição não causa overflow
    pub fn safe_add(a: u128, b: u128) -> Result<u128, SecurityError> {
        a.checked_add(b).ok_or(SecurityError::IntegerOverflow)
    }

    /// Verifica se a subtração não causa underflow
    pub fn safe_sub(a: u128, b: u128) -> Result<u128, SecurityError> {
        a.checked_sub(b).ok_or(SecurityError::IntegerUnderflow)
    }

    /// Verifica se a multiplicação não causa overflow
    pub fn safe_mul(a: u128, b: u128) -> Result<u128, SecurityError> {
        a.checked_mul(b).ok_or(SecurityError::IntegerOverflow)
    }

    /// Verifica divisão segura
    pub fn safe_div(dividend: u128, divisor: u128) -> Result<u128, SecurityError> {
        if divisor == 0 {
            return Err(SecurityError::DivisionByZero);
        }
        Ok(dividend / divisor)
    }

    /// Calcula porcentagem de forma segura
    pub fn safe_percentage(value: u128, percentage: u16, base: u16) -> Result<u128, SecurityError> {
        if base == 0 {
            return Err(SecurityError::DivisionByZero);
        }
        Self::safe_mul(value, percentage as u128)
            .and_then(|result| Self::safe_div(result, base as u128))
    }
}

/// Validações de input
pub struct InputValidator;

impl InputValidator {
    /// Valida se um endereço não é zero
    pub fn validate_address(address: &AccountId) -> Result<(), SecurityError> {
        if *address == AccountId::from([0u8; 32]) {
            return Err(SecurityError::InvalidAddress);
        }
        Ok(())
    }

    /// Valida se um endereço não é o próprio contrato
    pub fn validate_not_contract_address(address: &AccountId, contract_address: &AccountId) -> Result<(), SecurityError> {
        if address == contract_address {
            return Err(SecurityError::InvalidAddress);
        }
        Ok(())
    }

    /// Valida múltiplos endereços de uma vez
    pub fn validate_addresses(addresses: &[AccountId]) -> Result<(), SecurityError> {
        for address in addresses {
            Self::validate_address(address)?;
        }
        Ok(())
    }

    /// Valida se endereços são únicos
    pub fn validate_unique_addresses(addresses: &[AccountId]) -> Result<(), SecurityError> {
        for i in 0..addresses.len() {
            for j in i + 1..addresses.len() {
                if addresses[i] == addresses[j] {
                    return Err(SecurityError::InvalidAddress);
                }
            }
        }
        Ok(())
    }

    /// Valida valor positivo
    pub fn validate_positive_amount(amount: u128) -> Result<(), SecurityError> {
        if amount == 0 {
            return Err(SecurityError::InvalidAmount);
        }
        Ok(())
    }

    /// Valida range de valor
    pub fn validate_range(value: u128, min: u128, max: u128) -> Result<(), SecurityError> {
        if value < min || value > max {
            return Err(SecurityError::InvalidInput);
        }
        Ok(())
    }

    /// Valida string não vazia
    pub fn validate_string(input: &str) -> Result<(), SecurityError> {
        if input.trim().is_empty() {
            return Err(SecurityError::InvalidInput);
        }
        Ok(())
    }
}

/// Contexto de segurança para operações críticas
/// Compatível com ink! 4.3.0
#[derive(Debug, Default, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct SecurityContext {
    reentrancy_guard: ReentrancyGuard,
    operation_count: u128,
    last_operation_time: u64,
}

impl SecurityContext {
    pub fn new() -> Self {
        Self {
            reentrancy_guard: ReentrancyGuard::new(),
            operation_count: 0,
            last_operation_time: 0,
        }
    }

    /// Executa operação crítica com todas as proteções
    pub fn execute_critical<F, R>(&mut self, func: F) -> Result<R, SecurityError>
    where
        F: FnOnce() -> Result<R, SecurityError>,
    {
        self.reentrancy_guard.with_guard(func)
    }

    /// Registra operação para tracking
    pub fn record_operation(&mut self, current_time: u64) -> Result<(), SecurityError> {
        self.operation_count = MathValidator::safe_add(self.operation_count, 1)?;
        self.last_operation_time = current_time;
        Ok(())
    }

    /// Verifica taxa de operações (previnde ataques de spam)
    pub fn check_rate_limit(&self, current_time: u64, max_operations: u64, time_window: u64) -> Result<(), SecurityError> {
        if current_time < self.last_operation_time + time_window && self.operation_count >= max_operations as u128 {
            return Err(SecurityError::InvalidInput);
        }
        Ok(())
    }
}

/// Utilitário para validação de timestamps
pub struct TimeValidator;

impl TimeValidator {
    /// Valida se o timestamp é válido (não muito no futuro ou passado)
    pub fn validate_timestamp(timestamp: u64, current_time: u64, tolerance: u64) -> Result<(), SecurityError> {
        if timestamp > current_time + tolerance {
            return Err(SecurityError::InvalidInput);
        }
        if timestamp < current_time.saturating_sub(tolerance) {
            return Err(SecurityError::InvalidInput);
        }
        Ok(())
    }

    /// Valida período de tempo válido
    pub fn validate_period(start: u64, end: u64, min_duration: u64) -> Result<(), SecurityError> {
        if end <= start {
            return Err(SecurityError::InvalidInput);
        }
        
        let duration = end.saturating_sub(start);
        if duration < min_duration {
            return Err(SecurityError::InvalidInput);
        }
        Ok(())
    }
}