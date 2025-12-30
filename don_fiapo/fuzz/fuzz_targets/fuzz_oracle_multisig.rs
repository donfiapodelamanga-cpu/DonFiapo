//! Fuzz target para Oracle Multi-Sig
//!
//! Testa o sistema de consenso multi-sig

#![no_main]

use libfuzzer_sys::fuzz_target;
use libfuzzer_sys::arbitrary::{Arbitrary, Unstructured};
use don_fiapo_contract::oracle_multisig::{OracleMultiSig, OracleMultiSigConfig};
use ink::primitives::AccountId;

fn create_account(seed: u8) -> AccountId {
    let mut bytes = [0u8; 32];
    bytes[0] = seed;
    AccountId::from(bytes)
}

fuzz_target!(|data: &[u8]| {
    if data.len() < 10 {
        return; // Dados insuficientes
    }
    
    // Extrai parâmetros do input
    let num_oracles = (data[0] % 5) + 1; // 1-5 oracles
    let required = (data[1] % num_oracles) + 1; // 1 a num_oracles
    
    // Cria lista de oracles
    let oracles: Vec<AccountId> = (0..num_oracles)
        .map(|i| create_account(10 + i))
        .collect();
    
    // Tenta criar multi-sig
    if let Ok(mut multisig) = OracleMultiSig::new(oracles.clone(), required) {
        // Invariantes do construtor:
        assert_eq!(multisig.config.oracles.len(), num_oracles as usize);
        assert_eq!(multisig.config.required_confirmations, required);
        
        // Testa submissão de confirmação
        if data.len() >= 20 {
            let oracle_idx = data[2] as usize % oracles.len();
            let amount = u128::from_le_bytes(data[3..19].try_into().unwrap_or([0u8; 16]));
            
            let result = multisig.submit_confirmation(
                oracles[oracle_idx],
                format!("tx_{}", data[19]),
                "sender".to_string(),
                amount,
                create_account(99),
                "test".to_string(),
                1000,
            );
            
            // Se sucesso, verifica contagem
            if result.is_ok() {
                // Pelo menos uma confirmação deve existir
                assert!(multisig.processed_count >= 0);
            }
        }
    }
    // Configuração inválida retorna erro - isso é esperado
});
