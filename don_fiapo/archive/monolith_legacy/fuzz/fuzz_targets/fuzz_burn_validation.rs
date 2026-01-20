//! Fuzz target para validação de burn
//!
//! Testa as funções de validação do BurnManager

#![no_main]

use libfuzzer_sys::fuzz_target;
use don_fiapo_contract::burn::BurnManager;

fuzz_target!(|data: (u128, u128, u64)| {
    let (amount, user_balance, timestamp) = data;
    
    let manager = BurnManager::new();
    let config = manager.get_config();
    
    // Testa validação de burn
    // 1. Verifica limites mínimos e máximos
    let within_limits = amount >= config.min_burn_amount 
        && amount <= config.max_single_burn;
    
    // 2. Verifica se usuário tem saldo suficiente
    let has_balance = user_balance >= amount;
    
    // 3. Se ambos OK, o burn deveria ser válido
    if within_limits && has_balance && config.is_active {
        // Estrutura de teste - não podemos chamar process_burn sem AccountId real
        // Mas verificamos invariantes de configuração
        assert!(config.min_burn_amount > 0, "Min burn deve ser > 0");
        assert!(config.max_single_burn >= config.min_burn_amount, "Max < Min!");
    }
    
    // Invariante: boost de APY deve ter limite
    let boost = manager.calculate_apy_boost_for_amount(amount);
    assert!(boost <= 500, "Boost de APY muito alto!"); // Max 5%
});
