# 🚀 Plano de Implementação - APY Dinâmico

**Data:** 25 de janeiro de 2025  
**Prioridade:** 🔴 CRÍTICA  
**Status:** 📋 PLANEJAMENTO  

---

## 🎯 **Objetivo**

Implementar sistema de APY dinâmico que varia baseado no volume de queima de tokens, conforme especificado nos requisitos:

- **Don Burn**: 10%-300% APY
- **Don Lunes**: 6%-37% APY  
- **Don Fiapo**: 7%-70% APY

---

## 📊 **Análise da Lacuna Atual**

### **Problema Identificado:**
- APY atualmente fixo para todos os tipos de staking
- Não há correlação entre volume de queima e recompensas
- Sistema não incentiva adequadamente a queima de tokens

### **Impacto:**
- Tokenomics não funcionam conforme planejado
- Falta de incentivo para queima (deflação)
- APY não reflete atividade do ecossistema

---

## 🏗️ **Arquitetura da Solução**

### **1. Estruturas de Dados**

```rust
/// Configuração de APY dinâmico por tipo de staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
pub struct DynamicAPYConfig {
    pub min_apy: u16,           // APY mínimo (em basis points)
    pub max_apy: u16,           // APY máximo (em basis points)
    pub burn_threshold_base: u128,  // Volume base de queima
    pub threshold_multiplier: u128, // Multiplicador para próximo nível
    pub apy_increment: u16,     // Incremento de APY por nível
}

/// Histórico de queima para cálculo de APY
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
pub struct BurnHistory {
    pub total_burned: u128,     // Total queimado histórico
    pub last_24h_burned: u128,  // Queimado nas últimas 24h
    pub last_7d_burned: u128,   // Queimado nos últimos 7 dias
    pub last_30d_burned: u128,  // Queimado nos últimos 30 dias
    pub last_update: u64,       // Timestamp da última atualização
}

/// Resultado do cálculo de APY
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
pub struct APYCalculationResult {
    pub current_apy: u16,       // APY atual (basis points)
    pub burn_level: u8,         // Nível baseado na queima (0-10)
    pub next_threshold: u128,   // Próximo threshold para aumento
    pub time_weighted_burn: u128, // Queima ponderada por tempo
}
```

### **2. Gerenciador de APY Dinâmico**

```rust
pub struct DynamicAPYManager {
    configs: Mapping<StakingType, DynamicAPYConfig>,
    burn_history: BurnHistory,
    apy_cache: Mapping<StakingType, (u16, u64)>, // (APY, timestamp)
    update_frequency: u64, // Frequência de atualização (segundos)
}
```

---

## ⚙️ **Algoritmo de Cálculo**

### **1. Fórmula Base**

```
APY = min_apy + (burn_level * apy_increment)
onde:
- burn_level = floor(log2(time_weighted_burn / burn_threshold_base))
- time_weighted_burn = (24h * 0.5) + (7d * 0.3) + (30d * 0.2)
```

### **2. Configurações por Tipo**

| Tipo | Min APY | Max APY | Base Threshold | Increment |
|------|---------|---------|----------------|----------|
| Don Burn | 10% | 300% | 1M FIAPO | 29% |
| Don Lunes | 6% | 37% | 500K FIAPO | 3.1% |
| Don Fiapo | 7% | 70% | 750K FIAPO | 6.3% |

### **3. Ponderação Temporal**

- **24h**: 50% do peso (incentiva atividade recente)
- **7d**: 30% do peso (estabilidade semanal)
- **30d**: 20% do peso (tendência mensal)

---

## 🔧 **Implementação Técnica**

### **Fase 1: Estruturas Base (2 horas)**
1. Criar estruturas de dados
2. Implementar `DynamicAPYManager`
3. Adicionar configurações iniciais

### **Fase 2: Algoritmo de Cálculo (3 horas)**
1. Implementar fórmula de cálculo
2. Adicionar ponderação temporal
3. Criar sistema de cache

### **Fase 3: Integração (2 horas)**
1. Integrar com sistema de staking
2. Conectar com sistema de queima
3. Atualizar hooks existentes

### **Fase 4: Testes (3 horas)**
1. Testes unitários para cada função
2. Testes de integração
3. Simulação de cenários reais

---

## 🧪 **Casos de Teste**

### **Teste 1: APY Mínimo**
- **Cenário**: Sem queima recente
- **Esperado**: APY = min_apy para cada tipo

### **Teste 2: APY Máximo**
- **Cenário**: Queima massiva
- **Esperado**: APY = max_apy (limitado)

### **Teste 3: Progressão Gradual**
- **Cenário**: Queima crescente ao longo do tempo
- **Esperado**: APY aumenta gradualmente

### **Teste 4: Ponderação Temporal**
- **Cenário**: Queima antiga vs recente
- **Esperado**: Queima recente tem mais peso

---

## 📈 **Benefícios Esperados**

### **Econômicos**
- ✅ Incentivo real para queima de tokens
- ✅ Deflação acelerada em períodos de alta atividade
- ✅ APY justo baseado na saúde do ecossistema

### **Técnicos**
- ✅ Sistema responsivo a mudanças de mercado
- ✅ Algoritmo transparente e auditável
- ✅ Performance otimizada com cache

### **Usuário**
- ✅ Recompensas maiores em períodos ativos
- ✅ Incentivo para participação no ecossistema
- ✅ Transparência total dos cálculos

---

## 🚨 **Considerações de Segurança**

### **Proteções Implementadas**
1. **Limites Rígidos**: APY nunca excede max_apy
2. **Validação de Entrada**: Todos os parâmetros são validados
3. **Cache Seguro**: Prevenção de manipulação
4. **Auditoria**: Logs completos de mudanças

### **Ataques Prevenidos**
- **Manipulação de APY**: Limites e validações
- **Flash Burn**: Ponderação temporal
- **Cache Poisoning**: Validação de timestamps

---

## 📋 **Próximos Passos**

### **Imediato (Hoje)**
1. ✅ Criar este plano
2. 🔄 Implementar estruturas base
3. 🔄 Começar algoritmo de cálculo

### **Curto Prazo (1-2 dias)**
4. Completar implementação
5. Criar testes abrangentes
6. Integrar com sistema existente

### **Médio Prazo (3-5 dias)**
7. Testes em testnet
8. Otimizações de performance
9. Documentação completa

---

## 🎯 **Critérios de Sucesso**

- [ ] APY varia corretamente baseado na queima
- [ ] Todos os testes passam (100%)
- [ ] Performance mantida (< 100ms por cálculo)
- [ ] Integração sem quebras
- [ ] Documentação completa
- [ ] Deploy em testnet bem-sucedido

**Status:** 🚀 **PRONTO PARA IMPLEMENTAÇÃO**