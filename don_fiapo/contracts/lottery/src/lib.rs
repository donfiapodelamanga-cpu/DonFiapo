//! # Fiapo Lottery Contract
//! 
//! Sistema de sorteios mensais e anuais para o ecossistema Don Fiapo.
//! - Sorteio mensal "God looked at you" - 5% das taxas mensais
//! - Sorteio de Natal - 5% das taxas anuais
//! - Exclui whales (top 100 carteiras)

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance};

#[ink::contract]
mod fiapo_lottery {
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    /// Tipo de sorteio
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum LotteryType {
        Monthly,
        Christmas,
    }



    /// Erros do sistema de sorteios
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum LotteryError {
        NotEnoughParticipants,
        NoFundsAvailable,
        TooEarlyForDraw,
        Unauthorized,
        AlreadyExecuted,
    }

    /// Configuração do sorteio
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct LotteryConfig {
        /// Percentual 1º lugar (bps)
        pub first_place_bps: u16,
        /// Percentual 2º lugar (bps)
        pub second_place_bps: u16,
        /// Percentual 3º lugar (bps)
        pub third_place_bps: u16,
        /// Saldo mínimo para participar
        pub min_balance: Balance,
        /// Saldo máximo (acima é whale)
        pub max_balance: Balance,
    }

    impl Default for LotteryConfig {
        fn default() -> Self {
            Self {
                first_place_bps: 5000,  // 50%
                second_place_bps: 3000, // 30%
                third_place_bps: 2000,  // 20%
                min_balance: 1000 * 100_000_000,       // 1000 FIAPO
                max_balance: 10_000_000 * 100_000_000, // 10M FIAPO
            }
        }
    }

    /// Um ganhador do sorteio
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Winner {
        pub wallet: AccountId,
        pub prize: Balance,
        pub position: u8,
    }

    /// Resultado de um sorteio
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct DrawResult {
        pub id: u64,
        pub lottery_type: LotteryType,
        pub winners: Vec<Winner>,
        pub total_fund: Balance,
        pub participants: u32,
        pub executed_at: u64,
    }

    /// Evento de sorteio executado
    #[ink(event)]
    pub struct LotteryExecuted {
        #[ink(topic)]
        lottery_id: u64,
        lottery_type: LotteryType,
        first_winner: AccountId,
        first_prize: Balance,
    }

    /// Storage do contrato
    #[ink(storage)]
    pub struct FiapoLottery {
        /// Contrato Core
        core_contract: AccountId,
        /// Contrato Oracle (autorizado a chamar buy_tickets_for)
        oracle_contract: Option<AccountId>,
        /// Owner
        owner: AccountId,
        /// Configuração mensal
        monthly_config: LotteryConfig,
        /// Configuração Natal
        christmas_config: LotteryConfig,
        /// Próximo ID
        next_lottery_id: u64,
        /// Histórico (últimos 50)
        history: Vec<DrawResult>,
        /// Último sorteio mensal
        last_monthly: u64,
        /// Último sorteio de Natal
        last_christmas: u64,
        /// Fundo acumulado mensal
        monthly_fund: Balance,
        /// Fundo acumulado anual
        annual_fund: Balance,
        /// Tickets por usuário para o próximo sorteio
        user_tickets: Mapping<AccountId, u32>,
        /// Lista de participantes do próximo sorteio
        participants: Vec<AccountId>,
    }

    impl FiapoLottery {
        /// Construtor
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            let caller = Self::env().caller();
            
            Self {
                core_contract,
                oracle_contract: None,
                owner: caller,
                monthly_config: LotteryConfig::default(),
                christmas_config: LotteryConfig {
                    first_place_bps: 6000,  // 60% para Natal
                    second_place_bps: 2500, // 25%
                    third_place_bps: 1500,  // 15%
                    ..LotteryConfig::default()
                },
                next_lottery_id: 1,
                history: Vec::new(),
                last_monthly: 0,
                last_christmas: 0,
                monthly_fund: 0,
                annual_fund: 0,
                user_tickets: Mapping::default(),
                participants: Vec::new(),
            }
        }

        // ==================== View Functions ====================

        /// Retorna contrato Core
        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        /// Retorna configuração mensal
        #[ink(message)]
        pub fn get_monthly_config(&self) -> LotteryConfig {
            self.monthly_config.clone()
        }

        /// Retorna histórico de sorteios
        #[ink(message)]
        pub fn get_history(&self) -> Vec<DrawResult> {
            self.history.clone()
        }

        /// Retorna fundo acumulado mensal
        #[ink(message)]
        pub fn get_monthly_fund(&self) -> Balance {
            self.monthly_fund
        }

        /// Retorna fundo acumulado anual
        #[ink(message)]
        pub fn get_annual_fund(&self) -> Balance {
            self.annual_fund
        }

        /// Verifica se é hora do sorteio mensal
        #[ink(message)]
        pub fn is_monthly_due(&self) -> bool {
            let current = self.env().block_timestamp();
            let interval = 30 * 24 * 60 * 60 * 1000; // 30 dias em ms
            current >= self.last_monthly.saturating_add(interval)
        }

        // ==================== Fund Management ====================

        /// Adiciona fundos ao pool mensal
        #[ink(message)]
        pub fn add_monthly_fund(&mut self, amount: Balance) -> Result<(), LotteryError> {
            if self.env().caller() != self.owner {
                return Err(LotteryError::Unauthorized);
            }
            self.monthly_fund = self.monthly_fund.saturating_add(amount);
            Ok(())
        }

        /// Adiciona fundos ao pool anual
        #[ink(message)]
        pub fn add_annual_fund(&mut self, amount: Balance) -> Result<(), LotteryError> {
            if self.env().caller() != self.owner {
                return Err(LotteryError::Unauthorized);
            }
            self.annual_fund = self.annual_fund.saturating_add(amount);
            Ok(())
        }

        // ==================== Ticket Functions ====================

        /// Compra tickets para um usuário (chamado pelo Oracle)
        #[ink(message)]
        pub fn buy_tickets_for(&mut self, user: AccountId, quantity: u32) -> Result<(), LotteryError> {
            let caller = self.env().caller();

            // Apenas Oracle pode chamar
            if Some(caller) != self.oracle_contract {
                return Err(LotteryError::Unauthorized);
            }

            if quantity == 0 {
                return Err(LotteryError::NotEnoughParticipants);
            }

            // Adiciona tickets ao usuário
            let current_tickets = self.user_tickets.get(user).unwrap_or(0);
            if current_tickets == 0 {
                // Novo participante
                self.participants.push(user);
            }
            self.user_tickets.insert(user, &current_tickets.saturating_add(quantity));

            Ok(())
        }

        /// Configura contrato Oracle (apenas owner)
        #[ink(message)]
        pub fn set_oracle_contract(&mut self, oracle: AccountId) -> Result<(), LotteryError> {
            if self.env().caller() != self.owner {
                return Err(LotteryError::Unauthorized);
            }
            self.oracle_contract = Some(oracle);
            Ok(())
        }

        /// Retorna tickets de um usuário
        #[ink(message)]
        pub fn get_user_tickets(&self, user: AccountId) -> u32 {
            self.user_tickets.get(user).unwrap_or(0)
        }

        /// Retorna total de participantes
        #[ink(message)]
        pub fn get_participants_count(&self) -> u32 {
            self.participants.len() as u32
        }

        // ==================== Draw Functions ====================

        /// Executa sorteio mensal
        #[ink(message)]
        pub fn execute_monthly_draw(
            &mut self,
            eligible_wallets: Vec<(AccountId, Balance)>,
        ) -> Result<DrawResult, LotteryError> {
            let caller = self.env().caller();
            let current = self.env().block_timestamp();

            if caller != self.owner {
                return Err(LotteryError::Unauthorized);
            }

            // Verifica intervalo
            let interval = 30 * 24 * 60 * 60 * 1000;
            if current < self.last_monthly.saturating_add(interval) {
                return Err(LotteryError::TooEarlyForDraw);
            }

            if self.monthly_fund == 0 {
                return Err(LotteryError::NoFundsAvailable);
            }

            let result = self.execute_draw(
                eligible_wallets,
                self.monthly_fund,
                LotteryType::Monthly,
                &self.monthly_config.clone(),
            )?;

            self.monthly_fund = 0;
            self.last_monthly = current;

            Ok(result)
        }

        /// Executa sorteio de Natal
        #[ink(message)]
        pub fn execute_christmas_draw(
            &mut self,
            eligible_wallets: Vec<(AccountId, Balance)>,
        ) -> Result<DrawResult, LotteryError> {
            let caller = self.env().caller();
            let current = self.env().block_timestamp();

            if caller != self.owner {
                return Err(LotteryError::Unauthorized);
            }

            // Verifica intervalo anual
            let interval = 365 * 24 * 60 * 60 * 1000;
            if current < self.last_christmas.saturating_add(interval) {
                return Err(LotteryError::TooEarlyForDraw);
            }

            if self.annual_fund == 0 {
                return Err(LotteryError::NoFundsAvailable);
            }

            let result = self.execute_draw(
                eligible_wallets,
                self.annual_fund,
                LotteryType::Christmas,
                &self.christmas_config.clone(),
            )?;

            self.annual_fund = 0;
            self.last_christmas = current;

            Ok(result)
        }

        /// Executa sorteio genérico
        fn execute_draw(
            &mut self,
            wallets: Vec<(AccountId, Balance)>,
            fund: Balance,
            lottery_type: LotteryType,
            config: &LotteryConfig,
        ) -> Result<DrawResult, LotteryError> {
            // Filtra elegíveis
            let eligible: Vec<_> = wallets.into_iter()
                .filter(|(_, bal)| *bal >= config.min_balance && *bal <= config.max_balance)
                .collect();

            if eligible.len() < 3 {
                return Err(LotteryError::NotEnoughParticipants);
            }

            // Seleciona 3 ganhadores pseudo-aleatórios
            let winners = self.select_winners(eligible.clone(), 3);

            // Calcula prêmios
            let first_prize = fund.saturating_mul(config.first_place_bps as u128).saturating_div(10000);
            let second_prize = fund.saturating_mul(config.second_place_bps as u128).saturating_div(10000);
            let third_prize = fund.saturating_mul(config.third_place_bps as u128).saturating_div(10000);

            let winner_list = ink::prelude::vec![
                Winner { wallet: winners[0], prize: first_prize, position: 1 },
                Winner { wallet: winners[1], prize: second_prize, position: 2 },
                Winner { wallet: winners[2], prize: third_prize, position: 3 },
            ];

            // Transfere prêmios para os ganhadores via cross-contract call
            for winner in &winner_list {
                let _ = self.call_core_transfer_prize(winner.wallet, winner.prize);
            }

            // Limpa tickets dos participantes
            for (wallet, _) in &eligible {
                self.user_tickets.insert(*wallet, &0);
            }
            self.participants.clear();

            let current = self.env().block_timestamp();
            let result = DrawResult {
                id: self.next_lottery_id,
                lottery_type: lottery_type.clone(),
                winners: winner_list.clone(),
                total_fund: fund,
                participants: eligible.len() as u32,
                executed_at: current,
            };

            // Salva histórico (máximo 50)
            if self.history.len() >= 50 {
                self.history.remove(0);
            }
            self.history.push(result.clone());
            self.next_lottery_id = self.next_lottery_id.saturating_add(1);

            Self::env().emit_event(LotteryExecuted {
                lottery_id: result.id,
                lottery_type,
                first_winner: winner_list[0].wallet,
                first_prize,
            });

            Ok(result)
        }

        /// Cross-contract call para transferir prêmios
        fn call_core_transfer_prize(&self, to: AccountId, amount: Balance) -> Result<(), LotteryError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};
 
            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("transfer")))
                        .push_arg(to)
                        .push_arg(amount),
                )
                .returns::<Result<(), u8>>()
                .try_invoke();
 
            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(LotteryError::Unauthorized),
            }
        }

        /// Seleciona ganhadores pseudo-aleatórios
        fn select_winners(&self, mut wallets: Vec<(AccountId, Balance)>, count: usize) -> Vec<AccountId> {
            let mut winners = Vec::new();
            let block = self.env().block_number();
            let time = self.env().block_timestamp();

            for i in 0..count {
                if wallets.is_empty() {
                    break;
                }
                
                let seed = (block as u64).saturating_add(time).saturating_add(i as u64);
                if wallets.is_empty() {
                    break;
                }
                let len = wallets.len() as u64;
                let idx = (seed.checked_rem(len).unwrap_or(0)) as usize;
                let (winner, _) = wallets.remove(idx);
                winners.push(winner);
            }

            winners
        }
    }

    // ==================== Tests ====================

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        #[ink::test]
        fn constructor_works() {
            let accounts = default_accounts();
            let contract = FiapoLottery::new(accounts.charlie);
            
            assert_eq!(contract.get_monthly_fund(), 0);
            assert_eq!(contract.get_annual_fund(), 0);
        }

        #[ink::test]
        fn config_defaults_correct() {
            let accounts = default_accounts();
            let contract = FiapoLottery::new(accounts.charlie);
            
            let config = contract.get_monthly_config();
            assert_eq!(config.first_place_bps, 5000);
            assert_eq!(config.second_place_bps, 3000);
            assert_eq!(config.third_place_bps, 2000);
        }
    }
}
