//! # Fiapo Oracle Multisig Contract
//!
//! Sistema de consenso multi-oracle para confirmação de pagamentos externos
//! (Solana USDT/SPL). Requer M de N confirmações para processar um pagamento.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::PSP22Error;

#[ink::contract]
mod fiapo_oracle_multisig {
    use super::*;
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    /// Constantes
    pub const MAX_ORACLES: usize = 10;
    pub const MIN_CONFIRMATIONS: u8 = 2;
    pub const PAYMENT_TIMEOUT_MS: u64 = 3600 * 1000; // 1 hora
    pub const MAX_PENDING_PAYMENTS: usize = 1000;

    /// Erros do sistema Oracle
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum OracleError {
        Unauthorized,
        UnauthorizedOracle,
        SystemInactive,
        AlreadyConfirmed,
        PaymentNotFound,
        PaymentAlreadyProcessed,
        PaymentExpired,
        PaymentDataMismatch,
        MaxOraclesReached,
        OracleAlreadyExists,
        MinimumOraclesRequired,
        InvalidConfiguration,
        TooManyPendingPayments,
        CrossContractCallFailed,
        ContractNotConfigured,
    }

    /// Tipo de pagamento/ação a executar
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PaymentType {
        /// Entrada em staking
        StakingEntry,
        /// Compra de NFT no ICO
        NFTPurchase { tier: u8 },
        /// Compra de ticket de loteria
        LotteryTicket { quantity: u32 },
        /// Crédito para jogo Spin
        SpinGameCredit { tier: u8, spins: u32 }, // Updated to include tier and spins
        /// Depósito de governança
        GovernanceDeposit,
        /// Ação customizada
        Custom(String),
    }

    // ... (rest of enum definitions)

    // In process_confirmed_payment match block:
                PaymentType::SpinGameCredit { tier, spins } => {
                    self.call_spin_game_credit(payment.beneficiary, *spins, *tier)?;
                }

    // ...

        fn call_spin_game_credit(&self, user: AccountId, amount: u32, tier: u8) -> Result<(), OracleError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let spin_game = self.spin_game_contract.ok_or(OracleError::ContractNotConfigured)?;

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(spin_game)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("credit_spins")))
                        .push_arg(user)
                        .push_arg(amount) 
                        .push_arg(tier),
                )
                .returns::<Result<(), u8>>() // Assuming SpinGame returns Result<(), Error> which maps to u8 or similar in E2E/interop typically, or just ()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(OracleError::CrossContractCallFailed),
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::prelude::vec;

        #[ink::test]
        fn constructor_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let oracles = vec![accounts.bob, accounts.charlie];
            let contract = FiapoOracleMultisig::new(accounts.django, oracles, 2);
            
            assert!(contract.is_oracle(accounts.bob));
            assert!(contract.is_oracle(accounts.charlie));
            assert!(!contract.is_oracle(accounts.eve));
        }

        #[ink::test]
        fn submit_confirmation_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let oracles = vec![accounts.alice, accounts.bob];
            let mut contract = FiapoOracleMultisig::new(accounts.django, oracles, 2);

            let result = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1_000_000, // 1 USDT
                accounts.eve,
                PaymentType::StakingEntry,
            );

            assert!(result.is_ok());
            assert!(!result.unwrap()); // Ainda não atingiu consenso

            let payment = contract.get_pending_payment(String::from("tx123")).unwrap();
            assert_eq!(payment.confirmations.len(), 1);
        }

        #[ink::test]
        fn consensus_reached() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let oracles = vec![accounts.alice, accounts.bob];
            let mut contract = FiapoOracleMultisig::new(accounts.django, oracles, 2);

            // Primeira confirmação (alice)
            let _ = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1_000_000,
                accounts.eve,
                PaymentType::StakingEntry,
            );

            // Segunda confirmação (bob)
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let result = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1_000_000,
                accounts.eve,
                PaymentType::StakingEntry,
            );

            assert!(result.is_ok());
            assert!(result.unwrap()); // Consenso atingido!
        }
    }
}
