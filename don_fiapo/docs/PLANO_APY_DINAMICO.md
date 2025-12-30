# 📈 PLANO DE IMPLEMENTAÇÃO: APY DINÂMICO

## 🎯 OBJETIVO

Implementar o sistema de APY dinâmico baseado no volume de queima de tokens, conforme especificado nos requisitos do projeto Don Fiapo.

---

## 📋 ESPECIFICAÇÕES TÉCNICAS

### Faixas de APY por Tipo de Staking:

| Tipo de Staking | APY Mínimo | APY Máximo | APY Atual (Fixo) |
|----------------|------------|------------|------------------|
| **Don Burn**   | 10%        | 300%       | 15% ❌           |
| **Don Lunes**  | 6%         | 37%        | 12% ❌           |
| **Don Fiapo**  | 7%         | 70%        | 10% ❌           |

### Lógica de Progressão:
- APY aumenta baseado no **volume total de queima** do usuário
- Cada threshold de queima atingido aumenta o APY
- Progressão específica por tipo de staking
- Cálculo em tempo real a cada nova queima

---

## 🏗️ ESTRUTURAS DE DADOS

### 1. Configuração de APY Dinâmico

```rust
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct DynamicAPYConfig {
    /// APY mínimo para este tipo de staking
    pub min_apy: u64,
    /// APY máximo para este tipo de staking
    pub max_apy: u64,
    /// Valor em tokens necessário para aumentar 1% no APY
    pub burn_threshold_per_apy_point: Balance,
    /// Incremento de APY por threshold atingido
    pub apy_increment: u64,
    /// Tipo de staking associado
    pub staking_type: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct UserAPYData {
    /// Total de tokens queimados pelo usuário
    pub total_burned: Balance,
    /// APY atual calculado
    pub current_apy: u64,
    /// Último timestamp de atualização
    pub last_update: u64,
    /// Próximo threshold para aumento de APY
    pub next_threshold: Balance,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct APYProgression {
    /// Threshold de queima necessário
    pub burn_threshold: Balance,
    /// APY correspondente a este threshold
    pub apy_percentage: u64,
    /// Descrição do nível
    pub level_description: String,
}
```

### 2. Gerenciador de APY Dinâmico

```rust
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct DynamicAPYManager {
    /// Configurações por tipo de staking
    pub configs: Mapping<String, DynamicAPYConfig>,
    /// Dados de APY por usuário e tipo de staking
    pub user_apy_data: Mapping<(AccountId, String), UserAPYData>,
    /// Progressões de APY por tipo
    pub apy_progressions: Mapping<String, Vec<APYProgression>>,
    /// Habilitado/Desabilitado
    pub enabled: bool,
}
```

---

## 🔧 FUNCIONALIDADES PRINCIPAIS

### 1. Configuração Inicial

```rust
/// Inicializa as configurações de APY dinâmico para todos os tipos
pub fn initialize_dynamic_apy(&mut self) -> Result<(), Error> {
    // Don Burn: 10% - 300%
    let don_burn_config = DynamicAPYConfig {
        min_apy: 10,
        max_apy: 300,
        burn_threshold_per_apy_point: 1000 * 10u128.pow(18), // 1000 tokens por 1% APY
        apy_increment: 1,
        staking_type: "Don Burn".to_string(),
    };
    
    // Don Lunes: 6% - 37%
    let don_lunes_config = DynamicAPYConfig {
        min_apy: 6,
        max_apy: 37,
        burn_threshold_per_apy_point: 2000 * 10u128.pow(18), // 2000 tokens por 1% APY
        apy_increment: 1,
        staking_type: "Don Lunes".to_string(),
    };
    
    // Don Fiapo: 7% - 70%
    let don_fiapo_config = DynamicAPYConfig {
        min_apy: 7,
        max_apy: 70,
        burn_threshold_per_apy_point: 1500 * 10u128.pow(18), // 1500 tokens por 1% APY
        apy_increment: 1,
        staking_type: "Don Fiapo".to_string(),
    };
    
    self.dynamic_apy_manager.configs.insert("Don Burn", &don_burn_config);
    self.dynamic_apy_manager.configs.insert("Don Lunes", &don_lunes_config);
    self.dynamic_apy_manager.configs.insert("Don Fiapo", &don_fiapo_config);
    
    self.dynamic_apy_manager.enabled = true;
    
    Ok(())
}
```

### 2. Cálculo de APY Dinâmico

```rust
/// Calcula o APY atual baseado no volume de queima do usuário
pub fn calculate_dynamic_apy(
    &self,
    user: AccountId,
    staking_type: String,
    total_burned: Balance,
) -> Result<u64, Error> {
    let config = self.dynamic_apy_manager.configs.get(&staking_type)
        .ok_or(Error::StakingTypeNotFound)?;
    
    // Calcula quantos thresholds foram atingidos
    let thresholds_achieved = total_burned / config.burn_threshold_per_apy_point;
    
    // Calcula APY baseado nos thresholds
    let calculated_apy = config.min_apy + (thresholds_achieved as u64 * config.apy_increment);
    
    // Garante que não exceda o máximo
    let final_apy = calculated_apy.min(config.max_apy);
    
    Ok(final_apy)
}

/// Atualiza o APY do usuário após uma nova queima
pub fn update_apy_after_burn(
    &mut self,
    user: AccountId,
    staking_type: String,
    burn_amount: Balance,
) -> Result<u64, Error> {
    let mut user_data = self.dynamic_apy_manager.user_apy_data
        .get(&(user, staking_type.clone()))
        .unwrap_or_default();
    
    // Atualiza total queimado
    user_data.total_burned += burn_amount;
    user_data.last_update = self.env().block_timestamp();
    
    // Recalcula APY
    let new_apy = self.calculate_dynamic_apy(user, staking_type.clone(), user_data.total_burned)?;
    user_data.current_apy = new_apy;
    
    // Calcula próximo threshold
    let config = self.dynamic_apy_manager.configs.get(&staking_type).unwrap();
    let current_thresholds = user_data.total_burned / config.burn_threshold_per_apy_point;
    user_data.next_threshold = (current_thresholds + 1) * config.burn_threshold_per_apy_point;
    
    // Salva dados atualizados
    self.dynamic_apy_manager.user_apy_data.insert(&(user, staking_type), &user_data);
    
    // Emite evento
    self.env().emit_event(APYUpdated {
        user,
        staking_type,
        old_apy: user_data.current_apy,
        new_apy,
        total_burned: user_data.total_burned,
        next_threshold: user_data.next_threshold,
    });
    
    Ok(new_apy)
}
```

### 3. Consultas e Relatórios

```rust
/// Obtém o APY atual do usuário para um tipo de staking
pub fn get_user_current_apy(&self, user: AccountId, staking_type: String) -> u64 {
    self.dynamic_apy_manager.user_apy_data
        .get(&(user, staking_type.clone()))
        .map(|data| data.current_apy)
        .unwrap_or_else(|| {
            self.dynamic_apy_manager.configs
                .get(&staking_type)
                .map(|config| config.min_apy)
                .unwrap_or(0)
        })
}

/// Obtém a progressão de APY para um tipo de staking
pub fn get_apy_progression(&self, staking_type: String) -> Vec<APYProgression> {
    let config = match self.dynamic_apy_manager.configs.get(&staking_type) {
        Some(config) => config,
        None => return Vec::new(),
    };
    
    let mut progressions = Vec::new();
    let mut current_apy = config.min_apy;
    let mut threshold = config.burn_threshold_per_apy_point;
    
    while current_apy <= config.max_apy {
        progressions.push(APYProgression {
            burn_threshold: threshold,
            apy_percentage: current_apy,
            level_description: format!("Nível {}: {}% APY", progressions.len() + 1, current_apy),
        });
        
        current_apy += config.apy_increment;
        threshold += config.burn_threshold_per_apy_point;
    }
    
    progressions
}

/// Calcula quanto o usuário precisa queimar para o próximo nível de APY
pub fn get_burn_needed_for_next_level(
    &self,
    user: AccountId,
    staking_type: String,
) -> Result<Balance, Error> {
    let user_data = self.dynamic_apy_manager.user_apy_data
        .get(&(user, staking_type.clone()))
        .unwrap_or_default();
    
    let config = self.dynamic_apy_manager.configs.get(&staking_type)
        .ok_or(Error::StakingTypeNotFound)?;
    
    if user_data.current_apy >= config.max_apy {
        return Ok(0); // Já atingiu o máximo
    }
    
    let current_thresholds = user_data.total_burned / config.burn_threshold_per_apy_point;
    let next_threshold = (current_thresholds + 1) * config.burn_threshold_per_apy_point;
    
    Ok(next_threshold - user_data.total_burned)
}
```

---

## 📊 EVENTOS

```rust
#[ink(event)]
pub struct APYUpdated {
    #[ink(topic)]
    pub user: AccountId,
    #[ink(topic)]
    pub staking_type: String,
    pub old_apy: u64,
    pub new_apy: u64,
    pub total_burned: Balance,
    pub next_threshold: Balance,
}

#[ink(event)]
pub struct APYLevelAchieved {
    #[ink(topic)]
    pub user: AccountId,
    #[ink(topic)]
    pub staking_type: String,
    pub level: u64,
    pub apy_percentage: u64,
    pub total_burned: Balance,
}

#[ink(event)]
pub struct APYConfigUpdated {
    #[ink(topic)]
    pub staking_type: String,
    pub min_apy: u64,
    pub max_apy: u64,
    pub threshold_per_point: Balance,
}
```

---

## 🧪 TESTES UNITÁRIOS

```rust
#[cfg(test)]
mod dynamic_apy_tests {
    use super::*;
    
    #[ink::test]
    fn test_apy_calculation_don_burn() {
        let mut contract = DonFiapo::new();
        contract.initialize_dynamic_apy().unwrap();
        
        let user = AccountId::from([0x1; 32]);
        
        // Teste APY inicial (mínimo)
        let initial_apy = contract.calculate_dynamic_apy(
            user,
            "Don Burn".to_string(),
            0,
        ).unwrap();
        assert_eq!(initial_apy, 10); // APY mínimo
        
        // Teste após queimar 1000 tokens (1 threshold)
        let apy_after_1000 = contract.calculate_dynamic_apy(
            user,
            "Don Burn".to_string(),
            1000 * 10u128.pow(18),
        ).unwrap();
        assert_eq!(apy_after_1000, 11); // 10% + 1%
        
        // Teste após queimar 10000 tokens (10 thresholds)
        let apy_after_10000 = contract.calculate_dynamic_apy(
            user,
            "Don Burn".to_string(),
            10000 * 10u128.pow(18),
        ).unwrap();
        assert_eq!(apy_after_10000, 20); // 10% + 10%
    }
    
    #[ink::test]
    fn test_apy_maximum_cap() {
        let mut contract = DonFiapo::new();
        contract.initialize_dynamic_apy().unwrap();
        
        let user = AccountId::from([0x1; 32]);
        
        // Teste com queima muito alta (deve respeitar o máximo)
        let max_apy = contract.calculate_dynamic_apy(
            user,
            "Don Burn".to_string(),
            1000000 * 10u128.pow(18), // 1 milhão de tokens
        ).unwrap();
        assert_eq!(max_apy, 300); // APY máximo para Don Burn
    }
    
    #[ink::test]
    fn test_apy_update_after_burn() {
        let mut contract = DonFiapo::new();
        contract.initialize_dynamic_apy().unwrap();
        
        let user = AccountId::from([0x1; 32]);
        
        // Primeira queima
        let new_apy = contract.update_apy_after_burn(
            user,
            "Don Lunes".to_string(),
            2000 * 10u128.pow(18),
        ).unwrap();
        assert_eq!(new_apy, 7); // 6% + 1%
        
        // Segunda queima (acumulativa)
        let updated_apy = contract.update_apy_after_burn(
            user,
            "Don Lunes".to_string(),
            2000 * 10u128.pow(18),
        ).unwrap();
        assert_eq!(updated_apy, 8); // 6% + 2%
    }
    
    #[ink::test]
    fn test_burn_needed_for_next_level() {
        let mut contract = DonFiapo::new();
        contract.initialize_dynamic_apy().unwrap();
        
        let user = AccountId::from([0x1; 32]);
        
        // Usuário queimou 500 tokens, precisa de mais 500 para próximo nível
        contract.update_apy_after_burn(
            user,
            "Don Burn".to_string(),
            500 * 10u128.pow(18),
        ).unwrap();
        
        let needed = contract.get_burn_needed_for_next_level(
            user,
            "Don Burn".to_string(),
        ).unwrap();
        
        assert_eq!(needed, 500 * 10u128.pow(18));
    }
}
```

---

## 📅 CRONOGRAMA DE IMPLEMENTAÇÃO

### **Dia 1: Estruturas e Configuração**
- ✅ Definir estruturas de dados
- ✅ Implementar `DynamicAPYManager`
- ✅ Criar função de inicialização
- ✅ Testes básicos de configuração

### **Dia 2: Lógica de Cálculo**
- ✅ Implementar `calculate_dynamic_apy`
- ✅ Implementar `update_apy_after_burn`
- ✅ Integrar com sistema de queima existente
- ✅ Testes de cálculo de APY

### **Dia 3: Consultas e Integração**
- ✅ Implementar funções de consulta
- ✅ Integrar com sistema de staking
- ✅ Atualizar cálculo de recompensas
- ✅ Testes de integração completos

### **Dia 4: Testes e Documentação**
- ✅ Testes unitários completos
- ✅ Testes de integração
- ✅ Documentação técnica
- ✅ Validação final

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

1. **✅ APY Dinâmico Funcional**
   - APY varia conforme volume de queima
   - Respeita limites mínimos e máximos
   - Cálculo em tempo real

2. **✅ Integração Completa**
   - Integrado com sistema de queima
   - Integrado com sistema de staking
   - Atualiza recompensas automaticamente

3. **✅ Consultas Disponíveis**
   - APY atual do usuário
   - Progressão de níveis
   - Queima necessária para próximo nível

4. **✅ Testes Abrangentes**
   - Cobertura de 100% das funções
   - Testes de edge cases
   - Testes de integração

5. **✅ Eventos Emitidos**
   - Atualização de APY
   - Conquista de novos níveis
   - Mudanças de configuração

---

## 🔒 CONSIDERAÇÕES DE SEGURANÇA

1. **Validação de Entrada**
   - Verificar limites de APY
   - Validar tipos de staking
   - Prevenir overflow em cálculos

2. **Controle de Acesso**
   - Apenas admin pode alterar configurações
   - Usuários só podem consultar seus dados
   - Proteção contra manipulação

3. **Consistência de Dados**
   - Atomicidade nas atualizações
   - Verificação de integridade
   - Rollback em caso de erro

4. **Performance**
   - Cálculos otimizados
   - Cache de dados frequentes
   - Limites de gas adequados

---

## 🚀 PRÓXIMOS PASSOS

Após a implementação do APY dinâmico, as próximas prioridades são:

1. **Penalidades Específicas** (Lacuna 1.2)
2. **Frequência de Pagamento de Juros** (Lacuna 1.3)
3. **Taxa de Saque de Juros** (Lacuna 1.4)
4. **Distribuição Inicial de Tokens** (Lacuna 1.5)

---

**Status:** 📋 PRONTO PARA IMPLEMENTAÇÃO
**Prioridade:** 🔴 CRÍTICA
**Estimativa:** 4 dias
**Complexidade:** ⭐⭐⭐⭐ (Alta)