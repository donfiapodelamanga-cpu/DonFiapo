//! Fuzz target para cálculo de APY dinâmico
//!
//! Testa a função calculate_dynamic_apy com inputs arbitrários

#![no_main]

use libfuzzer_sys::fuzz_target;
use don_fiapo_contract::apy::DynamicAPYManager;

fuzz_target!(|data: (u128, u8)| {
    let (total_burned, staking_type_idx) = data;
    
    let mut manager = DynamicAPYManager::new();
    manager.initialize_default_configs();
    
    // Mapeia índice para tipo de staking
    let staking_type = match staking_type_idx % 3 {
        0 => "Don Burn",
        1 => "Don Lunes",
        _ => "Don Fiapo",
    };
    
    // Testa cálculo de APY
    if let Ok(apy) = manager.calculate_dynamic_apy(staking_type, total_burned) {
        // Invariantes:
        // 1. APY deve estar dentro dos limites configurados
        assert!(apy >= 6, "APY abaixo do mínimo!");
        assert!(apy <= 300, "APY acima do máximo!");
    }
    // Erro é aceitável para configurações inválidas
});
