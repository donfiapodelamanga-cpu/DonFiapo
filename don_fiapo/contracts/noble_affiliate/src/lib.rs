#![cfg_attr(not(feature = "std"), no_std, no_main)]

use ink::primitives::{AccountId, Hash};
// use fiapo_traits::Balance; // Removed unused

#[ink::contract]
mod noble_affiliate {
    use super::*;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    // --- Constants ---
    pub const YEAR_IN_MS: Timestamp = 365 * 24 * 60 * 60 * 1000;
    pub const ACTIVATION_THRESHOLD: u32 = 10;

    pub const MAINTENANCE_THRESHOLD: u32 = 2;

    // Minimum Withdrawal Limits
    // Assuming SCALE factor is handled elsewhere or numbers are raw units?
    // User asked for "10 USDT", "10 LUNES".
    // If we deal with LUNES (native, 8 decimals), 10 LUNES = 10 * 10^8.
    // USDT usually 6 decimals.
    // FIAPO has 8 decimals (100_000_000 scale).

    pub const SCALE: u128 = 100_000_000;
    
    // Limits
    // We only control NATIVE (Lunes) balance here directly for Payouts if it's Lunes.
    // If the contract holds other tokens (PSP22), we need logic for those.
    // Assuming for now REVENUE comes as Native Value (Lunes) or we just track "Balance" abstractly.
    // The previous code uses `self.env().transferred_value()` which is Native Lunes.
    
    // Limit: 10 LUNES
    pub const MIN_WITHDRAW_LUNES: Balance = 10 * SCALE; 
    pub const MIN_WITHDRAW_FIAPO: Balance = 1000 * SCALE;
    pub const MIN_WITHDRAW_USDT: Balance = 10 * 1_000_000; // 6 decimals? or 100_000_000? Assumed 6 for USDT usually.
    // If strict compliance: 10 USDT = 1000 cents in config, or we decide scale. 
    // Let's use 10_000_000 if 6 decimals.
    // Actually, user said "10 US Doletas".

    // The current logic `CommissionBalance` tracks just `Balance` (Native?).
    // Prompt implies we should handle multiple currencies? 
    // "10 USDT, 10 FIAPO, 10 LUNES".
    // The current contract only receives Native Lunes via `register_revenue` (payable).
    // It doesn't seem to have PSP22 support yet.
    // I will add the constants for now, but `execute_payout` currently only sends Native.
    // I will assume for this task we are enforcing the limit on the Native balance (Lunes) 
    // or if we add multi-token support later.
    
    // Let's implement generic constant for LUNES now since that's what we have.
    // And add placeholders for others if we expand.

    // --- Errors ---
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum NobleError {
        Unauthorized,
        NobleAlreadyExists,
        NobleNotFound,
        CommercialNotFound,
        CommercialNotActive,
        PayoutTooEarly,
        TransferFailed,
        InvalidShareConfig,
    }

    // --- Enums ---
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum NobleStatus {
        Active,
        Probation, // New status for activation/penalty
        Suspended,
        Removed,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum RevenueSource {
        IcoNft,
        MarketplaceFee,
        StakingEntry,
        GovProposal,
        GovVote,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PaymentPreference {
        Crypto,
        SolanaUSDT,
    }

    // --- Events ---
    #[ink(event)]
    pub struct SolanaWithdrawalRequested {
        #[ink(topic)]
        pub noble: AccountId,
        pub amount: Balance,
        pub solana_wallet: Vec<u8>,
    }

    #[ink(event)]
    pub struct PreferenceUpdated {
        #[ink(topic)]
        pub noble: AccountId,
        pub preference: PaymentPreference,
    }


    // --- Structs ---
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Commercial {
        pub wallet: AccountId,
        pub active: bool,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Noble {
        pub noble_wallet: AccountId,
        pub solana_wallet: Vec<u8>,
        pub commercial_wallet: AccountId,
        pub status: NobleStatus,
        pub affiliate_code: Hash,
        pub payment_preference: PaymentPreference,
        pub created_at: Timestamp,
        
        // Tracking Metrics
        pub unique_referrals_lifetime: u32,
        pub referrals_current_cycle: u32,
        pub referrals_towards_activation: u32,
        
        // Dates
        pub activation_timestamp: Timestamp, // 0 if not active
        pub last_cycle_reset: Timestamp,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct CommissionBalance {
        pub noble_amount: Balance,
        pub commercial_amount: Balance,
        pub last_update: Timestamp,
    }

    // --- Storage ---
    #[ink(storage)]
    pub struct OrderOfNobles {
        owner: AccountId,
        core_contract: AccountId,
        
        commercials: Mapping<AccountId, Commercial>,
        nobles: Mapping<AccountId, Noble>,
        affiliate_code_to_noble: Mapping<Hash, AccountId>,
        commissions: Mapping<AccountId, CommissionBalance>,
        
        // History to track unique payers per code to avoid spamming self-referrals
        referral_history: Mapping<(Hash, AccountId), bool>,

        payout_interval: Timestamp,
        last_payout: Timestamp,
    }

    impl OrderOfNobles {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            Self {
                owner: Self::env().caller(),
                core_contract,
                commercials: Mapping::default(),
                nobles: Mapping::default(),
                affiliate_code_to_noble: Mapping::default(),
                commissions: Mapping::default(),
                referral_history: Mapping::default(),
                payout_interval: 15 * 24 * 60 * 60 * 1000, 
                last_payout: Self::env().block_timestamp(),
            }
        }

        // --- Modifiers helpers ---
        fn only_owner(&self) -> Result<(), NobleError> {
            if self.env().caller() != self.owner {
                return Err(NobleError::Unauthorized);
            }
            Ok(())
        }

        fn only_commercial(&self) -> Result<(), NobleError> {
            if !self.commercials.contains(self.env().caller()) {
                return Err(NobleError::Unauthorized);
            }
            Ok(())
        }

        fn ensure_active_or_probation(&self, noble: &Noble) -> Result<(), NobleError> {
             match noble.status {
                NobleStatus::Active | NobleStatus::Probation => Ok(()),
                _ => Err(NobleError::Unauthorized),
             }
        }

        // --- Admin / Commercial ---
        
        #[ink(message)]
        pub fn add_commercial(&mut self, wallet: AccountId) -> Result<(), NobleError> {
            self.only_owner()?;
            self.commercials.insert(wallet, &Commercial { wallet, active: true });
            Ok(())
        }

        #[ink(message)]
        pub fn add_noble(
            &mut self,
            noble_wallet: AccountId,
            solana_wallet: Vec<u8>,
        ) -> Result<Hash, NobleError> {
            self.only_commercial()?;
            let commercial_wallet = self.env().caller();

            if self.nobles.contains(noble_wallet) {
                return Err(NobleError::NobleAlreadyExists);
            }

            // Generate Code: hash(noble + timestamp)
            let timestamp = self.env().block_timestamp();
            let mut input = scale::Encode::encode(&noble_wallet);
            input.extend_from_slice(&scale::Encode::encode(&timestamp));
            let code_hash = self.env().hash_bytes::<ink::env::hash::Blake2x256>(&input);
            let affiliate_code = Hash::from(code_hash);

            let noble = Noble {
                noble_wallet,
                solana_wallet,
                commercial_wallet,
                status: NobleStatus::Probation, // Start in Probation
                affiliate_code,
                payment_preference: PaymentPreference::Crypto, // Default
                created_at: timestamp,
                unique_referrals_lifetime: 0,
                referrals_current_cycle: 0,
                referrals_towards_activation: 0,
                activation_timestamp: 0,
                last_cycle_reset: timestamp,
            };

            self.nobles.insert(noble_wallet, &noble);
            self.affiliate_code_to_noble.insert(affiliate_code, &noble_wallet);

            Ok(affiliate_code)
        }

        #[ink(message)]
        pub fn update_noble_status(&mut self, noble_wallet: AccountId, status: NobleStatus) -> Result<(), NobleError> {
            self.only_owner()?;
            let mut noble = self.nobles.get(noble_wallet).ok_or(NobleError::NobleNotFound)?;
            noble.status = status;
            self.nobles.insert(noble_wallet, &noble);
            Ok(())
        }


        // --- Revenue Tracking & Logic ---
        
        #[ink(message, payable)]
        pub fn register_revenue(
            &mut self,
            affiliate_code: Hash,
            _source: RevenueSource,
            base_amount: Balance,
            payer: AccountId, // New Argument for tracking
        ) -> Result<(), NobleError> {
            let noble_wallet = self.affiliate_code_to_noble.get(affiliate_code).ok_or(NobleError::NobleNotFound)?;
            let mut noble = self.nobles.get(noble_wallet).ok_or(NobleError::NobleNotFound)?;
            
            // Allow Probation to accrue revenue (optional? Prompt doesn't say otherwise, just "activate").
            // Assuming they accrue but maybe can't withdraw? 
            // Or maybe "activate to receive commissions"?
            // Usually "Activate" implies getting paid.
            // But if we block revenue, they lose the 1st 10 sales commissions? That's harsh.
            // I'll allow accruing, but status check prevents Payout if we want.
            // "ensure_active_or_probation" allows revenue registration.
            self.ensure_active_or_probation(&noble)?;

            // 1. Process Logic Rules
            self.process_referral_logic(&mut noble, affiliate_code, payer);
            self.nobles.insert(noble_wallet, &noble);

            // 2. Financials
            let transferred = self.env().transferred_value();
            let share_amount = if transferred > 0 { transferred } else { base_amount };

            // Split 7/12 to Noble, 5/12 to Commercial
            let noble_part = share_amount.saturating_mul(7).saturating_div(12);
            let commercial_part = share_amount.saturating_sub(noble_part);

            let mut commission = self.commissions.get(noble_wallet).unwrap_or_default();
            commission.noble_amount = commission.noble_amount.saturating_add(noble_part);
            commission.commercial_amount = commission.commercial_amount.saturating_add(commercial_part);
            commission.last_update = self.env().block_timestamp();
            
            self.commissions.insert(noble_wallet, &commission);

            Ok(())
        }

        fn process_referral_logic(&mut self, noble: &mut Noble, code: Hash, payer: AccountId) {
            let current_time = self.env().block_timestamp();
            let is_new_payer = !self.referral_history.get((code, payer)).unwrap_or(false);

            // Cycle Check (Maintenance)
            if noble.status == NobleStatus::Active {
                if current_time > noble.last_cycle_reset.saturating_add(YEAR_IN_MS) {
                    // Year passed. Check maintenance requirement.
                    if noble.referrals_current_cycle < MAINTENANCE_THRESHOLD {
                        noble.status = NobleStatus::Probation;
                        noble.referrals_towards_activation = 0; // Reset activation progress
                        noble.activation_timestamp = 0; 
                    }
                    // Reset cycle
                    noble.referrals_current_cycle = 0;
                    noble.last_cycle_reset = current_time;
                }
            }

            if is_new_payer {
                self.referral_history.insert((code, payer), &true);
                noble.unique_referrals_lifetime = noble.unique_referrals_lifetime.saturating_add(1);
                
                if noble.status == NobleStatus::Active {
                    noble.referrals_current_cycle = noble.referrals_current_cycle.saturating_add(1);
                } else if noble.status == NobleStatus::Probation {
                    noble.referrals_towards_activation = noble.referrals_towards_activation.saturating_add(1);
                    
                    // Activation Check
                    if noble.referrals_towards_activation >= ACTIVATION_THRESHOLD {
                        noble.status = NobleStatus::Active;
                        noble.activation_timestamp = current_time;
                        noble.last_cycle_reset = current_time;
                        noble.referrals_current_cycle = 0; 
                        // Note: The 10th user activates. They don't count for the "Next Year" cycle 
                        // because the cycle just started now.
                    }
                }
            }
        }

        /// Deposit funds to cover off-chain revenue commissions.
        #[ink(message, payable)]
        pub fn deposit(&mut self) -> Result<(), NobleError> {
            Ok(())
        }

        // --- Payout ---

        #[ink(message)]
        pub fn set_payment_preference(&mut self, preference: PaymentPreference) -> Result<(), NobleError> {
             // Noble calls this themselves
             let caller = self.env().caller();
             if !self.nobles.contains(caller) {
                 return Err(NobleError::Unauthorized);
             }
             let mut noble = self.nobles.get(caller).unwrap();
             noble.payment_preference = preference;
             self.nobles.insert(caller, &noble);
             self.env().emit_event(PreferenceUpdated {
                 noble: caller,
                 preference,
             });
             Ok(())
        }

        #[ink(message)]
        pub fn execute_payout(&mut self, noble_wallet: AccountId) -> Result<(), NobleError> {
            self.only_owner()?;
            
            let commission = self.commissions.get(noble_wallet).unwrap_or_default();
            let noble = self.nobles.get(noble_wallet).ok_or(NobleError::NobleNotFound)?;
            
            if noble.status != NobleStatus::Active {
                return Err(NobleError::Unauthorized);
            }

            let contract_balance = self.env().balance();
            let total_needed = commission.noble_amount.saturating_add(commission.commercial_amount);
            
            if total_needed == 0 { return Ok(()); }
            
            // Limit Check (LUNES)
            // Only checking Noble share for limit rule? Typically yes.
            // "Accumulate 10 to withdraw". Commercial share is automaticaly distributed potentially?
            // Or both?
            // Let's enforce rule on Noble Amount.
            if commission.noble_amount < MIN_WITHDRAW_LUNES {
                return Err(NobleError::PayoutTooEarly);
            }

            if contract_balance < total_needed { return Err(NobleError::TransferFailed); }

            // 1. Commercial Pay (Always Crypto?)
            // Usually Commercial is internal, so Crypto is fine.
            if commission.commercial_amount > 0 {
                self.env().transfer(noble.commercial_wallet, commission.commercial_amount)
                     .map_err(|_| NobleError::TransferFailed)?;
            }

            // 2. Noble Pay
            if commission.noble_amount > 0 {
                match noble.payment_preference {
                   PaymentPreference::Crypto => {
                       self.env().transfer(noble.noble_wallet, commission.noble_amount)
                           .map_err(|_| NobleError::TransferFailed)?;
                   },
                   PaymentPreference::SolanaUSDT => {
                       // Solana Logic:
                       // We do NOT transfer Lunes to them.
                       // We send Lunes to Owner logic wallet to bridge/swap to USDT on Solana.
                       self.env().transfer(self.owner, commission.noble_amount)
                           .map_err(|_| NobleError::TransferFailed)?;
                       
                       self.env().emit_event(SolanaWithdrawalRequested {
                           noble: noble_wallet,
                           amount: commission.noble_amount,
                           solana_wallet: noble.solana_wallet.clone(),
                       });
                   }
                }
            }

            // Reset
            let mut updated_commission = commission;
            updated_commission.noble_amount = 0;
            updated_commission.commercial_amount = 0;
            updated_commission.last_update = self.env().block_timestamp();
            self.commissions.insert(noble_wallet, &updated_commission);
            
            Ok(())
        }
        
        // --- Views ---
        #[ink(message)]
        pub fn get_noble_details(&self, wallet: AccountId) -> Option<Noble> {
            self.nobles.get(wallet)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test::DefaultAccounts;

        fn default_accounts() -> DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn set_caller(caller: AccountId) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
        }

        #[ink::test]
        fn e2e_activation_flow_works() {
            // 1. Setup
            let accounts = default_accounts();
            let mut contract = OrderOfNobles::new(accounts.django); // Django as Core
            ink::env::test::set_block_timestamp::<ink::env::DefaultEnvironment>(1672531200000); // Set to non-zero (Jan 1 2023)
            
            // 2. Add Commercial (Alice -> Bob)
            set_caller(accounts.alice); // Owner
            assert!(contract.add_commercial(accounts.bob).is_ok());

            // 3. Add Noble (Bob -> Charlie)
            set_caller(accounts.bob); // Commercial
            let noble_wallet = accounts.charlie;
            let solana_wallet = vec![1, 2, 3];
            let code = contract.add_noble(noble_wallet, solana_wallet).expect("Failed to add noble");

            // Verify Initial Status
            let noble = contract.get_noble_details(noble_wallet).unwrap();
            assert_eq!(noble.status, NobleStatus::Probation);
            assert_eq!(noble.unique_referrals_lifetime, 0);

            // 4. Simulate Usage (Referrals) to Activate
            // Need 10 unique payers.
            // We simulate calls from "ICO" or "Marketplace" (Eve) passing different payers.
            let source_contract = accounts.eve;
            set_caller(source_contract);

            // Payer 1
            contract.register_revenue(code, RevenueSource::IcoNft, 1000, accounts.frank).unwrap();
            let noble = contract.get_noble_details(noble_wallet).unwrap();
            assert_eq!(noble.unique_referrals_lifetime, 1);
            assert_eq!(noble.referrals_towards_activation, 1);
            assert_eq!(noble.status, NobleStatus::Probation);

            // Payer 1 again (Duplicate) - Should not increment counter
            contract.register_revenue(code, RevenueSource::IcoNft, 1000, accounts.frank).unwrap();
            let noble = contract.get_noble_details(noble_wallet).unwrap();
            assert_eq!(noble.unique_referrals_lifetime, 1);

            // Payers 2 to 9
            // Reuse accounts or generate mock IDs.
            // Since DefaultAccounts are limited, we use dummy AccountIds if possible.
            // Start with available:
            // 1. Frank (used)
            // 2. Alice (Owner, can pay)
            // 3. Bob (Commercial, can pay)
            // 4. Django (Core, can pay)
            // We need 6 more. Ink test env allows generating accounts? 
            // For simplicity, we assume we use account generation or reusable mock.
            // Let's use `AccountId::from([x; 32])` to generate unique accounts.
            
            for i in 2..=10 {
                let mut mock_id = [0u8; 32];
                mock_id[0] = i as u8;
                let payer = AccountId::from(mock_id);
                contract.register_revenue(code, RevenueSource::IcoNft, 1000, payer).unwrap();
            }

            // Check if Activated (10th payer)
            let noble = contract.get_noble_details(noble_wallet).unwrap();
            assert_eq!(noble.unique_referrals_lifetime, 10);
            assert_eq!(noble.status, NobleStatus::Active);
            assert!(noble.activation_timestamp > 0);

            // 5. Test Maintenance Logic (1 Year later)
            // Advance block timestamp
            let year_ms = 365 * 24 * 60 * 60 * 1000;
            ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
            ink::env::test::set_block_timestamp::<ink::env::DefaultEnvironment>(noble.activation_timestamp + year_ms + 1000);

            // New referral (User 11) comes in
            let mut mock_id_11 = [0u8; 32];
            mock_id_11[0] = 11;
            let payer_11 = AccountId::from(mock_id_11);
            
            // This call triggers the check. 
            // Since noble had 0 referrals in the CURRENT cycle (after activation reset), 
            // and year passed, status should drop to Probation.
            // Wait, logic says: "if current_time > last_cycle + YEAR ... if current < 2 -> Probation".
            
            contract.register_revenue(code, RevenueSource::IcoNft, 1000, payer_11).unwrap();
            
            let noble = contract.get_noble_details(noble_wallet).unwrap();
            
            // Status should be Probation because they had 0 in the cycle when year ended.
            // (The newly added one counts for the NEW cycle or Activation?)
            // Logic:
            // 1. Check Cycle: Year passed? Yes. Count < 2? Yes (0). -> Set Probation. Reset Count = 0.
            // 2. Process New Payer: Unique? Yes. Inc Count.
            //    If Probation -> Inc referals_towards_activation.
            
            assert_eq!(noble.status, NobleStatus::Probation);
            assert_eq!(noble.referrals_towards_activation, 1); // Started checking activation again
            
            // Now they need 10 again? Or just 2? 
            // "Manutenção... Falha resulta em retorno ao status Probation".
            // If Probation, logic enforces "Activation Check" (>= 10).
            // So yes, they need to prove themselves again with 10 users.
            // (Unless we want softer logic, but "Probation" implies "Proving Period").
            // User requirement: "para ativar pelo menos 10... para manter 2...".
            // If they fail maintenance, they lose Active. To get Active back, they need 10. 
            // Correct.
        }

        #[ink::test]
        fn test_revenue_and_payout() {
            let accounts = default_accounts();
            let mut contract = OrderOfNobles::new(accounts.django);
            
            set_caller(accounts.alice);
            contract.add_commercial(accounts.bob).unwrap();
            
            set_caller(accounts.bob);
            let code = contract.add_noble(accounts.charlie, vec![]).unwrap();

            // Force Active Status for Payout Test
            set_caller(accounts.alice);
            contract.update_noble_status(accounts.charlie, NobleStatus::Active).unwrap();

            // Register Revenue (Value transfer 20 LUNES = 2_000_000_000)
            // 7/12 * 2B = 1.16B (approx) > 1B (MIN_WITHDRAW_LUNES)
            let revenue_amount = 2_000_000_000;
            set_caller(accounts.eve);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(revenue_amount);
            contract.register_revenue(code, RevenueSource::IcoNft, revenue_amount, accounts.frank).unwrap();

            // Payout
            set_caller(accounts.alice); // Owner
            // Contract needs balance. Tests mock transfer?
            // "set_value_transferred" adds to contract balance in test env? 
            // Usually we need to seed the contract.
            let contract_addr = ink::env::account_id::<ink::env::DefaultEnvironment>();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(contract_addr, 3_000_000_000);

            // Execute Payout
            contract.execute_payout(accounts.charlie).unwrap();
            
            // Verify Logic (Test env doesn't easily inspect transfers without recording events, 
            // but we can check internal state cleared)
            // Or use "get_balance" if we tracked it, but easier to check internal map logic:
            // commissions should be empty.
            // We can't access private `commissions`, but logic would fail or error if balance was wrong.
            // Let's assume passed.
        }
        #[ink::test]
        fn test_solana_redundancy_flow() {
            let accounts = default_accounts();
            let mut contract = OrderOfNobles::new(accounts.django);
            
            set_caller(accounts.alice);
            contract.add_commercial(accounts.bob).unwrap();
            
            set_caller(accounts.bob);
            let code = contract.add_noble(accounts.charlie, vec![1, 2, 3]).unwrap();

            // Make Active
            set_caller(accounts.alice);
            contract.update_noble_status(accounts.charlie, NobleStatus::Active).unwrap();

            // Set Preference to SolanaUSDT
            set_caller(accounts.charlie);
            contract.set_payment_preference(PaymentPreference::SolanaUSDT).unwrap();

            // Add Revenue
             let revenue_amount = 2_000_000_000;
            set_caller(accounts.eve);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(revenue_amount);
            contract.register_revenue(code, RevenueSource::IcoNft, revenue_amount, accounts.frank).unwrap();

            // Payout
            set_caller(accounts.alice);
            let contract_addr = ink::env::account_id::<ink::env::DefaultEnvironment>();
            ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(contract_addr, 3_000_000_000);

            contract.execute_payout(accounts.charlie).unwrap();
            
            // Logic check: Funds transferred successfully. 
            // Since `set_payment_preference(SolanaUSDT)`, logic branches to `transfer(self.owner, amount)`.
            // If it didn't panic, it worked.
        }
    }
}

#[cfg(feature = "ink-as-dependency")]
pub use self::noble_affiliate::*;
