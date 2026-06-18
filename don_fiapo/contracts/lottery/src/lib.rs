//! # Fiapo Lottery Contract
//! 
//! Sistema de sorteios mensais e anuais para o ecossistema Don Fiapo.
//! - Sorteio mensal "God looked at you" - 5% das taxas mensais
//! - Sorteio de Natal - 5% das taxas anuais
//! - Exclui whales (top 100 carteiras)

#![cfg_attr(not(feature = "std"), no_std, no_main)]
#![allow(clippy::cast_possible_truncation)]
#![allow(unexpected_cfgs)]

#[ink::contract]
mod fiapo_lottery {
    use fiapo_logics::traits::psp22::{PSP22, PSP22Ref};
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
        /// Nenhum commitment de seed registrado antes do sorteio.
        NoCommitment,
        /// O `secret` revelado nao corresponde ao commitment.
        InvalidReveal,
        /// Reveal no mesmo bloco do commit (entropia de bloco ainda conhecida).
        RevealTooEarly,
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
        /// Commit-reveal: keccak256(secret) registrado pelo owner antes do sorteio.
        draw_commitment: Option<[u8; 32]>,
        /// Bloco em que o commitment foi registrado (reveal precisa vir depois).
        commit_block: u32,
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
                draw_commitment: None,
                commit_block: 0,
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

        /// Registra o commitment keccak256(secret) do sorteio (apenas owner).
        ///
        /// Commit-reveal: o owner commita `keccak256(secret)` ANTES do sorteio
        /// (idealmente em bloco anterior). No sorteio ele revela `secret`; o
        /// contrato valida o hash e exige que o reveal venha em bloco posterior,
        /// de forma que a entropia do bloco do sorteio nao seja conhecida no
        /// momento do commit. Isso eleva a barra contra previsao/grinding do RNG
        /// (nao e VRF; ver auditoria 2026-06-18).
        #[ink(message)]
        pub fn commit_draw_seed(&mut self, commitment: [u8; 32]) -> Result<(), LotteryError> {
            if self.env().caller() != self.owner {
                return Err(LotteryError::Unauthorized);
            }
            self.draw_commitment = Some(commitment);
            self.commit_block = self.env().block_number();
            Ok(())
        }

        /// Retorna o commitment de sorteio pendente (se houver).
        #[ink(message)]
        pub fn get_draw_commitment(&self) -> Option<[u8; 32]> {
            self.draw_commitment
        }

        /// Executa sorteio mensal. `secret` deve corresponder ao commitment.
        #[ink(message)]
        pub fn execute_monthly_draw(
            &mut self,
            eligible_wallets: Vec<(AccountId, Balance)>,
            secret: Vec<u8>,
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
                &secret,
            )?;

            self.monthly_fund = 0;
            self.last_monthly = current;

            Ok(result)
        }

        /// Executa sorteio de Natal. `secret` deve corresponder ao commitment.
        #[ink(message)]
        pub fn execute_christmas_draw(
            &mut self,
            eligible_wallets: Vec<(AccountId, Balance)>,
            secret: Vec<u8>,
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
                &secret,
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
            secret: &[u8],
        ) -> Result<DrawResult, LotteryError> {
            // Commit-reveal: valida o secret contra o commitment registrado e exige
            // que o reveal venha em bloco posterior ao commit (audit 2026-06-18).
            let commitment = self.draw_commitment.ok_or(LotteryError::NoCommitment)?;
            if Self::keccak_of(secret) != commitment {
                return Err(LotteryError::InvalidReveal);
            }
            if self.env().block_number() <= self.commit_block {
                return Err(LotteryError::RevealTooEarly);
            }

            // Filtra elegíveis: dentro da faixa de saldo E participante real
            // (comprou ticket via Oracle). Impede o owner de injetar carteiras
            // que nunca participaram (audit 2026-06-18).
            let eligible: Vec<_> = wallets.into_iter()
                .filter(|(wallet, bal)| {
                    *bal >= config.min_balance
                        && *bal <= config.max_balance
                        && self.user_tickets.get(*wallet).unwrap_or(0) > 0
                })
                .collect();

            if eligible.len() < 3 {
                return Err(LotteryError::NotEnoughParticipants);
            }

            // Seleciona 3 ganhadores via RNG commit-reveal + entropia de bloco
            let winners = self.select_winners(eligible.clone(), 3, secret, self.next_lottery_id);

            // Consome o commitment (uso único por sorteio)
            self.draw_commitment = None;

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

        /// Core: transfer via PSP22Ref (selector correto do trait IPSP22)
        fn call_core_transfer_prize(&self, to: AccountId, amount: Balance) -> Result<(), LotteryError> {
            let mut psp22: PSP22Ref = self.core_contract.into();
            match psp22.transfer(to, amount) {
                Ok(_) => Ok(()),
                _ => Err(LotteryError::Unauthorized),
            }
        }

        /// Seleciona ganhadores combinando o `secret` revelado (commit-reveal) com
        /// a entropia do bloco do sorteio, com separação de domínio por sorteio e
        /// por posição. Cada índice usa keccak256(secret, block, time, draw_id, pick).
        fn select_winners(
            &self,
            mut wallets: Vec<(AccountId, Balance)>,
            count: usize,
            secret: &[u8],
            draw_id: u64,
        ) -> Vec<AccountId> {
            let mut winners = Vec::new();
            let block = self.env().block_number();
            let time = self.env().block_timestamp();

            for i in 0..count {
                if wallets.is_empty() {
                    break;
                }
                let len = wallets.len() as u64;
                let idx = Self::derive_winner_index(secret, block, time, draw_id, i as u64, len);
                let (winner, _) = wallets.remove(idx);
                winners.push(winner);
            }

            winners
        }

        /// keccak256 de um buffer arbitrário (helper puro para commit-reveal).
        fn keccak_of(secret: &[u8]) -> [u8; 32] {
            let mut output = <[u8; 32]>::default();
            ink::env::hash_bytes::<ink::env::hash::Keccak256>(secret, &mut output);
            output
        }

        /// Deriva um índice de ganhador determinístico a partir do seed misturado.
        /// Função pura/associada para permitir teste unitário do RNG.
        fn derive_winner_index(
            secret: &[u8],
            block: u32,
            time: u64,
            draw_id: u64,
            pick: u64,
            len: u64,
        ) -> usize {
            if len == 0 {
                return 0;
            }
            let seed_data = (secret, block, time, draw_id, pick);
            let mut output = <[u8; 32]>::default();
            ink::env::hash_encoded::<ink::env::hash::Keccak256, _>(&seed_data, &mut output);
            let val = u64::from_le_bytes([
                output[0], output[1], output[2], output[3],
                output[4], output[5], output[6], output[7],
            ]);
            val.checked_rem(len).unwrap_or(0) as usize
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

        // ---------- Commit-reveal RNG (audit 2026-06-18) ----------

        fn set_caller(who: AccountId) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(who);
        }

        #[ink::test]
        fn derive_winner_index_is_deterministic_and_in_range() {
            let secret = b"a-good-secret";
            // Determinismo: mesmas entradas -> mesmo indice.
            let a = FiapoLottery::derive_winner_index(secret, 100, 9_999, 1, 0, 7);
            let b = FiapoLottery::derive_winner_index(secret, 100, 9_999, 1, 0, 7);
            assert_eq!(a, b);
            // Sempre dentro de [0, len).
            for pick in 0..50u64 {
                let idx = FiapoLottery::derive_winner_index(secret, 100, 9_999, 1, pick, 7);
                assert!(idx < 7);
            }
        }

        #[ink::test]
        fn derive_winner_index_is_sensitive_to_secret() {
            // Segredos diferentes devem produzir distribuicoes diferentes:
            // ao menos um pick difere entre dois secrets.
            let mut differs = false;
            for pick in 0..16u64 {
                let x = FiapoLottery::derive_winner_index(b"secret-one", 1, 1, 1, pick, 1000);
                let y = FiapoLottery::derive_winner_index(b"secret-two", 1, 1, 1, pick, 1000);
                if x != y {
                    differs = true;
                    break;
                }
            }
            assert!(differs);
        }

        #[ink::test]
        fn keccak_commitment_roundtrip() {
            let secret = b"reveal-me";
            let commitment = FiapoLottery::keccak_of(secret);
            assert_eq!(FiapoLottery::keccak_of(secret), commitment);
            assert_ne!(FiapoLottery::keccak_of(b"other"), commitment);
        }

        #[ink::test]
        fn commit_draw_seed_requires_owner() {
            let accounts = default_accounts();
            // owner = caller do construtor (alice por padrao)
            let mut contract = FiapoLottery::new(accounts.charlie);
            set_caller(accounts.bob);
            assert_eq!(
                contract.commit_draw_seed([1u8; 32]),
                Err(LotteryError::Unauthorized)
            );
        }

        fn prime_for_monthly_draw(contract: &mut FiapoLottery) {
            // Avanca o tempo alem do intervalo mensal e provê fundo.
            // O numero de bloco começa em 0 nos testes (commit_block sera 0 ao commitar).
            ink::env::test::set_block_timestamp::<ink::env::DefaultEnvironment>(3_000_000_000);
            let _ = contract.add_monthly_fund(1_000_000);
        }

        #[ink::test]
        fn draw_without_commitment_is_rejected() {
            let accounts = default_accounts();
            let mut contract = FiapoLottery::new(accounts.charlie);
            prime_for_monthly_draw(&mut contract);
            assert_eq!(
                contract.execute_monthly_draw(Vec::new(), b"x".to_vec()),
                Err(LotteryError::NoCommitment)
            );
        }

        #[ink::test]
        fn draw_with_wrong_secret_is_rejected() {
            let accounts = default_accounts();
            let mut contract = FiapoLottery::new(accounts.charlie);
            prime_for_monthly_draw(&mut contract);
            contract.commit_draw_seed(FiapoLottery::keccak_of(b"correct")).unwrap();
            ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
            assert_eq!(
                contract.execute_monthly_draw(Vec::new(), b"wrong".to_vec()),
                Err(LotteryError::InvalidReveal)
            );
        }

        #[ink::test]
        fn draw_revealed_same_block_is_rejected() {
            let accounts = default_accounts();
            let mut contract = FiapoLottery::new(accounts.charlie);
            prime_for_monthly_draw(&mut contract); // commit_block sera 10
            contract.commit_draw_seed(FiapoLottery::keccak_of(b"correct")).unwrap();
            // Reveal no MESMO bloco do commit -> RevealTooEarly (entropia conhecida).
            assert_eq!(
                contract.execute_monthly_draw(Vec::new(), b"correct".to_vec()),
                Err(LotteryError::RevealTooEarly)
            );
        }

        #[ink::test]
        fn draw_rejects_non_participant_wallets() {
            let accounts = default_accounts();
            let mut contract = FiapoLottery::new(accounts.charlie);
            prime_for_monthly_draw(&mut contract);
            contract.commit_draw_seed(FiapoLottery::keccak_of(b"correct")).unwrap();
            ink::env::test::advance_block::<ink::env::DefaultEnvironment>();
            // Carteiras com saldo valido mas que NUNCA compraram ticket: nao elegiveis.
            let fake = ink::prelude::vec![
                (accounts.bob, 5_000 * 100_000_000),
                (accounts.eve, 5_000 * 100_000_000),
                (accounts.frank, 5_000 * 100_000_000),
            ];
            assert_eq!(
                contract.execute_monthly_draw(fake, b"correct".to_vec()),
                Err(LotteryError::NotEnoughParticipants)
            );
        }
    }
}

#[cfg(feature = "ink-as-dependency")]
pub use self::fiapo_lottery::*;
