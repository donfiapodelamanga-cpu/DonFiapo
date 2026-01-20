//! # Fiapo Security Contract
//!
//! Contrato de segurança compartilhado para o ecossistema Don Fiapo.
//! Fornece proteções contra reentrância, rate limiting e validações.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance, SecurityError};

#[ink::contract]
mod fiapo_security {
    use super::*;
    use ink::prelude::string::String;
    use ink::storage::Mapping;

    /// Constantes de segurança
    pub const MAX_OPERATIONS_PER_BLOCK: u32 = 10;
    pub const RATE_LIMIT_WINDOW_MS: u64 = 60_000; // 1 minuto
    pub const MAX_OPERATIONS_PER_WINDOW: u32 = 100;

    /// Status de reentrância
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum ReentrancyStatus {
        #[default]
        NotEntered,
        Entered,
    }

    /// Configuração de rate limiting por conta
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct RateLimitInfo {
        pub operation_count: u32,
        pub window_start: u64,
        pub last_operation: u64,
    }

    /// Configuração de segurança global
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct SecurityConfig {
        pub reentrancy_enabled: bool,
        pub rate_limiting_enabled: bool,
        pub max_ops_per_window: u32,
        pub window_duration_ms: u64,
        pub emergency_pause: bool,
    }

    impl Default for SecurityConfig {
        fn default() -> Self {
            Self {
                reentrancy_enabled: true,
                rate_limiting_enabled: true,
                max_ops_per_window: MAX_OPERATIONS_PER_WINDOW,
                window_duration_ms: RATE_LIMIT_WINDOW_MS,
                emergency_pause: false,
            }
        }
    }

    /// Evento de operação bloqueada
    #[ink(event)]
    pub struct OperationBlocked {
        #[ink(topic)]
        account: AccountId,
        reason: String,
        timestamp: u64,
    }

    /// Evento de pausa de emergência
    #[ink(event)]
    pub struct EmergencyPauseToggled {
        paused: bool,
        by: AccountId,
    }

    #[ink(storage)]
    pub struct FiapoSecurity {
        owner: AccountId,
        /// Contratos autorizados a usar este serviço
        authorized_contracts: Mapping<AccountId, bool>,
        /// Status de reentrância por contrato
        reentrancy_status: Mapping<AccountId, ReentrancyStatus>,
        /// Rate limiting por conta
        rate_limits: Mapping<AccountId, RateLimitInfo>,
        /// Configuração global
        config: SecurityConfig,
        /// Contas na whitelist (sem rate limiting)
        whitelist: Mapping<AccountId, bool>,
        /// Contas na blacklist (bloqueadas)
        blacklist: Mapping<AccountId, bool>,
        /// Total de operações bloqueadas
        total_blocked: u64,
    }

    impl FiapoSecurity {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                owner: Self::env().caller(),
                authorized_contracts: Mapping::default(),
                reentrancy_status: Mapping::default(),
                rate_limits: Mapping::default(),
                config: SecurityConfig::default(),
                whitelist: Mapping::default(),
                blacklist: Mapping::default(),
                total_blocked: 0,
            }
        }

        // ==================== View Functions ====================

        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }

        #[ink(message)]
        pub fn get_config(&self) -> SecurityConfig {
            self.config.clone()
        }

        #[ink(message)]
        pub fn is_authorized(&self, contract: AccountId) -> bool {
            self.authorized_contracts.get(contract).unwrap_or(false)
        }

        #[ink(message)]
        pub fn is_whitelisted(&self, account: AccountId) -> bool {
            self.whitelist.get(account).unwrap_or(false)
        }

        #[ink(message)]
        pub fn is_blacklisted(&self, account: AccountId) -> bool {
            self.blacklist.get(account).unwrap_or(false)
        }

        #[ink(message)]
        pub fn is_paused(&self) -> bool {
            self.config.emergency_pause
        }

        #[ink(message)]
        pub fn get_rate_limit_info(&self, account: AccountId) -> RateLimitInfo {
            self.rate_limits.get(account).unwrap_or_default()
        }

        // ==================== Reentrancy Guard ====================

        /// Inicia proteção contra reentrância para um contrato
        #[ink(message)]
        pub fn enter_guard(&mut self, contract: AccountId) -> Result<(), SecurityError> {
            if !self.config.reentrancy_enabled {
                return Ok(());
            }

            let status = self.reentrancy_status.get(contract).unwrap_or_default();
            if status == ReentrancyStatus::Entered {
                self.total_blocked += 1;
                Self::env().emit_event(OperationBlocked {
                    account: contract,
                    reason: String::from("Reentrancy detected"),
                    timestamp: self.env().block_timestamp(),
                });
                return Err(SecurityError::ReentrancyDetected);
            }

            self.reentrancy_status.insert(contract, &ReentrancyStatus::Entered);
            Ok(())
        }

        /// Finaliza proteção contra reentrância
        #[ink(message)]
        pub fn exit_guard(&mut self, contract: AccountId) {
            self.reentrancy_status.insert(contract, &ReentrancyStatus::NotEntered);
        }

        // ==================== Rate Limiting ====================

        /// Verifica e atualiza rate limit para uma conta
        #[ink(message)]
        pub fn check_rate_limit(&mut self, account: AccountId) -> Result<(), SecurityError> {
            if !self.config.rate_limiting_enabled {
                return Ok(());
            }

            // Whitelist bypassa rate limiting
            if self.whitelist.get(account).unwrap_or(false) {
                return Ok(());
            }

            // Blacklist bloqueia sempre
            if self.blacklist.get(account).unwrap_or(false) {
                return Err(SecurityError::Unauthorized);
            }

            let current_time = self.env().block_timestamp();
            let mut info = self.rate_limits.get(account).unwrap_or_default();

            // Reset se janela expirou
            if current_time > info.window_start + self.config.window_duration_ms {
                info.window_start = current_time;
                info.operation_count = 0;
            }

            // Verifica limite
            if info.operation_count >= self.config.max_ops_per_window {
                self.total_blocked += 1;
                Self::env().emit_event(OperationBlocked {
                    account,
                    reason: String::from("Rate limit exceeded"),
                    timestamp: current_time,
                });
                return Err(SecurityError::RateLimitExceeded);
            }

            // Atualiza contagem
            info.operation_count += 1;
            info.last_operation = current_time;
            self.rate_limits.insert(account, &info);

            Ok(())
        }

        // ==================== Validation Functions ====================

        /// Valida endereço não-zero
        #[ink(message)]
        pub fn validate_address(&self, address: AccountId) -> Result<(), SecurityError> {
            if address == AccountId::from([0u8; 32]) {
                return Err(SecurityError::ZeroAddress);
            }
            Ok(())
        }

        /// Valida valor positivo
        #[ink(message)]
        pub fn validate_amount(&self, amount: Balance) -> Result<(), SecurityError> {
            if amount == 0 {
                return Err(SecurityError::InvalidAmount);
            }
            Ok(())
        }

        /// Valida range
        #[ink(message)]
        pub fn validate_range(&self, value: Balance, min: Balance, max: Balance) -> Result<(), SecurityError> {
            if value < min || value > max {
                return Err(SecurityError::InvalidInput);
            }
            Ok(())
        }

        /// Verifica se sistema está pausado
        #[ink(message)]
        pub fn require_not_paused(&self) -> Result<(), SecurityError> {
            if self.config.emergency_pause {
                return Err(SecurityError::SystemPaused);
            }
            Ok(())
        }

        // ==================== Admin Functions ====================

        /// Autoriza um contrato a usar este serviço
        #[ink(message)]
        pub fn authorize_contract(&mut self, contract: AccountId) -> Result<(), SecurityError> {
            self.ensure_owner()?;
            self.authorized_contracts.insert(contract, &true);
            Ok(())
        }

        /// Remove autorização de um contrato
        #[ink(message)]
        pub fn revoke_contract(&mut self, contract: AccountId) -> Result<(), SecurityError> {
            self.ensure_owner()?;
            self.authorized_contracts.insert(contract, &false);
            Ok(())
        }

        /// Adiciona conta à whitelist
        #[ink(message)]
        pub fn add_to_whitelist(&mut self, account: AccountId) -> Result<(), SecurityError> {
            self.ensure_owner()?;
            self.whitelist.insert(account, &true);
            Ok(())
        }

        /// Remove conta da whitelist
        #[ink(message)]
        pub fn remove_from_whitelist(&mut self, account: AccountId) -> Result<(), SecurityError> {
            self.ensure_owner()?;
            self.whitelist.insert(account, &false);
            Ok(())
        }

        /// Adiciona conta à blacklist
        #[ink(message)]
        pub fn add_to_blacklist(&mut self, account: AccountId) -> Result<(), SecurityError> {
            self.ensure_owner()?;
            self.blacklist.insert(account, &true);
            Ok(())
        }

        /// Remove conta da blacklist
        #[ink(message)]
        pub fn remove_from_blacklist(&mut self, account: AccountId) -> Result<(), SecurityError> {
            self.ensure_owner()?;
            self.blacklist.insert(account, &false);
            Ok(())
        }

        /// Ativa/desativa pausa de emergência
        #[ink(message)]
        pub fn toggle_emergency_pause(&mut self, paused: bool) -> Result<(), SecurityError> {
            self.ensure_owner()?;
            self.config.emergency_pause = paused;
            Self::env().emit_event(EmergencyPauseToggled {
                paused,
                by: self.env().caller(),
            });
            Ok(())
        }

        /// Atualiza configuração
        #[ink(message)]
        pub fn update_config(&mut self, config: SecurityConfig) -> Result<(), SecurityError> {
            self.ensure_owner()?;
            self.config = config;
            Ok(())
        }

        // ==================== Internal Functions ====================

        fn ensure_owner(&self) -> Result<(), SecurityError> {
            if self.env().caller() != self.owner {
                return Err(SecurityError::Unauthorized);
            }
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn constructor_works() {
            let contract = FiapoSecurity::new();
            assert!(!contract.is_paused());
            assert!(contract.get_config().reentrancy_enabled);
        }

        #[ink::test]
        fn reentrancy_guard_works() {
            let mut contract = FiapoSecurity::new();
            let test_contract = AccountId::from([1u8; 32]);

            // Primeiro enter deve funcionar
            assert!(contract.enter_guard(test_contract).is_ok());

            // Segundo enter deve falhar (reentrância)
            assert_eq!(
                contract.enter_guard(test_contract),
                Err(SecurityError::ReentrancyDetected)
            );

            // Após exit, deve funcionar novamente
            contract.exit_guard(test_contract);
            assert!(contract.enter_guard(test_contract).is_ok());
        }

        #[ink::test]
        fn rate_limiting_works() {
            let mut contract = FiapoSecurity::new();
            let user = AccountId::from([2u8; 32]);

            // Reduz limite para testar
            contract.config.max_ops_per_window = 3;

            // Primeiras operações devem passar
            assert!(contract.check_rate_limit(user).is_ok());
            assert!(contract.check_rate_limit(user).is_ok());
            assert!(contract.check_rate_limit(user).is_ok());

            // Quarta operação deve falhar
            assert_eq!(
                contract.check_rate_limit(user),
                Err(SecurityError::RateLimitExceeded)
            );
        }

        #[ink::test]
        fn whitelist_bypasses_rate_limit() {
            let mut contract = FiapoSecurity::new();
            let user = AccountId::from([3u8; 32]);

            contract.config.max_ops_per_window = 1;
            contract.whitelist.insert(user, &true);

            // Whitelist deve bypassar rate limiting
            assert!(contract.check_rate_limit(user).is_ok());
            assert!(contract.check_rate_limit(user).is_ok());
            assert!(contract.check_rate_limit(user).is_ok());
        }
    }
}
