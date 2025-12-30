# Lacunas de Implementação - Sistema Don Fiapo

## Análise dos Prints Fornecidos

Baseado nos diagramas de fluxo e tabelas de regras de staking fornecidos, identifiquei as seguintes lacunas que precisam ser implementadas:

## 1. LACUNAS CRÍTICAS IDENTIFICADAS

### 1.1 APY Dinâmico Não Implementado

**Status:** ❌ NÃO IMPLEMENTADO

**Descrição:** Os requisitos especificam APY variável baseado no volume de queima:
- **Don Burn**: 10%-300% (atualmente fixo em 15%)
- **Don Lunes**: 6%-37% (atualmente fixo em 12%)
- **Don Fiapo**: 7%-70% (atualmente fixo em 10%)

**Implementação Necessária:**
```rust
pub struct DynamicAPYConfig {
    pub min_apy: u64,
    pub max_apy: u64,
    pub burn_threshold_multiplier: Balance,
    pub apy_increase_per_threshold: u64,
}

pub fn calculate_dynamic_apy(&self, user: AccountId, staking_type: String, total_burned: Balance) -> u64
pub fn update_apy_based_on_burn(&mut self, user: AccountId, burn_amount: Balance)
pub fn get_apy_progression(&self, staking_type: String) -> Vec<(Balance, u64)>
```

### 1.2 Penalidades Específicas Não Implementadas

**Status:** ❌ NÃO IMPLEMENTADO

**Descrição:** Penalidades específicas por tipo de staking não estão implementadas:
- **Don Burn**: "10 LUSDT + 50% capital + 80% juros"
- **Don Lunes**: "2,5% do capital" para cancelamento
- Atualmente apenas penalidades percentuais simples

**Implementação Necessária:**
```rust
pub struct SpecificPenalty {
    pub fixed_fee_lusdt: Balance,
    pub capital_percentage: u64,
    pub interest_percentage: u64,
    pub penalty_type: PenaltyType,
}

pub enum PenaltyType {
    EarlyWithdrawal,
    Cancellation,
    Standard,
}

pub fn calculate_don_burn_penalty(&self, capital: Balance, interest: Balance) -> Balance
pub fn calculate_don_lunes_cancellation(&self, capital: Balance) -> Balance
```

### 1.3 Frequência de Pagamento de Juros

**Status:** ❌ NÃO IMPLEMENTADO

**Descrição:** Frequências específicas de pagamento não implementadas:
- **Don Burn**: diário (implementado como contínuo)
- **Don Lunes**: semanal (implementado como contínuo)
- **Don Fiapo**: mensal (implementado como contínuo)

**Implementação Necessária:**
```rust
pub enum PaymentFrequency {
    Daily,
    Weekly,
    Monthly,
    Continuous,
}

pub struct InterestSchedule {
    pub frequency: PaymentFrequency,
    pub last_payment_timestamp: u64,
    pub next_payment_timestamp: u64,
    pub accumulated_interest: Balance,
}

pub fn calculate_scheduled_interest(&self, position_id: u64) -> Balance
pub fn process_scheduled_payments(&mut self) -> Result<Vec<u64>>
pub fn get_next_payment_date(&self, position_id: u64) -> u64
```

### 1.4 Taxa de Saque de Juros

**Status:** ❌ NÃO IMPLEMENTADO

**Descrição:** Taxa de 1% sobre juros sacados com distribuição específica:
- 20% para queima
- 50% para staking
- 30% para recompensas

**Implementação Necessária:**
```rust
pub struct WithdrawalFeeDistribution {
    pub burn_percentage: u64,     // 20%
    pub staking_percentage: u64,  // 50%
    pub rewards_percentage: u64,  // 30%
}

pub fn calculate_interest_withdrawal_fee(&self, interest_amount: Balance) -> Balance
pub fn distribute_withdrawal_fees(&mut self, fee_amount: Balance) -> Result<()>
pub fn process_interest_withdrawal(&mut self, position_id: u64, amount: Balance) -> Result<Balance>
```

### 1.5 Distribuição Inicial de Tokens (Tokenomics)

**Status:** ❌ NÃO IMPLEMENTADO

**Descrição:** Tokenomics de distribuição inicial não implementada:
- 80% para staking
- 7% para airdrop
- Outros fundos específicos

**Implementação Necessária:**
```rust
pub struct TokenomicsDistribution {
    pub staking_fund_percentage: u64,    // 80%
    pub airdrop_percentage: u64,         // 7%
    pub team_percentage: u64,
    pub marketing_percentage: u64,
    pub development_percentage: u64,
}

pub struct InitialDistribution {
    pub total_supply: Balance,
    pub distribution: TokenomicsDistribution,
    pub fund_addresses: Mapping<String, AccountId>,
    pub vesting_schedules: Mapping<String, VestingSchedule>,
}

pub fn initialize_tokenomics(&mut self, distribution: TokenomicsDistribution) -> Result<()>
pub fn distribute_initial_tokens(&mut self) -> Result<()>
pub fn get_fund_balance(&self, fund_name: String) -> Balance
```

## 2. LACUNAS SECUNDÁRIAS

### 2.1 Sistema de Governança

**Status:** ❌ NÃO IMPLEMENTADO

**Descrição:** Não há sistema de governança para mudanças de parâmetros.

### 2.2 Sistema de Auditoria

**Status:** ❌ NÃO IMPLEMENTADO

**Descrição:** Falta sistema de logs detalhados para auditoria.

### 2.3 Sistema de Emergência

**Status:** ❌ NÃO IMPLEMENTADO

**Descrição:** Não há mecanismos de pausa de emergência.

## 3. PRIORIZAÇÃO DAS IMPLEMENTAÇÕES

### Prioridade 1 (Crítica)
1. **Sistema de Taxas Diferenciadas** - Essencial para funcionamento correto
2. **Sistema de Equity** - Base para distribuição de recompensas
3. **Regras de Staking Específicas** - Necessário para diferentes tipos

### Prioridade 2 (Alta)
4. **Sistema de Pagamentos Solana Completo** - Melhora UX
5. **Sistema de Recompensas Avançado** - Funcionalidade core

### Prioridade 3 (Média)
6. **Sistema de Governança** - Importante para manutenção
7. **Sistema de Auditoria** - Necessário para compliance
8. **Sistema de Emergência** - Segurança adicional

## 4. ESTIMATIVA DE IMPLEMENTAÇÃO

### Lacuna 1: Sistema de Taxas Diferenciadas
- **Tempo Estimado:** 2-3 dias
- **Complexidade:** Média
- **Dependências:** Nenhuma

### Lacuna 2: Sistema de Equity
- **Tempo Estimado:** 3-4 dias
- **Complexidade:** Alta
- **Dependências:** Sistema de Taxas

### Lacuna 3: Regras de Staking Específicas
- **Tempo Estimado:** 2-3 dias
- **Complexidade:** Média
- **Dependências:** Sistema de Taxas

### Lacuna 4: Sistema de Pagamentos Solana Completo
- **Tempo Estimado:** 3-4 dias
- **Complexidade:** Alta
- **Dependências:** Sistema de Taxas

### Lacuna 5: Sistema de Recompensas Avançado
- **Tempo Estimado:** 4-5 dias
- **Complexidade:** Muito Alta
- **Dependências:** Sistema de Equity, Regras de Staking

## 5. PRÓXIMOS PASSOS

1. **Validar Priorização** com stakeholders
2. **Implementar Lacuna 1** (Sistema de Taxas Diferenciadas)
3. **Testar Implementação** com TDD
4. **Revisar Segurança** seguindo OWASP
5. **Documentar Mudanças**
6. **Prosseguir para Lacuna 2**

## 6. CONSIDERAÇÕES TÉCNICAS

### Compatibilidade
- Todas as implementações devem manter compatibilidade com código existente
- Migrações de dados podem ser necessárias

### Performance
- Implementações devem ser otimizadas para gas
- Considerar uso de lazy loading para dados complexos

### Segurança
- Cada nova funcionalidade deve passar por revisão de segurança
- Testes de penetração recomendados

### Manutenibilidade
- Código deve seguir padrões estabelecidos
- Documentação deve ser atualizada continuamente

Este documento será atualizado conforme as implementações forem realizadas.