//! Fuzz target para cálculo de taxas de staking
//!
//! Testa a função calculate_staking_entry_fee com inputs arbitrários

#![no_main]

use libfuzzer_sys::fuzz_target;
use don_fiapo_contract::fees::calculation::FeeCalculator;

fuzz_target!(|amount: u128| {
    let calculator = FeeCalculator::new();
    
    // Testa cálculo de taxa de entrada de staking
    let result = calculator.calculate_staking_entry_fee(amount);
    
    // Invariantes que devem sempre ser verdadeiras:
    // 1. A taxa nunca deve ser maior que o valor original
    assert!(result.fee_amount <= result.original_amount, "Taxa maior que o original!");
    
    // 2. Original amount deve ser igual ao input
    assert!(result.original_amount == amount, "Original amount diferente do input!");
    
    // 3. Fee amount deve ser não-negativo (sempre true para u128, mas documenta a invariante)
    // 4. Fee type deve estar preenchido
    assert!(!result.fee_type.is_empty(), "Fee type vazio!");
});
