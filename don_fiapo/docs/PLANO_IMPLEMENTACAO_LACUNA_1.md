# Plano de Implementação - Lacuna 1: Sistema de Taxas Diferenciadas

## Objetivo

Implementar um sistema completo de taxas diferenciadas conforme especificado nos prints fornecidos, permitindo diferentes tipos de taxas para diferentes operações no contrato.

## Análise dos Requisitos

Baseado nos prints, identificamos os seguintes tipos de taxas:

1. **Taxa de Transação (SPVND)** - Taxa geral para transações
2. **Taxa de Entrada em Staking** - Taxa cobrada ao entrar em staking
3. **Taxa de Saída de Staking** - Taxa cobrada ao sair do staking
4. **Taxa de Recompensas** - Percentual sobre recompensas distribuídas
5. **Taxa de Queima** - Taxa específica para operações de burn

## Estruturas de Dados a Implementar

### 1. TransactionFees
```rust
#[derive(scale::Decode, scale::Encode, Clone, PartialEq, Eq, Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct TransactionFees {
    /// Taxa de transação geral em SPVND
    pub spvnd_transaction_fee: Balance,
    
    /// Taxa de entrada em staking (em tokens ou percentual)
    pub staking_entry_fee: Balance,
    
    /// Taxa de saída de staking (em tokens ou percentual)
    pub staking_exit_fee: Balance,
    
    /// Taxa sobre recompensas (em percentual * 100, ex: 500 = 5%)
    pub rewards_fee_percentage: u64,
    
    /// Taxa de queima em LUSDT
    pub burn_fee_lusdt: Balance,
    
    /// Taxa de queima em USDT Solana
    pub burn_fee_usdt: u64,
    
    /// Indica se as taxas são em percentual ou valor fixo
    pub is_percentage_based: bool,
}

impl Default for TransactionFees {
    fn default() -> Self {
        Self {
            spvnd_transaction_fee: 1000, // 0.001 tokens
            staking_entry_fee: 5000,      // 0.005 tokens
            staking_exit_fee: 5000,       // 0.005 tokens
            rewards_fee_percentage: 300,   // 3%
            burn_fee_lusdt: 10000,        // 0.01 LUSDT
            burn_fee_usdt: 100000,        // 0.1 USDT
            is_percentage_based: false,
        }
    }
}
```

### 2. FeeCalculationResult
```rust
#[derive(scale::Decode, scale::Encode, Clone, PartialEq, Eq, Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct FeeCalculationResult {
    /// Valor original da operação
    pub original_amount: Balance,
    
    /// Taxa calculada
    pub fee_amount: Balance,
    
    /// Valor final após dedução da taxa
    pub net_amount: Balance,
    
    /// Tipo de taxa aplicada
    pub fee_type: String,
    
    /// Se a taxa foi aplicada como percentual
    pub is_percentage: bool,
}
```

### 3. FeeManager
```rust
#[derive(scale::Decode, scale::Encode, Clone, PartialEq, Eq, Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct FeeManager {
    /// Configurações de taxas globais
    pub global_fees: TransactionFees,
    
    /// Taxas específicas por tipo de staking
    pub staking_type_fees: Mapping<String, TransactionFees>,
    
    /// Total de taxas coletadas por tipo
    pub collected_fees: Mapping<String, Balance>,
    
    /// Endereço para onde as taxas são enviadas
    pub fee_collector: AccountId,
    
    /// Se o sistema de taxas está ativo
    pub fees_enabled: bool,
}
```

## Funcionalidades a Implementar

### 1. Funções de Configuração

```rust
/// Atualiza as taxas globais
#[ink(message)]
pub fn update_global_fees(&mut self, fees: TransactionFees) -> Result<()>

/// Atualiza taxas específicas para um tipo de staking
#[ink(message)]
pub fn update_staking_type_fees(
    &mut self, 
    staking_type: String, 
    fees: TransactionFees
) -> Result<()>

/// Define o endereço coletor de taxas
#[ink(message)]
pub fn set_fee_collector(&mut self, collector: AccountId) -> Result<()>

/// Ativa/desativa o sistema de taxas
#[ink(message)]
pub fn set_fees_enabled(&mut self, enabled: bool) -> Result<()>
```

### 2. Funções de Cálculo

```rust
/// Calcula taxa de transação
pub fn calculate_transaction_fee(
    &self, 
    amount: Balance
) -> FeeCalculationResult

/// Calcula taxa de entrada em staking
pub fn calculate_staking_entry_fee(
    &self, 
    amount: Balance, 
    staking_type: Option<String>
) -> FeeCalculationResult

/// Calcula taxa de saída de staking
pub fn calculate_staking_exit_fee(
    &self, 
    amount: Balance, 
    staking_type: Option<String>
) -> FeeCalculationResult

/// Calcula taxa sobre recompensas
pub fn calculate_rewards_fee(
    &self, 
    reward_amount: Balance, 
    staking_type: Option<String>
) -> FeeCalculationResult

/// Calcula taxa de queima
pub fn calculate_burn_fee(
    &self, 
    amount: Balance, 
    payment_method: String
) -> FeeCalculationResult
```

### 3. Funções de Aplicação

```rust
/// Aplica taxa de transação e transfere para coletor
pub fn apply_transaction_fee(
    &mut self, 
    from: AccountId, 
    amount: Balance
) -> Result<Balance>

/// Aplica taxa de entrada em staking
pub fn apply_staking_entry_fee(
    &mut self, 
    from: AccountId, 
    amount: Balance, 
    staking_type: String
) -> Result<Balance>

/// Aplica taxa de saída de staking
pub fn apply_staking_exit_fee(
    &mut self, 
    from: AccountId, 
    amount: Balance, 
    staking_type: String
) -> Result<Balance>

/// Aplica taxa sobre recompensas
pub fn apply_rewards_fee(
    &mut self, 
    from: AccountId, 
    reward_amount: Balance, 
    staking_type: String
) -> Result<Balance>
```

### 4. Funções de Consulta

```rust
/// Obtém configuração de taxas globais
#[ink(message)]
pub fn get_global_fees(&self) -> TransactionFees

/// Obtém taxas específicas de um tipo de staking
#[ink(message)]
pub fn get_staking_type_fees(&self, staking_type: String) -> Option<TransactionFees>

/// Obtém total de taxas coletadas por tipo
#[ink(message)]
pub fn get_collected_fees(&self, fee_type: String) -> Balance

/// Obtém endereço coletor de taxas
#[ink(message)]
pub fn get_fee_collector(&self) -> AccountId

/// Verifica se taxas estão habilitadas
#[ink(message)]
pub fn are_fees_enabled(&self) -> bool
```

## Eventos a Implementar

```rust
/// Evento emitido quando uma taxa é aplicada
#[ink(event)]
pub struct FeeApplied {
    #[ink(topic)]
    pub from: AccountId,
    #[ink(topic)]
    pub fee_type: String,
    pub original_amount: Balance,
    pub fee_amount: Balance,
    pub net_amount: Balance,
}

/// Evento emitido quando configuração de taxas é atualizada
#[ink(event)]
pub struct FeesConfigUpdated {
    #[ink(topic)]
    pub updated_by: AccountId,
    pub fee_type: String, // "global" ou tipo específico
    pub new_config: TransactionFees,
}

/// Evento emitido quando taxas são coletadas
#[ink(event)]
pub struct FeesCollected {
    #[ink(topic)]
    pub collector: AccountId,
    pub fee_type: String,
    pub amount: Balance,
}
```

## Integração com Código Existente

### 1. Modificações no Contrato Principal

```rust
// Adicionar ao struct principal
pub struct DonFiapo {
    // ... campos existentes ...
    
    /// Gerenciador de taxas
    pub fee_manager: FeeManager,
}

// Modificar construtor
impl DonFiapo {
    #[ink(constructor)]
    pub fn new(initial_supply: Balance) -> Self {
        // ... código existente ...
        
        let fee_manager = FeeManager {
            global_fees: TransactionFees::default(),
            staking_type_fees: Mapping::default(),
            collected_fees: Mapping::default(),
            fee_collector: caller,
            fees_enabled: true,
        };
        
        Self {
            // ... campos existentes ...
            fee_manager,
        }
    }
}
```

### 2. Modificações nas Funções de Staking

```rust
// Exemplo: modificar função de entrada em staking
#[ink(message)]
pub fn stake_tokens(
    &mut self,
    amount: Balance,
    staking_type: String,
    lock_period: u32,
) -> Result<u64> {
    let caller = self.env().caller();
    
    // Aplicar taxa de entrada
    let net_amount = self.fee_manager.apply_staking_entry_fee(
        caller,
        amount,
        staking_type.clone()
    )?;
    
    // Continuar com lógica existente usando net_amount
    // ...
}
```

## Testes a Implementar

### 1. Testes Unitários

```rust
#[cfg(test)]
mod fee_tests {
    use super::*;
    
    #[ink::test]
    fn fee_calculation_works() {
        // Testa cálculo de taxas
    }
    
    #[ink::test]
    fn fee_application_works() {
        // Testa aplicação de taxas
    }
    
    #[ink::test]
    fn staking_type_specific_fees_work() {
        // Testa taxas específicas por tipo
    }
    
    #[ink::test]
    fn fee_collection_works() {
        // Testa coleta de taxas
    }
    
    #[ink::test]
    fn percentage_vs_fixed_fees_work() {
        // Testa diferentes tipos de cálculo
    }
}
```

### 2. Testes de Integração

```rust
#[ink::test]
fn full_staking_with_fees_works() {
    // Testa fluxo completo de staking com taxas
}

#[ink::test]
fn burn_with_fees_works() {
    // Testa queima com taxas
}
```

## Cronograma de Implementação

### Dia 1
- [ ] Criar estruturas de dados (TransactionFees, FeeCalculationResult, FeeManager)
- [ ] Implementar funções básicas de cálculo
- [ ] Escrever testes unitários para cálculos

### Dia 2
- [ ] Implementar funções de aplicação de taxas
- [ ] Integrar com sistema de transferências
- [ ] Implementar eventos
- [ ] Testes de aplicação de taxas

### Dia 3
- [ ] Integrar com funções de staking existentes
- [ ] Integrar com sistema de queima
- [ ] Implementar funções de configuração
- [ ] Testes de integração completos
- [ ] Documentação e revisão

## Critérios de Aceitação

- [ ] Todas as operações aplicam taxas corretamente
- [ ] Taxas podem ser configuradas globalmente e por tipo
- [ ] Sistema suporta taxas fixas e percentuais
- [ ] Taxas são coletadas e transferidas corretamente
- [ ] Eventos são emitidos adequadamente
- [ ] Cobertura de testes > 95%
- [ ] Documentação completa
- [ ] Revisão de segurança aprovada

## Considerações de Segurança

1. **Validação de Entrada**: Todas as configurações de taxa devem ser validadas
2. **Overflow Protection**: Cálculos devem usar operações seguras
3. **Access Control**: Apenas admin pode alterar configurações
4. **Reentrancy**: Funções de aplicação devem ser protegidas
5. **Fee Limits**: Implementar limites máximos para taxas

Este plano será executado seguindo metodologia TDD, com testes escritos antes da implementação.