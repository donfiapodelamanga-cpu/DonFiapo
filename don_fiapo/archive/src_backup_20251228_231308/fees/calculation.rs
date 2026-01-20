//! Módulo para Cálculo de Taxas do Don Fiapo
//! 
//! Este módulo implementa um sistema completo para o cálculo de taxas
//! diferenciadas, conforme especificado nos requisitos do projeto.

use ink::prelude::string::String;
use scale::{Decode, Encode};

/// Resultado do cálculo de taxa
#[derive(Decode, Encode, Clone, PartialEq, Eq, Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct FeeCalculationResult {
    /// Valor original da operação que originou a taxa
    pub original_amount: u128,
    /// Taxa calculada
    pub fee_amount: u128,
    /// Informações sobre a taxa
    pub fee_type: String,
}

/// Gerenciador para o CÁLCULO de taxas.
/// Este struct é stateless e apenas contém a lógica de cálculo.
#[derive(Default, Debug)]
pub struct FeeCalculator;

impl FeeCalculator {
    pub fn new() -> Self {
        Self::default()
    }

    /// Calcula a taxa de entrada para staking, que é escalonada e paga em LUSDT/USDT.
    /// A taxa é baseada na quantidade de tokens $FIAPO depositados.
    ///
    /// # Args
    /// * `fiapo_amount`: A quantidade de $FIAPO a ser depositada (com 8 decimais).
    ///
    /// # Retorna
    /// `FeeCalculationResult` com o valor da taxa em `fee_amount` (com 6 decimais, para LUSDT).
    pub fn calculate_staking_entry_fee(&self, fiapo_amount: u128) -> FeeCalculationResult {
        let one_fiapo = 10u128.pow(8);
        let amount_no_decimals = fiapo_amount.saturating_div(one_fiapo);

        let percentage_bps = if amount_no_decimals <= 1_000 {
            200 // 2%
        } else if amount_no_decimals <= 10_000 {
            100 // 1%
        } else if amount_no_decimals <= 100_000 {
            50 // 0.5%
        } else if amount_no_decimals <= 500_000 {
            25 // 0.25%
        } else {
            10 // 0.1%
        };

        // A taxa é `valor_numerico_fiapo * porcentagem`. O resultado é em LUSDT (6 decimais).
        let one_lusdt = 10u128.pow(6);
        let fee_amount = amount_no_decimals
            .saturating_mul(percentage_bps as u128)
            .saturating_div(10000) // aplica a porcentagem
            .saturating_mul(one_lusdt); // adiciona 6 decimais para o LUSDT

        FeeCalculationResult {
            original_amount: fiapo_amount,
            fee_amount,
            fee_type: "staking_entry".into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calculate_staking_entry_fee_works() {
        let calculator = FeeCalculator::new();
        let one_fiapo = 10u128.pow(8);
        let one_lusdt = 10u128.pow(6);

        // Faixa 1: <= 1,000 FIAPO -> 2%
        let amount1 = 1_000 * one_fiapo;
        let result1 = calculator.calculate_staking_entry_fee(amount1);
        assert_eq!(result1.fee_amount, 20 * one_lusdt); // 2% de 1000 = 20

        // Faixa 2: 1,001 a 10,000 FIAPO -> 1%
        let amount2 = 10_000 * one_fiapo;
        let result2 = calculator.calculate_staking_entry_fee(amount2);
        assert_eq!(result2.fee_amount, 100 * one_lusdt); // 1% de 10000 = 100

        // Faixa 3: 10,001 a 100,000 FIAPO -> 0.5%
        let amount3 = 100_000 * one_fiapo;
        let result3 = calculator.calculate_staking_entry_fee(amount3);
        assert_eq!(result3.fee_amount, 500 * one_lusdt); // 0.5% de 100000 = 500

        // Faixa 4: 100,001 a 500,000 FIAPO -> 0.25%
        let amount4 = 500_000 * one_fiapo;
        let result4 = calculator.calculate_staking_entry_fee(amount4);
        assert_eq!(result4.fee_amount, 1_250 * one_lusdt); // 0.25% de 500000 = 1250

        // Faixa 5: > 500,000 FIAPO -> 0.1%
        let amount5 = 1_000_000 * one_fiapo;
        let result5 = calculator.calculate_staking_entry_fee(amount5);
        assert_eq!(result5.fee_amount, 1_000 * one_lusdt); // 0.1% de 1000000 = 1000
    }

    #[test]
    fn calculate_staking_entry_fee_edge_cases() {
        let calculator = FeeCalculator::new();
        let one_fiapo = 10u128.pow(8);
        let one_lusdt = 10u128.pow(6);

        // Limite inferior da faixa 2 (1001 FIAPO -> 1%)
        let amount1 = 1_001 * one_fiapo;
        let result1 = calculator.calculate_staking_entry_fee(amount1);
        assert_eq!(result1.fee_amount, (1001 * 1 / 100) * one_lusdt); // 1% de 1001 = 10.01 -> 10
        
        // Limite superior da faixa 2 (10000 FIAPO -> 1%)
        let amount2 = 10_000 * one_fiapo;
        let result2 = calculator.calculate_staking_entry_fee(amount2);
        assert_eq!(result2.fee_amount, (10000 * 1 / 100) * one_lusdt); // 1% de 10000 = 100

        // Valor zero
        let result_zero = calculator.calculate_staking_entry_fee(0);
        assert_eq!(result_zero.fee_amount, 0);
    }
}
