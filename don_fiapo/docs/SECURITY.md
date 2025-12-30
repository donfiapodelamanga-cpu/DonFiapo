# Guia de Segurança - Don Fiapo

## Visão Geral
Este documento descreve as medidas de segurança implementadas no contrato Don Fiapo **sem depender do OpenBrush**, utilizando apenas funcionalidades nativas do ink! 4.3.0.

## Sistema de Controle de Acesso

### Roles Implementadas
- **ADMIN (0)**: Acesso total ao sistema
- **MANAGER (1)**: Gerenciamento de operações
- **ORACLE (2)**: Fonte de dados externa
- **USER (3)**: Usuário regular com privilégios básicos

### Hierarquia de Permissões
```
ADMIN → MANAGER → ORACLE → USER
```
- ADMIN tem acesso a todas as funções
- MANAGER tem acesso a funções de ORACLE e USER
- ORACLE tem acesso a funções de USER

### Funções de Segurança
```rust
// Verificar permissão
access_control.ensure_has_role(ADMIN, &caller)?;

// Verificar se é admin
access_control.is_admin(&caller);

// Conceder role (somente ADMIN)
access_control.grant_role(MANAGER, new_manager)?;

// Revogar role com proteção contra último admin
access_control.revoke_role(ADMIN, old_admin)?;
```

## Proteções Contra Vulnerabilidades

### 1. Integer Overflow/Underflow
```rust
use crate::security::MathValidator;

// Adição segura
let total = MathValidator::safe_add(balance, amount)?;

// Subtração segura
let remaining = MathValidator::safe_sub(balance, amount)?;

// Multiplicação segura
let reward = MathValidator::safe_mul(principal, rate)?;

// Divisão segura
let share = MathValidator::safe_div(total, parts)?;

// Cálculo de porcentagem segura
let fee = MathValidator::safe_percentage(amount, 500, 10000)?; // 5%
```

### 2. Reentrancy Protection
```rust
use crate::security::ReentrancyGuard;

// Em cada função crítica
let mut guard = ReentrancyGuard::new();
guard.with_guard(|| {
    // Operação crítica aqui
    Ok(result)
})?;
```

### 3. Input Validation
```rust
use crate::security::InputValidator;

// Validar endereço
InputValidator::validate_address(&recipient)?;

// Validar valor positivo
InputValidator::validate_positive_amount(amount)?;

// Validar range
InputValidator::validate_range(amount, 1000, 1_000_000)?;

// Validar string
InputValidator::validate_string(&staking_type)?;
```

### 4. Rate Limiting
```rust
use crate::security::{SecurityContext, TimeValidator};

let mut security = SecurityContext::new();

// Verificar limite de operações
security.check_rate_limit(
    current_time, 
    10, // máximo 10 operações
    3600 // em 1 hora
)?;

// Validar timestamp
TimeValidator::validate_timestamp(provided_time, current_time, 300)?;

// Validar período
TimeValidator::validate_period(start_time, end_time, 86400)?; // mínimo 1 dia
```

## Padrões de Implementação Segura

### 1. Checks-Effects-Interactions
```rust
pub fn transfer(&mut self, to: AccountId, amount: Balance) -> Result<(), Error> {
    // CHECKS
    let caller = self.env().caller();
    InputValidator::validate_address(&to)?;
    InputValidator::validate_positive_amount(amount)?;
    
    let balance = self.balance_of(caller);
    MathValidator::safe_sub(balance, amount)?;
    
    // EFFECTS
    self.balances.insert(caller, &(balance - amount));
    let new_balance = self.balance_of(to);
    self.balances.insert(to, &(new_balance + amount));
    
    // INTERACTIONS
    self.env().emit_event(Transfer { from: caller, to, value: amount });
    
    Ok(())
}
```

### 2. Access Control em Funções Críticas
```rust
pub fn update_config(&mut self, new_config: Config) -> Result<(), Error> {
    let caller = self.env().caller();
    self.access_control.ensure_has_role(ADMIN, &caller)?;
    
    // Validar nova configuração
    InputValidator::validate_positive_amount(new_config.min_amount)?;
    
    self.config = new_config;
    Ok(())
}
```

## Lista de Verificação de Segurança

### Antes de Deploy
- [ ] Todas as operações aritméticas usam MathValidator
- [ ] Funções críticas têm proteção contra reentrancy
- [ ] Inputs são validados adequadamente
- [ ] Access control está implementado corretamente
- [ ] Rate limiting está configurado
- [ ] Timestamps são validados
- [ ] Endereços zero são verificados
- [ ] Valores negativos ou zero são tratados

### Padrões de Erro
```rust
// Use sempre enums específicos
pub enum Error {
    SecurityError(String),
    ReentrancyDetected,
    InvalidInput,
    ZeroAddress,
    InvalidAmount,
    RateLimitExceeded,
    // ... outros erros
}
```

## Exemplos de Uso

### Staking com Segurança
```rust
pub fn stake(&mut self, amount: Balance) -> Result<(), Error> {
    let caller = self.env().caller();
    let current_time = self.env().block_timestamp();
    
    // Validações de segurança
    InputValidator::validate_positive_amount(amount)?;
    InputValidator::validate_address(&caller)?;
    
    let balance = self.balance_of(caller);
    MathValidator::safe_sub(balance, amount)?;
    
    // Rate limiting
    self.security_context.check_rate_limit(current_time, 5, 3600)?;
    
    // Proteção contra reentrancy
    self.reentrancy_guard.with_guard(|| {
        // Lógica de staking
        Ok(())
    })
}
```

### Burn com Validações
```rust
pub fn burn(&mut self, amount: Balance) -> Result<(), Error> {
    let caller = self.env().caller();
    
    // Validar quantidade
    InputValidator::validate_range(amount, 1000, 1_000_000_000_000)?;
    
    let balance = self.balance_of(caller);
    let new_balance = MathValidator::safe_sub(balance, amount)?;
    
    // Atualizar estado
    self.balances.insert(caller, &new_balance);
    self.total_supply = MathValidator::safe_sub(self.total_supply, amount)?;
    
    Ok(())
}
```

## Monitoramento e Auditoria

### Eventos de Segurança
Emitir eventos para:
- Mudanças de roles
- Tentativas de acesso não autorizado
- Operações críticas bem-sucedidas
- Alertas de segurança

### Logs de Auditoria
```rust
#[ink(event)]
pub struct SecurityEvent {
    action: String,
    user: AccountId,
    timestamp: u64,
    details: String,
}
```

## Conclusão

Este sistema de segurança fornece proteções robustas **sem depender de bibliotecas externas**, usando apenas funcionalidades nativas do ink! 4.3.0. Todas as validações são realizadas localmente e não aumentam significativamente o custo de gas.

Para máxima segurança, sempre:
1. Use as funções de validação fornecidas
2. Implemente checks-effects-interactions
3. Valide todos os inputs
4. Teste extensivamente
5. Realize auditoria de código antes de deploy