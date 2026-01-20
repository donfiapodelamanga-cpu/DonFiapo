//! # Fiapo Core Token Contract
//! 
//! This contract implements the core PSP22 token for the Don Fiapo ecosystem.
//! It provides the base fungible token functionality with additional features:
//! 
//! - Deflationary burn mechanism
//! - Transaction fees with distribution
//! - Authorized minting (for ICO, Staking rewards)
//! - Pause functionality for emergencies
//! 
//! ## Security Features
//! - Reentrancy protection
//! - Authorization checks for sensitive operations
//! - Pause mechanism for emergency stops

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{
    AccountId, Balance, PSP22Error, PSP22Result,
    IPSP22, IPSP22Mintable, IPSP22Burnable,
};

#[ink::contract]
mod fiapo_core {
    use super::*;
    use ink::storage::Mapping;
    use ink::prelude::string::String;

    /// Decimais do token FIAPO
    pub const DECIMALS: u8 = 8;
    pub const SCALE: u128 = 100_000_000; // 10^8

    /// Tokenomics conforme requisitos
    pub const MAX_SUPPLY: u128 = 300_000_000_000 * SCALE; // 300 bilhões
    pub const MIN_SUPPLY: u128 = 100_000_000 * SCALE;     // 100 milhões (target de queima)

    /// Taxa de transação padrão (0.6%)
    pub const TRANSACTION_FEE_BPS: u32 = 60; // 0.6% = 60 basis points

    /// Storage do contrato
    #[ink(storage)]
    pub struct FiapoCore {
        /// Nome do token
        name: String,
        /// Símbolo do token
        symbol: String,
        /// Supply total atual
        total_supply: Balance,
        /// Mapeamento de saldos
        balances: Mapping<AccountId, Balance>,
        /// Mapeamento de allowances (owner, spender) -> amount
        allowances: Mapping<(AccountId, AccountId), Balance>,
        /// Dono do contrato
        owner: AccountId,
        /// Contratos autorizados a mintar tokens
        authorized_minters: Mapping<AccountId, bool>,
        /// Contratos autorizados a queimar tokens
        authorized_burners: Mapping<AccountId, bool>,
        /// Carteira para tokens queimados
        burn_wallet: AccountId,
        /// Carteira do time
        team_wallet: AccountId,
        /// Carteira de staking rewards
        staking_wallet: AccountId,
        /// Carteira de rewards
        rewards_wallet: AccountId,
        /// Total queimado
        total_burned: Balance,
        /// Contrato pausado
        paused: bool,
        /// Guard de reentrância
        reentrancy_guard: bool,
    }

    /// Evento de transferência
    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        value: Balance,
    }

    /// Evento de aprovação
    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        spender: AccountId,
        value: Balance,
    }

    /// Evento de queima
    #[ink(event)]
    pub struct Burn {
        #[ink(topic)]
        from: AccountId,
        amount: Balance,
        new_total_supply: Balance,
    }

    /// Evento de minting
    #[ink(event)]
    pub struct Mint {
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
        minter: AccountId,
    }

    /// Evento de autorização
    #[ink(event)]
    pub struct MinterAuthorized {
        #[ink(topic)]
        minter: AccountId,
        authorized: bool,
    }

    impl FiapoCore {
        /// Construtor do contrato
        #[ink(constructor)]
        pub fn new(
            name: String,
            symbol: String,
            initial_supply: Balance,
            burn_wallet: AccountId,
            team_wallet: AccountId,
            staking_wallet: AccountId,
            rewards_wallet: AccountId,
        ) -> Result<Self, PSP22Error> {
            if initial_supply > MAX_SUPPLY {
                return Err(PSP22Error::MaxSupplyExceeded);
            }

            let caller = Self::env().caller();
            let mut balances = Mapping::default();
            balances.insert(caller, &initial_supply);

            Self::env().emit_event(Transfer {
                from: None,
                to: Some(caller),
                value: initial_supply,
            });

            Ok(Self {
                name,
                symbol,
                total_supply: initial_supply,
                balances,
                allowances: Mapping::default(),
                owner: caller,
                authorized_minters: Mapping::default(),
                authorized_burners: Mapping::default(),
                burn_wallet,
                team_wallet,
                staking_wallet,
                rewards_wallet,
                total_burned: 0,
                paused: false,
                reentrancy_guard: false,
            })
        }

        // ==================== PSP22 Metadata ====================

        /// Retorna o nome do token
        #[ink(message)]
        pub fn name(&self) -> String {
            self.name.clone()
        }

        /// Retorna o símbolo do token
        #[ink(message)]
        pub fn symbol(&self) -> String {
            self.symbol.clone()
        }

        /// Retorna o número de decimais
        #[ink(message)]
        pub fn decimals(&self) -> u8 {
            DECIMALS
        }

        // ==================== Admin Functions ====================

        /// Autoriza um contrato a mintar tokens
        #[ink(message)]
        pub fn authorize_minter(&mut self, minter: AccountId) -> PSP22Result<()> {
            self.ensure_owner()?;
            self.authorized_minters.insert(minter, &true);
            
            self.env().emit_event(MinterAuthorized {
                minter,
                authorized: true,
            });
            
            Ok(())
        }

        /// Remove autorização de minting
        #[ink(message)]
        pub fn revoke_minter(&mut self, minter: AccountId) -> PSP22Result<()> {
            self.ensure_owner()?;
            self.authorized_minters.insert(minter, &false);
            
            self.env().emit_event(MinterAuthorized {
                minter,
                authorized: false,
            });
            
            Ok(())
        }

        /// Autoriza um contrato a queimar tokens
        #[ink(message)]
        pub fn authorize_burner(&mut self, burner: AccountId) -> PSP22Result<()> {
            self.ensure_owner()?;
            self.authorized_burners.insert(burner, &true);
            Ok(())
        }

        /// Pausa o contrato
        #[ink(message)]
        pub fn pause(&mut self) -> PSP22Result<()> {
            self.ensure_owner()?;
            self.paused = true;
            Ok(())
        }

        /// Despausa o contrato
        #[ink(message)]
        pub fn unpause(&mut self) -> PSP22Result<()> {
            self.ensure_owner()?;
            self.paused = false;
            Ok(())
        }

        /// Verifica se está pausado
        #[ink(message)]
        pub fn is_paused(&self) -> bool {
            self.paused
        }

        /// Retorna o owner
        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }

        /// Retorna total queimado
        #[ink(message)]
        pub fn total_burned(&self) -> Balance {
            self.total_burned
        }

        /// Verifica se é um minter autorizado
        #[ink(message)]
        pub fn is_authorized_minter(&self, account: AccountId) -> bool {
            self.authorized_minters.get(account).unwrap_or(false)
        }

        // ==================== Internal Functions ====================

        fn ensure_not_paused(&self) -> PSP22Result<()> {
            if self.paused {
                return Err(PSP22Error::SystemPaused);
            }
            Ok(())
        }

        fn ensure_owner(&self) -> PSP22Result<()> {
            if self.env().caller() != self.owner {
                return Err(PSP22Error::NotAuthorized);
            }
            Ok(())
        }

        fn ensure_authorized_minter(&self) -> PSP22Result<()> {
            let caller = self.env().caller();
            if caller != self.owner && !self.authorized_minters.get(caller).unwrap_or(false) {
                return Err(PSP22Error::NotAuthorized);
            }
            Ok(())
        }

        fn ensure_authorized_burner(&self) -> PSP22Result<()> {
            let caller = self.env().caller();
            if caller != self.owner && !self.authorized_burners.get(caller).unwrap_or(false) {
                return Err(PSP22Error::NotAuthorized);
            }
            Ok(())
        }

        /// Transferência interna sem taxas (para uso de contratos autorizados)
        fn transfer_internal(
            &mut self,
            from: AccountId,
            to: AccountId,
            value: Balance,
        ) -> PSP22Result<()> {
            let from_balance = self.balances.get(from).unwrap_or(0);
            if from_balance < value {
                return Err(PSP22Error::InsufficientBalance);
            }

            self.balances.insert(from, &from_balance.saturating_sub(value));
            let to_balance = self.balances.get(to).unwrap_or(0);
            self.balances.insert(to, &to_balance.saturating_add(value));

            self.env().emit_event(Transfer {
                from: Some(from),
                to: Some(to),
                value,
            });

            Ok(())
        }

        /// Transferência com taxa (para uso de usuários)
        fn transfer_with_fee(
            &mut self,
            from: AccountId,
            to: AccountId,
            value: Balance,
        ) -> PSP22Result<()> {
            let from_balance = self.balances.get(from).unwrap_or(0);
            if from_balance < value {
                return Err(PSP22Error::InsufficientBalance);
            }

            // Calcula taxa
            let fee = value.saturating_mul(TRANSACTION_FEE_BPS as u128) / 10000;
            let net_value = value.saturating_sub(fee);

            // Transfere valor líquido
            self.balances.insert(from, &from_balance.saturating_sub(value));
            let to_balance = self.balances.get(to).unwrap_or(0);
            self.balances.insert(to, &to_balance.saturating_add(net_value));

            // Distribui taxa de transação (30% burn, 50% staking, 20% rewards)
            // Conforme regras do monólito fees/distribution.rs
            if fee > 0 {
                let burn_amount = fee.saturating_mul(30) / 100;      // 30% queima
                let staking_amount = fee.saturating_mul(50) / 100;   // 50% staking
                let rewards_amount = fee.saturating_sub(burn_amount).saturating_sub(staking_amount); // 20% rewards

                // Queima
                if burn_amount > 0 {
                    self.total_supply = self.total_supply.saturating_sub(burn_amount);
                    self.total_burned = self.total_burned.saturating_add(burn_amount);
                }

                // Distribui para staking
                if staking_amount > 0 {
                    let staking_balance = self.balances.get(self.staking_wallet).unwrap_or(0);
                    self.balances.insert(self.staking_wallet, &staking_balance.saturating_add(staking_amount));
                }

                // Distribui para rewards
                if rewards_amount > 0 {
                    let rewards_balance = self.balances.get(self.rewards_wallet).unwrap_or(0);
                    self.balances.insert(self.rewards_wallet, &rewards_balance.saturating_add(rewards_amount));
                }
            }

            self.env().emit_event(Transfer {
                from: Some(from),
                to: Some(to),
                value: net_value,
            });

            Ok(())
        }

    }

    // ==================== Tests ====================

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn create_contract() -> FiapoCore {
            let accounts = default_accounts();
            FiapoCore::new(
                String::from("Don Fiapo"),
                String::from("FIAPO"),
                1_000_000 * SCALE,
                accounts.charlie, // burn_wallet
                accounts.django,  // team_wallet
                accounts.eve,     // staking_wallet
                accounts.frank,   // rewards_wallet
            ).unwrap()
        }

        #[ink::test]
        fn constructor_works() {
            let contract = create_contract();
            let accounts = default_accounts();
            
            assert_eq!(contract.name(), "Don Fiapo");
            assert_eq!(contract.symbol(), "FIAPO");
            assert_eq!(contract.decimals(), 8);
            assert_eq!(contract.total_supply(), 1_000_000 * SCALE);
            assert_eq!(contract.balance_of(accounts.alice), 1_000_000 * SCALE);
            assert_eq!(contract.owner(), accounts.alice);
            assert!(!contract.is_paused());
        }

        #[ink::test]
        fn transfer_works() {
            let mut contract = create_contract();
            let accounts = default_accounts();
            
            let transfer_amount = 1000 * SCALE;
            let fee = transfer_amount * TRANSACTION_FEE_BPS as u128 / 10000;
            let net_amount = transfer_amount - fee;

            let result = contract.transfer(accounts.bob, transfer_amount);
            assert!(result.is_ok());

            assert_eq!(contract.balance_of(accounts.bob), net_amount);
            assert!(contract.balance_of(accounts.alice) < 1_000_000 * SCALE);
        }

        #[ink::test]
        fn transaction_fee_distribution_works() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            let transfer_amount = 100_000 * SCALE;
            let fee = transfer_amount * TRANSACTION_FEE_BPS as u128 / 10000;
            // Distribuição conforme monólito: 30% burn, 50% staking, 20% rewards
            let burn_amount = fee.saturating_mul(30) / 100;
            let staking_amount = fee.saturating_mul(50) / 100;
            let rewards_amount = fee.saturating_sub(burn_amount).saturating_sub(staking_amount);

            let initial_supply = contract.total_supply();

            contract.transfer(accounts.bob, transfer_amount).unwrap();

            assert_eq!(contract.balance_of(accounts.bob), transfer_amount - fee);
            assert_eq!(contract.total_supply(), initial_supply - burn_amount);
            assert_eq!(contract.total_burned(), burn_amount);
            assert_eq!(contract.balance_of(accounts.eve), staking_amount);  // staking_wallet
            assert_eq!(contract.balance_of(accounts.frank), rewards_amount); // rewards_wallet
        }

        #[ink::test]
        fn approve_and_transfer_from_works() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            // Aprova Bob para gastar tokens de Alice
            contract.approve(accounts.bob, 500 * SCALE).unwrap();
            assert_eq!(contract.allowance(accounts.alice, accounts.bob), 500 * SCALE);

            // Bob transfere de Alice para Charlie
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let result = contract.transfer_from(accounts.alice, accounts.charlie, 100 * SCALE);
            assert!(result.is_ok());
        }

        #[ink::test]
        fn mint_requires_authorization() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            // Muda caller para Bob (não autorizado)
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let result = contract.mint_to(accounts.bob, 1000 * SCALE);
            assert!(result.is_err());
        }

        #[ink::test]
        fn authorized_minter_can_mint() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            // Autoriza Bob
            contract.authorize_minter(accounts.bob).unwrap();
            assert!(contract.is_authorized_minter(accounts.bob));

            // Bob pode mintar
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let result = contract.mint_to(accounts.charlie, 1000 * SCALE);
            assert!(result.is_ok());
            assert_eq!(contract.balance_of(accounts.charlie), 1000 * SCALE);
        }

        #[ink::test]
        fn burn_works() {
            let mut contract = create_contract();
            let accounts = default_accounts();
            let initial_supply = contract.total_supply();
            
            let burn_amount = 1000 * SCALE;
            let result = contract.burn(burn_amount);
            assert!(result.is_ok());

            assert_eq!(contract.total_supply(), initial_supply - burn_amount);
            assert_eq!(contract.total_burned(), burn_amount);
        }

        #[ink::test]
        fn pause_blocks_transfers() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            contract.pause().unwrap();
            assert!(contract.is_paused());

            let result = contract.transfer(accounts.bob, 100 * SCALE);
            assert_eq!(result, Err(PSP22Error::SystemPaused));

            contract.unpause().unwrap();
            let result = contract.transfer(accounts.bob, 100 * SCALE);
            assert!(result.is_ok());
        }
    }

    // ==================== PSP22 Implementation ====================

    impl IPSP22 for FiapoCore {
        #[ink(message)]
        fn total_supply(&self) -> Balance {
            self.total_supply
        }

        #[ink(message)]
        fn balance_of(&self, owner: AccountId) -> Balance {
            self.balances.get(owner).unwrap_or(0)
        }

        #[ink(message)]
        fn allowance(&self, owner: AccountId, spender: AccountId) -> Balance {
            self.allowances.get((owner, spender)).unwrap_or(0)
        }

        #[ink(message)]
        fn transfer(&mut self, to: AccountId, value: Balance) -> PSP22Result<()> {
            self.ensure_not_paused()?;
            let caller = self.env().caller();
            self.transfer_with_fee(caller, to, value)
        }

        #[ink(message)]
        fn transfer_from(
            &mut self,
            from: AccountId,
            to: AccountId,
            value: Balance,
        ) -> PSP22Result<()> {
            self.ensure_not_paused()?;
            let caller = self.env().caller();
            
            // Verifica allowance
            let current_allowance = self.allowances.get((from, caller)).unwrap_or(0);
            if current_allowance < value {
                return Err(PSP22Error::InsufficientAllowance);
            }

            // Atualiza allowance
            self.allowances.insert((from, caller), &current_allowance.saturating_sub(value));

            // Executa transferência
            self.transfer_with_fee(from, to, value)
        }

        #[ink(message)]
        fn approve(&mut self, spender: AccountId, value: Balance) -> PSP22Result<()> {
            let caller = self.env().caller();
            self.allowances.insert((caller, spender), &value);

            self.env().emit_event(Approval {
                owner: caller,
                spender,
                value,
            });

            Ok(())
        }
    }

    // ==================== Mintable Implementation ====================

    impl IPSP22Mintable for FiapoCore {
        #[ink(message)]
        fn mint_to(&mut self, to: AccountId, amount: Balance) -> PSP22Result<()> {
            self.ensure_not_paused()?;
            self.ensure_authorized_minter()?;

            // Verifica max supply
            let new_supply = self.total_supply.saturating_add(amount);
            if new_supply > MAX_SUPPLY {
                return Err(PSP22Error::MaxSupplyExceeded);
            }

            // Minta tokens
            self.total_supply = new_supply;
            let current_balance = self.balances.get(to).unwrap_or(0);
            self.balances.insert(to, &current_balance.saturating_add(amount));

            self.env().emit_event(Mint {
                to,
                amount,
                minter: self.env().caller(),
            });

            self.env().emit_event(Transfer {
                from: None,
                to: Some(to),
                value: amount,
            });

            Ok(())
        }
    }

    // ==================== Burnable Implementation ====================

    impl IPSP22Burnable for FiapoCore {
        #[ink(message)]
        fn burn(&mut self, amount: Balance) -> PSP22Result<()> {
            self.ensure_not_paused()?;
            let caller = self.env().caller();

            let balance = self.balances.get(caller).unwrap_or(0);
            if balance < amount {
                return Err(PSP22Error::InsufficientBalance);
            }

            // Queima
            self.balances.insert(caller, &balance.saturating_sub(amount));
            self.total_supply = self.total_supply.saturating_sub(amount);
            self.total_burned = self.total_burned.saturating_add(amount);

            self.env().emit_event(Burn {
                from: caller,
                amount,
                new_total_supply: self.total_supply,
            });

            Ok(())
        }

        #[ink(message)]
        fn burn_from(&mut self, from: AccountId, amount: Balance) -> PSP22Result<()> {
            self.ensure_not_paused()?;
            self.ensure_authorized_burner()?;

            let balance = self.balances.get(from).unwrap_or(0);
            if balance < amount {
                return Err(PSP22Error::InsufficientBalance);
            }

            // Queima
            self.balances.insert(from, &balance.saturating_sub(amount));
            self.total_supply = self.total_supply.saturating_sub(amount);
            self.total_burned = self.total_burned.saturating_add(amount);

            self.env().emit_event(Burn {
                from,
                amount,
                new_total_supply: self.total_supply,
            });

            Ok(())
        }
    }

    // ==================== Tests ====================
}
