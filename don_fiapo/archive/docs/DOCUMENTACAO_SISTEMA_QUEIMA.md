# Documentação do Sistema de Queima de Tokens - Don Fiapo

## Visão Geral

O sistema de queima de tokens foi implementado para permitir que qualquer carteira possa queimar tokens pagando uma pequena taxa em USDT. Este sistema também inclui funcionalidades para afiliados aumentarem o poder do APY dos stakings através da queima de moedas.

## Funcionalidades Implementadas

### 1. Queima de Tokens com Taxa em LUSDT

**Função:** `burn_tokens_with_lusdt`

```rust
pub fn burn_tokens_with_lusdt(
    &mut self,
    amount: Balance,
    fee_lusdt: Balance
) -> Result<BurnResult>
```

**Descrição:**
- Permite queimar tokens pagando uma taxa em LUSDT (token nativo da rede Lunes)
- Valida se o usuário possui saldo suficiente tanto para a queima quanto para a taxa
- Atualiza estatísticas de queima do usuário
- Calcula e aplica APY dinâmico baseado na quantidade queimada
- Emite evento de queima realizada

**Parâmetros:**
- `amount`: Quantidade de tokens a serem queimados
- `fee_lusdt`: Taxa em LUSDT a ser paga pela queima

**Retorno:**
- `BurnResult` contendo informações sobre a queima realizada

### 2. Queima de Tokens com Taxa em USDT Solana

**Função:** `initiate_burn_with_solana_usdt`

```rust
pub fn initiate_burn_with_solana_usdt(
    &mut self,
    amount: Balance,
    solana_usdt_address: [u8; 32]
) -> Result<u64>
```

**Descrição:**
- Inicia processo de queima com pagamento da taxa via USDT na rede Solana
- Cria um pagamento pendente no bridge Solana
- Calcula automaticamente a taxa necessária em USDT
- Retorna ID do pagamento para confirmação posterior

**Parâmetros:**
- `amount`: Quantidade de tokens a serem queimados
- `solana_usdt_address`: Endereço USDT na rede Solana para pagamento

**Retorno:**
- ID do pagamento pendente (`u64`)

### 3. Confirmação de Pagamento de Queima

**Função:** `confirm_burn_payment`

```rust
pub fn confirm_burn_payment(
    &mut self,
    payment_id: u64
) -> Result<BurnResult>
```

**Descrição:**
- Confirma um pagamento de queima previamente iniciado
- Valida se o pagamento foi processado no bridge Solana
- Executa a queima dos tokens
- Atualiza estatísticas e APY dinâmico

**Parâmetros:**
- `payment_id`: ID do pagamento a ser confirmado

**Retorno:**
- `BurnResult` contendo informações sobre a queima realizada

### 4. Consulta de Estatísticas de Queima

**Função:** `get_user_burn_stats`

```rust
pub fn get_user_burn_stats(&self, user: AccountId) -> UserBurnStats
```

**Descrição:**
- Retorna estatísticas completas de queima de um usuário
- Inclui total queimado, número de queimas e última queima

### 5. Consulta de APY Dinâmico

**Função:** `get_user_dynamic_apy`

```rust
pub fn get_user_dynamic_apy(
    &self,
    user: AccountId,
    staking_type: String
) -> u64
```

**Descrição:**
- Retorna o APY dinâmico atual do usuário para um tipo específico de staking
- O APY aumenta baseado na quantidade total de tokens queimados pelo usuário

### 6. Configuração do Sistema de Queima

**Função:** `get_burn_config` e `update_burn_config`

```rust
pub fn get_burn_config(&self) -> BurnConfig
pub fn update_burn_config(&mut self, config: BurnConfig) -> Result<()>
```

**Descrição:**
- Permite consultar e atualizar configurações do sistema de queima
- Inclui taxas, limites e parâmetros de APY dinâmico

## Estruturas de Dados

### BurnConfig
```rust
pub struct BurnConfig {
    pub base_fee_lusdt: Balance,        // Taxa base em LUSDT
    pub base_fee_usdt: u64,             // Taxa base em USDT Solana
    pub min_burn_amount: Balance,       // Quantidade mínima para queima
    pub max_burn_amount: Balance,       // Quantidade máxima para queima
    pub apy_boost_factor: u64,          // Fator de boost do APY
    pub max_apy_boost: u64,             // Boost máximo do APY
}
```

### BurnRecord
```rust
pub struct BurnRecord {
    pub user: AccountId,                // Usuário que realizou a queima
    pub amount: Balance,                // Quantidade queimada
    pub fee_paid: Balance,              // Taxa paga
    pub payment_method: String,         // Método de pagamento usado
    pub timestamp: u64,                 // Timestamp da queima
    pub transaction_hash: Option<String>, // Hash da transação (se aplicável)
}
```

### UserBurnStats
```rust
pub struct UserBurnStats {
    pub total_burned: Balance,          // Total de tokens queimados
    pub burn_count: u32,                // Número de queimas realizadas
    pub last_burn_timestamp: u64,       // Timestamp da última queima
    pub total_fees_paid: Balance,       // Total de taxas pagas
}
```

### BurnResult
```rust
pub struct BurnResult {
    pub amount_burned: Balance,         // Quantidade queimada
    pub fee_paid: Balance,              // Taxa paga
    pub new_apy_don_lunes: u64,         // Novo APY para DonLunes
    pub new_apy_don_fiapo: u64,         // Novo APY para DonFiapo
    pub burn_id: u64,                   // ID único da queima
}
```

## Sistema de APY Dinâmico

O sistema implementa um mecanismo de APY dinâmico onde:

1. **Base APY**: Cada tipo de staking tem um APY base
2. **Boost por Queima**: Usuários que queimam tokens recebem boost no APY
3. **Cálculo do Boost**: `boost = min(total_queimado * fator_boost, boost_máximo)`
4. **APY Final**: `apy_final = apy_base + boost`

### Tipos de Staking Suportados
- **DonLunes**: Staking do token DonLunes
- **DonFiapo**: Staking do token DonFiapo

## Eventos Emitidos

### TokensBurned
```rust
#[ink(event)]
pub struct TokensBurned {
    #[ink(topic)]
    pub user: AccountId,
    pub amount: Balance,
    pub fee_paid: Balance,
    pub payment_method: String,
    pub new_apy_don_lunes: u64,
    pub new_apy_don_fiapo: u64,
}
```

## Integração com Bridge Solana

O sistema está integrado com o bridge Solana para permitir pagamentos em USDT:

1. **Criação de Pagamento**: `create_burn_payment`
2. **Consulta de Pagamento**: `get_burn_payment`
3. **Marcação como Processado**: `mark_burn_payment_processed`

## Segurança e Validações

1. **Validação de Saldo**: Verifica se o usuário possui tokens suficientes
2. **Validação de Taxa**: Confirma se a taxa foi paga corretamente
3. **Limites de Queima**: Respeita valores mínimos e máximos configurados
4. **Prevenção de Reentrância**: Usa padrões seguros do Ink!
5. **Validação de Pagamentos**: Confirma pagamentos via bridge antes da queima

## Casos de Uso

### 1. Usuário Regular Queimando Tokens
```rust
// Queima com LUSDT
let result = contract.burn_tokens_with_lusdt(1000, 10)?;

// Queima com USDT Solana
let payment_id = contract.initiate_burn_with_solana_usdt(1000, solana_address)?;
// ... após pagamento confirmado ...
let result = contract.confirm_burn_payment(payment_id)?;
```

### 2. Afiliado Aumentando APY
```rust
// Afiliado queima tokens para aumentar APY dos seus stakings
let result = contract.burn_tokens_with_lusdt(5000, 50)?;

// Verifica novo APY
let new_apy = contract.get_user_dynamic_apy(afiliado_account, "DonLunes".to_string());
```

### 3. Consulta de Estatísticas
```rust
// Consulta estatísticas de queima
let stats = contract.get_user_burn_stats(user_account);

// Consulta APY atual
let apy = contract.get_user_dynamic_apy(user_account, "DonFiapo".to_string());
```

## Considerações Técnicas

1. **Gas Otimizado**: Funções otimizadas para consumo mínimo de gas
2. **Armazenamento Eficiente**: Uso de mappings para dados de usuários
3. **Eventos Indexados**: Eventos com tópicos para facilitar consultas
4. **Modularidade**: Código organizado em módulos separados
5. **Testabilidade**: Cobertura completa de testes unitários

## Próximos Passos

Este documento serve como base para futuras implementações e melhorias do sistema de queima de tokens.