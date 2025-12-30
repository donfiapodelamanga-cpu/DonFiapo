//! Testes de integração para funcionalidades Solana
//!
//! Este módulo contém testes específicos para as funcionalidades
//! de pagamento de taxas de staking via USDT da rede Solana.

#[cfg(test)]
mod tests {
    use crate::don_fiapo::{DonFiapo, Error};
    use crate::solana_bridge::{PaymentMethod, PaymentStatus};
    use ink::env::test;
    use ink::primitives::AccountId;

    fn default_accounts() -> test::DefaultAccounts<ink::env::DefaultEnvironment> {
        test::default_accounts::<ink::env::DefaultEnvironment>()
    }

    fn set_next_caller(caller: AccountId) {
        test::set_caller::<ink::env::DefaultEnvironment>(caller);
    }

    fn init_contract() -> DonFiapo {
        let accounts = default_accounts();
        set_next_caller(accounts.alice);
        
        DonFiapo::new(
            accounts.bob,     // burn_wallet
            accounts.charlie, // staking_fund
            accounts.django,  // rewards_fund
            accounts.eve,     // airdrop_wallet
            accounts.frank,   // marketing_wallet
            accounts.alice,   // charity_wallet
            accounts.bob,     // ieo_wallet
            accounts.charlie, // team_wallet
        )
    }

    #[ink::test]
    fn initiate_solana_staking_payment_works() {
        let mut contract = init_contract();
        let accounts = default_accounts();
        
        // Define o caller como um usuário
        set_next_caller(accounts.eve);
        
        // Tenta iniciar um pagamento para 10.000 FIAPO
        let fiapo_amount = 10_000u128 * 10u128.pow(8); // 10.000 FIAPO
        let result = contract.initiate_solana_staking_payment(fiapo_amount);
        
        assert!(result.is_ok());
        let payment_id = result.unwrap();
        assert_eq!(payment_id, 1);
        
        // Verifica se o pagamento foi armazenado
        let payment = contract.get_staking_payment(payment_id);
        assert!(payment.is_some());
        
        let payment = payment.unwrap();
        assert_eq!(payment.user_account, accounts.eve);
        assert_eq!(payment.fiapo_amount, fiapo_amount);
        assert_eq!(payment.payment_method, PaymentMethod::SolanaUSDT);
        assert_eq!(payment.status, PaymentStatus::Pending);
    }

    #[ink::test]
    fn calculate_solana_usdt_amount_works() {
        let contract = init_contract();
        
        // Testa cálculo para diferentes faixas
        
        // Faixa 1: 500 FIAPO (10% de taxa)
        let fiapo_amount = 500u128 * 10u128.pow(8);
        let result = contract.calculate_solana_usdt_amount(fiapo_amount);
        assert!(result.is_ok());
        
        // Faixa 2: 5.000 FIAPO (5% de taxa)
        let fiapo_amount = 5_000u128 * 10u128.pow(8);
        let result = contract.calculate_solana_usdt_amount(fiapo_amount);
        assert!(result.is_ok());
        
        // Faixa 3: 50.000 FIAPO (2,5% de taxa)
        let fiapo_amount = 50_000u128 * 10u128.pow(8);
        let result = contract.calculate_solana_usdt_amount(fiapo_amount);
        assert!(result.is_ok());
    }

    #[ink::test]
    fn get_solana_usdt_address_works() {
        let contract = init_contract();
        
        let address = contract.get_solana_usdt_address();
        assert!(!address.is_empty());
        assert_eq!(address, "DonFiapoUSDTReceiver1234567890123456789012");
    }

    #[ink::test]
    fn confirm_solana_payment_unauthorized_fails() {
        let mut contract = init_contract();
        let accounts = default_accounts();
        
        // Configura oracle autorizado (alice)
        set_next_caller(accounts.alice); // admin
        contract.set_authorized_oracle(accounts.alice).unwrap();
        
        // Cria um pagamento primeiro
        set_next_caller(accounts.eve);
        let payment_id = contract.initiate_solana_staking_payment(10_000u128 * 10u128.pow(8)).unwrap();
        
        // Usuário não autorizado (bob) tenta confirmar pagamento
        set_next_caller(accounts.bob); // não é o oracle autorizado
        
        let result = contract.confirm_solana_payment(
            payment_id,
            "tx_hash_123".to_string(),
            "sender_address".to_string(),
            1_000_000, // 1 USDT
            1000000,   // timestamp
            12345,     // block_number
        );
        
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::UnauthorizedOracle);
    }

    #[ink::test]
    fn confirm_solana_payment_nonexistent_fails() {
        let mut contract = init_contract();
        let accounts = default_accounts();
        
        // Admin tenta confirmar pagamento inexistente
        set_next_caller(accounts.alice); // admin
        
        let result = contract.confirm_solana_payment(
            999, // ID inexistente
            "tx_hash_123".to_string(),
            "sender_address".to_string(),
            1_000_000,
            1000000,
            12345,
        );
        
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::PaymentNotFound);
    }

    #[ink::test]
    fn full_solana_payment_flow_works() {
        let mut contract = init_contract();
        let accounts = default_accounts();
        
        // 0. Configura o oracle autorizado
        set_next_caller(accounts.alice); // admin
        contract.set_authorized_oracle(accounts.alice).unwrap();
        
        // 1. Usuário inicia pagamento
        set_next_caller(accounts.eve);
        let fiapo_amount = 10_000u128 * 10u128.pow(8);
        let payment_id = contract.initiate_solana_staking_payment(fiapo_amount).unwrap();
        
        // 2. Verifica estado inicial
        let payment = contract.get_staking_payment(payment_id).unwrap();
        assert_eq!(payment.status, PaymentStatus::Pending);
        assert!(payment.solana_payment.is_none());
        
        // 3. Oracle confirma pagamento
        set_next_caller(accounts.alice); // oracle autorizado
        let result = contract.confirm_solana_payment(
            payment_id,
            "0x123abc".to_string(),
            "SolanaAddress123".to_string(),
            payment.fee_amount as u64,
            1000000,
            12345,
        );
        
        assert!(result.is_ok());
        
        // 4. Verifica estado final
        let updated_payment = contract.get_staking_payment(payment_id).unwrap();
        assert_eq!(updated_payment.status, PaymentStatus::Confirmed);
        assert!(updated_payment.solana_payment.is_some());
        
        let solana_payment = updated_payment.solana_payment.unwrap();
        assert_eq!(solana_payment.transaction_hash, "0x123abc");
        assert_eq!(solana_payment.sender_address, "SolanaAddress123");
    }

    #[ink::test]
    fn multiple_payments_work() {
        let mut contract = init_contract();
        let accounts = default_accounts();
        
        // Usuário 1 faz pagamento
        set_next_caller(accounts.eve);
        let payment_id_1 = contract.initiate_solana_staking_payment(1_000u128 * 10u128.pow(8)).unwrap();
        
        // Usuário 2 faz pagamento
        set_next_caller(accounts.frank);
        let payment_id_2 = contract.initiate_solana_staking_payment(5_000u128 * 10u128.pow(8)).unwrap();
        
        // Verifica que os IDs são diferentes
        assert_ne!(payment_id_1, payment_id_2);
        assert_eq!(payment_id_1, 1);
        assert_eq!(payment_id_2, 2);
        
        // Verifica que ambos os pagamentos existem
        let payment_1 = contract.get_staking_payment(payment_id_1).unwrap();
        let payment_2 = contract.get_staking_payment(payment_id_2).unwrap();
        
        assert_eq!(payment_1.user_account, accounts.eve);
        assert_eq!(payment_2.user_account, accounts.frank);
        assert_eq!(payment_1.fiapo_amount, 1_000u128 * 10u128.pow(8));
        assert_eq!(payment_2.fiapo_amount, 5_000u128 * 10u128.pow(8));
    }

    #[ink::test]
    fn fee_calculation_different_tiers_works() {
        let contract = init_contract();
        
        // Testa diferentes faixas de taxa
        let test_cases = [
            (500u128 * 10u128.pow(8), "Faixa 1 - 10%"),
            (5_000u128 * 10u128.pow(8), "Faixa 2 - 5%"),
            (50_000u128 * 10u128.pow(8), "Faixa 3 - 2.5%"),
            (200_000u128 * 10u128.pow(8), "Faixa 4 - 1%"),
            (1_000_000u128 * 10u128.pow(8), "Faixa 5 - 0.5%"),
        ];
        
        for (fiapo_amount, description) in test_cases.iter() {
            let result = contract.calculate_solana_usdt_amount(*fiapo_amount);
            assert!(result.is_ok(), "Falha no cálculo para {}", description);
            
            let usdt_amount = result.unwrap();
            assert!(usdt_amount > 0, "Taxa deve ser maior que zero para {}", description);
        }
    }
}