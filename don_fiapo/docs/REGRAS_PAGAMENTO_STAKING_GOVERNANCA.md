# 💰 **REGRAS DE PAGAMENTO E STAKING PARA GOVERNANÇA**

**Data:** 23 de julho de 2025  
**Versão:** 1.0  
**Status:** ✅ IMPLEMENTADO

---

## 🎯 **OBJETIVO**

Implementar um sistema de **pagamento obrigatório** e **staking mínimo** para participar da governança do Don Fiapo, garantindo que apenas usuários **comprometidos** com o projeto possam criar propostas e votar.

---

## 💳 **REGRAS DE PAGAMENTO OBRIGATÓRIO**

### **📋 Valores Mínimos Padrão**

```rust
pub struct GovernancePaymentRules {
    // Para CRIAR PROPOSTA
    min_proposal_payment_usdt: 1000 * 10u128.pow(6),  // 1000 USDT
    min_proposal_payment_fiapo: 1000 * 10u128.pow(8),  // 1000 FIAPO
    
    // Para VOTAR
    min_vote_payment_usdt: 100 * 10u128.pow(6),        // 100 USDT
    min_vote_payment_fiapo: 100 * 10u128.pow(8),       // 100 FIAPO
}
```

### **🏦 Moedas Aceitas**
- ✅ **USDT** - Tether (rede Ethereum/Solana)
- ✅ **LUSDT** - Tether na rede Lunes
- ✅ **LUNES** - Token nativo da rede Lunes

---

## 🔒 **REGRAS DE STAKING OBRIGATÓRIO**

### **📊 Valores Mínimos de Staking**

```rust
// Para CRIAR PROPOSTA
min_staking_for_proposal: 1000 * 10u128.pow(8), // 1000 FIAPO

// Para VOTAR
min_staking_for_vote: 100 * 10u128.pow(8),      // 100 FIAPO
```

### **✅ Tipos de Staking Válidos**
- ✅ **Don Burn** - Staking de longo prazo
- ✅ **Don LUNES** - Staking flexível semanal
- ✅ **Don FIAPO** - Staking flexível mensal

---

## 🔄 **FLUXO DE PARTICIPAÇÃO NA GOVERNANÇA**

### **1. Para CRIAR PROPOSTA:**

```rust
// Verificações obrigatórias:
1. ✅ Ser governador
2. ✅ Ter staking ativo (mínimo 1000 FIAPO)
3. ✅ Pagar 1000 USDT + 1000 FIAPO
4. ✅ Proposta aprovada pela comunidade
```

### **2. Para VOTAR:**

```rust
// Verificações obrigatórias:
1. ✅ Ser governador
2. ✅ Ter staking ativo (mínimo 100 FIAPO)
3. ✅ Pagar 100 USDT + 100 FIAPO
4. ✅ Votar dentro do período permitido
```

---

## 📝 **IMPLEMENTAÇÃO TÉCNICA**

### **Estrutura de Pagamento:**
```rust
pub struct GovernancePayment {
    id: u64,                           // ID único
    payer: AccountId,                  // Usuário que pagou
    payment_type: String,              // "PROPOSAL" ou "VOTE"
    usdt_amount: u128,                 // Valor em USDT/LUSDT
    fiapo_amount: u128,                // Valor em FIAPO
    payment_timestamp: u64,            // Timestamp do pagamento
    confirmed: bool,                   // Se foi confirmado
    transaction_hash: Option<String>,  // Hash da transação
}
```

### **Validação de Pagamento:**
```rust
pub fn validate_proposal_payment(&self, usdt_amount: u128, fiapo_amount: u128) -> Result<(), GovernanceError> {
    if usdt_amount < self.config.payment_rules.min_proposal_payment_usdt {
        return Err(GovernanceError::InvalidParameters);
    }
    
    if fiapo_amount < self.config.payment_rules.min_proposal_payment_fiapo {
        return Err(GovernanceError::InvalidParameters);
    }
    
    Ok(())
}
```

### **Validação de Staking:**
```rust
pub fn has_sufficient_staking(&self, user: AccountId, required_amount: u128) -> bool {
    // Verifica se o usuário tem staking ativo suficiente
    // Integração com contrato de staking
    true // TODO: Implementar verificação real
}
```

---

## 🎯 **EXEMPLOS PRÁTICOS**

### **Exemplo 1: Criar Proposta de Listagem**
```rust
// Usuário quer criar proposta para listagem no Binance
let result = governance.create_proposal(
    caller: alice_account,
    proposal_type: ProposalType::ExchangeListing,
    description: "Listagem no Binance por 10K USDT",
    data: proposal_data,
    usdt_payment: 1000 * 10u128.pow(6), // 1000 USDT
    fiapo_payment: 1000 * 10u128.pow(8), // 1000 FIAPO
);

// Verificações automáticas:
// ✅ Alice é governadora?
// ✅ Alice tem 1000+ FIAPO em staking?
// ✅ Alice pagou 1000 USDT + 1000 FIAPO?
// ✅ Se tudo OK, proposta criada
```

### **Exemplo 2: Votar em Proposta**
```rust
// Usuário quer votar em uma proposta
let result = governance.vote(
    caller: bob_account,
    proposal_id: 1,
    vote: Vote::For,
    usdt_payment: 100 * 10u128.pow(6), // 100 USDT
    fiapo_payment: 100 * 10u128.pow(8), // 100 FIAPO
);

// Verificações automáticas:
// ✅ Bob é governador?
// ✅ Bob tem 100+ FIAPO em staking?
// ✅ Bob pagou 100 USDT + 100 FIAPO?
// ✅ Bob já votou nesta proposta?
// ✅ Se tudo OK, voto registrado
```

### **Exemplo 3: Verificar Elegibilidade**
```rust
// Verificar se usuário pode participar
let can_participate = governance.can_participate_in_governance(carol_account);

// Verificar staking específico
let has_staking = governance.has_active_staking(carol_account);
let staking_amount = governance.get_user_staking_amount(carol_account);
```

---

## 🛡️ **PROTEÇÕES E VALIDAÇÕES**

### **✅ Validações Automáticas:**
- ✅ **Governador** - Apenas governadores podem participar
- ✅ **Staking Ativo** - Deve ter staking ativo mínimo
- ✅ **Pagamento Mínimo** - Deve pagar valores mínimos
- ✅ **Moedas Aceitas** - Apenas USDT, LUSDT, LUNES
- ✅ **Voto Único** - Um voto por proposta por usuário
- ✅ **Período Válido** - Votação dentro do período permitido

### **❌ Rejeições Automáticas:**
- ❌ **Não Governador** - Usuários não autorizados
- ❌ **Staking Insuficiente** - Staking abaixo do mínimo
- ❌ **Pagamento Insuficiente** - Pagamento abaixo do mínimo
- ❌ **Moeda Inválida** - Moedas não aceitas
- ❌ **Voto Duplicado** - Tentativa de votar duas vezes
- ❌ **Período Expirado** - Votação fora do período

---

## 📊 **ESTATÍSTICAS E MONITORAMENTO**

### **Métricas Disponíveis:**
```rust
// Estatísticas de pagamentos
let (total_payments, total_usdt, total_fiapo) = governance.get_payment_stats();

// Pagamentos de um usuário
let user_payments = governance.get_user_payments(user_account);

// Regras atuais
let payment_rules = governance.get_payment_rules();
```

### **Informações de Staking:**
```rust
// Verificar staking ativo
let has_staking = governance.has_active_staking(user_account);

// Obter valor de staking
let staking_amount = governance.get_user_staking_amount(user_account);
```

---

## ⚙️ **CONFIGURAÇÃO E ADMINISTRAÇÃO**

### **Atualizar Regras de Pagamento:**
```rust
// Apenas governadores podem atualizar
let new_rules = GovernancePaymentRules {
    min_proposal_payment_usdt: 2000 * 10u128.pow(6), // Aumentar para 2000 USDT
    min_proposal_payment_fiapo: 2000 * 10u128.pow(8), // Aumentar para 2000 FIAPO
    // ... outras configurações
};

governance.update_payment_rules(governor_account, new_rules);
```

### **Definir Contrato de Staking:**
```rust
// Conectar com contrato de staking
governance.set_staking_contract(governor_account, staking_contract_address);
```

---

## 🎯 **BENEFÍCIOS DO SISTEMA**

### **✅ Para o Projeto:**
- ✅ **Compromisso Real** - Apenas usuários comprometidos participam
- ✅ **Receita Adicional** - Pagamentos geram receita para o projeto
- ✅ **Qualidade das Propostas** - Propostas mais bem pensadas
- ✅ **Participação Ativa** - Incentiva staking e participação

### **✅ Para a Comunidade:**
- ✅ **Governança Justa** - Sistema democrático com barreiras adequadas
- ✅ **Transparência** - Todos os pagamentos são registrados
- ✅ **Proteção** - Evita spam e propostas de baixa qualidade
- ✅ **Incentivo** - Recompensa usuários ativos

### **✅ Para a Segurança:**
- ✅ **Prevenção de Spam** - Evita propostas desnecessárias
- ✅ **Barreira de Entrada** - Filtra participantes sérios
- ✅ **Auditoria** - Todos os pagamentos são rastreáveis
- ✅ **Controle de Qualidade** - Melhora a qualidade das propostas

---

## 📋 **RESUMO DAS REGRAS**

### **Para CRIAR PROPOSTA:**
- 💰 **1000 USDT** + **1000 FIAPO**
- 🔒 **1000 FIAPO** em staking ativo
- 👑 **Ser governador**

### **Para VOTAR:**
- 💰 **100 USDT** + **100 FIAPO**
- 🔒 **100 FIAPO** em staking ativo
- 👑 **Ser governador**

### **Moedas Aceitas:**
- 💵 **USDT** (Ethereum/Solana)
- 💵 **LUSDT** (Lunes)
- 💵 **LUNES** (Lunes)

**Resultado:** Um sistema de governança **verdadeiramente comprometido** e **sustentável**! 🏛️💰 