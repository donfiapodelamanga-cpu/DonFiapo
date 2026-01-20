# 🏛️ **REGRAS ESPECIAIS DE GOVERNANÇA - DON FIAPO**

**Data:** 23 de julho de 2025  
**Versão:** 1.0  
**Status:** ✅ IMPLEMENTADO

---

## 📋 **RESUMO DAS REGRAS ESPECIAIS**

O sistema de governança do Don Fiapo agora inclui **regras específicas** para diferentes tipos de propostas, garantindo que certos aspectos do ecossistema sejam **protegidos** e outros sejam **otimizados**.

---

## 🚫 **REGRAS INEGOCIÁVEIS (PROTEGIDAS)**

### **1. 🎁 Airdrop e Sorteios - INALTERÁVEIS**
```rust
// PROIBIDO: Qualquer alteração em airdrop e sorteios
validate_airdrop_lottery_unchanged() -> Result<(), GovernanceError>
```

**O que está PROTEGIDO:**
- ✅ **Sistema de Airdrop** - Pontuação, elegibilidade, rounds
- ✅ **Sorteios Mensais** - "God looked at you"
- ✅ **Sorteios de Natal** - "God looked at you de Natal"
- ✅ **Prêmios dos Sorteios** - 5% das taxas
- ✅ **Regras de Exclusão** - Top 100 carteiras
- ✅ **Distribuição de Recompensas** - Top 12 carteiras

**Resultado:** A comunidade **NUNCA** poderá alterar as regras de airdrop e sorteios, mantendo a **justiça** e **transparência** do sistema.

### **2. 🔥 Queima Deflacionária - APENAS AUMENTAR**
```rust
// PERMITIDO: Apenas aumentar queima, NUNCA diminuir
validate_accelerated_burn_proposal() -> Result<(), GovernanceError>
```

**Regras da Queima:**
- ✅ **Apenas Aumentar** - Nunca diminuir a queima
- ✅ **Limite Total** - 200B FIAPO (não pode ser reduzido)
- ✅ **Queima Acelerada** - Medidas temporárias para queimar mais rápido
- ✅ **Duração Limitada** - 1-30 dias de queima adicional
- ✅ **Valor Controlado** - 1K-1M FIAPO por medida

**Exemplo de Proposta Válida:**
```rust
// ✅ APROVADA: Aumentar queima em 100K FIAPO por 7 dias
AcceleratedBurnProposal {
    burn_description: "Queima acelerada para reduzir supply",
    additional_burn_amount: 100_000 * 10u128.pow(8), // 100K FIAPO
    burn_duration_blocks: 7 * 24 * 60 * 60, // 7 dias
}
```

**Exemplo de Proposta INVÁLIDA:**
```rust
// ❌ REJEITADA: Diminuir queima (PROIBIDO)
AcceleratedBurnProposal {
    additional_burn_amount: -50_000 * 10u128.pow(8), // NEGATIVO = PROIBIDO
}
```

---

## 🏢 **PROPOSTAS DE LISTAGEM EM EXCHANGE**

### **Regras Específicas:**
```rust
pub struct ListingRules {
    min_listing_donation: 1000 * 10u128.pow(6),  // 1000 USDT mínimo
    max_listing_donation: 50000 * 10u128.pow(6),  // 50000 USDT máximo
    listing_verification_period: 7 * 24 * 60 * 60, // 7 dias verificação
    approved_exchanges: vec![
        "Binance", "Coinbase", "Kraken", "KuCoin", 
        "Gate.io", "MEXC", "Bybit"
    ],
}
```

### **Fluxo de Listagem:**
1. **Proposta Criada** - Governador propõe listagem
2. **Votação** - Comunidade vota (7 dias)
3. **Aprovação** - Se aprovada, aguarda 2 dias
4. **Doação Liberada** - Pagamento para exchange
5. **Verificação** - 7 dias para confirmar listagem
6. **Confirmação** - Listagem confirmada ou reembolso

### **Exchanges Aprovados:**
- ✅ **Binance** - Maior exchange global
- ✅ **Coinbase** - Exchange regulado
- ✅ **Kraken** - Exchange confiável
- ✅ **KuCoin** - Exchange popular
- ✅ **Gate.io** - Exchange acessível
- ✅ **MEXC** - Exchange emergente
- ✅ **Bybit** - Exchange de derivativos

---

## 📱 **PROPOSTAS DE MARKETING COM INFLUENCIADORES**

### **Regras Específicas:**
```rust
pub struct MarketingRules {
    min_influencer_payment: 100 * 10u128.pow(6),   // 100 USDT mínimo
    max_influencer_payment: 10000 * 10u128.pow(6), // 10000 USDT máximo
    content_verification_period: 3 * 24 * 60 * 60, // 3 dias verificação
    content_protection_period: 365 * 24 * 60 * 60, // 1 ANO de proteção
    approved_platforms: vec![
        "YouTube", "Twitter", "Instagram", "TikTok",
        "Telegram", "Discord", "Medium"
    ],
}
```

### **Fluxo de Marketing:**
1. **Proposta Criada** - Influenciador propõe conteúdo
2. **Votação** - Comunidade vota (7 dias)
3. **Aprovação** - Se aprovada, aguarda 2 dias
4. **Publicação** - Influenciador publica material
5. **Verificação** - 3 dias para verificar conteúdo
6. **Pagamento** - Pagamento liberado após verificação
7. **Proteção** - Conteúdo NÃO pode ser removido por 1 ANO

### **Plataformas Aprovadas:**
- ✅ **YouTube** - Vídeos e lives
- ✅ **Twitter** - Posts e threads
- ✅ **Instagram** - Stories e posts
- ✅ **TikTok** - Vídeos curtos
- ✅ **Telegram** - Canais e grupos
- ✅ **Discord** - Servidores e comunidades
- ✅ **Medium** - Artigos e análises

### **Proteção do Conteúdo:**
```rust
// IMPORTANTE: Conteúdo NÃO pode ser removido após pagamento
content_protection_period: 365 * 24 * 60 * 60, // 1 ANO
```

**Regra:** Após receber o pagamento, o influenciador **NÃO PODE** remover o conteúdo por **1 ANO**. Se remover, será penalizado.

---

## 💰 **PROPOSTAS DE DOAÇÃO**

### **Regras Específicas:**
```rust
pub struct DonationRules {
    min_donation_amount: 100 * 10u128.pow(6),      // 100 USDT mínimo
    max_donation_amount: 100000 * 10u128.pow(6),   // 100K USDT máximo
    accepted_currencies: vec!["USDT", "LUSDT", "LUNES"],
    donation_verification_period: 24 * 60 * 60,    // 1 dia verificação
}
```

### **Tipos de Doação:**
1. **ListingDonation** - Doação para listagem em exchange
2. **MarketingDonation** - Doação para campanhas de marketing

### **Moedas Aceitas:**
- ✅ **USDT** - Tether (rede Ethereum/Solana)
- ✅ **LUSDT** - Tether na rede Lunes
- ✅ **LUNES** - Token nativo da rede Lunes

---

## 🔒 **VALIDAÇÕES DE SEGURANÇA**

### **1. Validação de Listagem:**
```rust
pub fn validate_exchange_listing_proposal(&self, proposal: &ExchangeListingProposal) -> Result<(), GovernanceError> {
    // Verificar se doações estão habilitadas
    if !self.config.listing_rules.donations_enabled {
        return Err(GovernanceError::InvalidParameters);
    }
    
    // Verificar valor da doação (1000-50000 USDT)
    if proposal.donation_amount < self.config.listing_rules.min_listing_donation {
        return Err(GovernanceError::InvalidParameters);
    }
    
    // Verificar se exchange está aprovado
    if !self.config.listing_rules.approved_exchanges.contains(&proposal.exchange_name) {
        return Err(GovernanceError::InvalidParameters);
    }
}
```

### **2. Validação de Marketing:**
```rust
pub fn validate_influencer_marketing_proposal(&self, proposal: &InfluencerMarketingProposal) -> Result<(), GovernanceError> {
    // Verificar valor do pagamento (100-10000 USDT)
    if proposal.payment_amount < self.config.marketing_rules.min_influencer_payment {
        return Err(GovernanceError::InvalidParameters);
    }
    
    // Verificar moeda do pagamento
    let valid_currencies = vec!["USDT", "LUSDT", "LUNES"];
    if !valid_currencies.contains(&proposal.payment_currency) {
        return Err(GovernanceError::InvalidParameters);
    }
}
```

### **3. Validação de Queima:**
```rust
pub fn validate_accelerated_burn_proposal(&self, proposal: &AcceleratedBurnProposal) -> Result<(), GovernanceError> {
    // IMPORTANTE: Queima acelerada NUNCA pode reduzir a queima
    // Apenas aumentar é permitido
    
    // Verificar valor adicional (sempre positivo)
    if proposal.additional_burn_amount < self.config.burn_rules.min_additional_burn {
        return Err(GovernanceError::InvalidParameters);
    }
    
    // Verificar duração da queima (1-30 dias)
    if proposal.burn_duration_blocks < self.config.burn_rules.min_burn_duration {
        return Err(GovernanceError::InvalidParameters);
    }
}
```

### **4. Proteção de Airdrop/Sorteios:**
```rust
pub fn validate_airdrop_lottery_unchanged(&self, proposal_type: ProposalType, data: &Vec<u8>) -> Result<(), GovernanceError> {
    // PROIBIR qualquer alteração em airdrop e sorteios
    match proposal_type {
        ProposalType::ConfigChange => {
            // Se contém alterações de airdrop/sorteio, REJEITAR
            if self._contains_airdrop_lottery_changes(data) {
                return Err(GovernanceError::InvalidParameters);
            }
        },
        _ => {}
    }
}
```

---

## 📊 **EXEMPLOS PRÁTICOS**

### **Exemplo 1: Listagem no Binance**
```rust
// Proposta: Listagem no Binance por 10K USDT
ExchangeListingProposal {
    exchange_name: "Binance".to_string(),
    donation_amount: 10_000 * 10u128.pow(6), // 10K USDT
    exchange_wallet: binance_wallet,
    description: "Listagem do FIAPO no maior exchange do mundo",
    estimated_listing_date: current_time + 30_days,
}
```

### **Exemplo 2: Marketing com Influenciador**
```rust
// Proposta: Vídeo no YouTube por 5K USDT
InfluencerMarketingProposal {
    influencer_name: "Crypto Expert".to_string(),
    influencer_wallet: influencer_wallet,
    payment_amount: 5_000 * 10u128.pow(6), // 5K USDT
    payment_currency: "USDT".to_string(),
    content_description: "Análise completa do Don Fiapo no YouTube",
    publication_deadline: current_time + 14_days,
}
```

### **Exemplo 3: Queima Acelerada**
```rust
// Proposta: Queimar 100K FIAPO por 7 dias
AcceleratedBurnProposal {
    burn_description: "Queima acelerada para reduzir supply rapidamente",
    additional_burn_amount: 100_000 * 10u128.pow(8), // 100K FIAPO
    burn_duration_blocks: 7 * 24 * 60 * 60, // 7 dias
}
```

### **Exemplo 4: Doação para Marketing**
```rust
// Proposta: Doação de 20K USDT para campanha
DonationProposal {
    donation_type: "MARKETING".to_string(),
    donation_amount: 20_000 * 10u128.pow(6), // 20K USDT
    donation_currency: "USDT".to_string(),
    recipient_wallet: marketing_wallet,
    description: "Doação para campanha de marketing global",
}
```

---

## 🛡️ **PROTEÇÕES IMPLEMENTADAS**

### **✅ Proteções Ativas:**
- ✅ **Airdrop/Sorteios** - NUNCA podem ser alterados
- ✅ **Queima** - Apenas aumentar, nunca diminuir
- ✅ **Conteúdo** - NÃO pode ser removido após pagamento
- ✅ **Exchanges** - Apenas exchanges aprovados
- ✅ **Valores** - Limites mínimo/máximo para todas as propostas
- ✅ **Verificação** - Períodos de verificação obrigatórios
- ✅ **Moedas** - Apenas moedas aprovadas (USDT, LUSDT, LUNES)

### **✅ Validações Automáticas:**
- ✅ **Quorum** - 60% dos governadores devem votar
- ✅ **Timelock** - 2 dias de espera após aprovação
- ✅ **Verificação** - Períodos específicos para cada tipo
- ✅ **Proteção** - Conteúdo protegido por 1 ano
- ✅ **Limites** - Valores controlados para evitar abusos

---

## 🎯 **RESULTADO FINAL**

Com essas regras especiais implementadas, o Don Fiapo garante:

1. **🛡️ Proteção Total** - Airdrop e sorteios nunca serão alterados
2. **🔥 Queima Controlada** - Apenas aumentar, nunca diminuir
3. **🏢 Listagens Seguras** - Apenas exchanges confiáveis
4. **📱 Marketing Responsável** - Conteúdo protegido por 1 ano
5. **💰 Doações Transparentes** - Valores e moedas controlados
6. **⚖️ Governança Justa** - Regras claras e validações automáticas

**Resultado:** Um ecossistema **verdadeiramente protegido** e **sustentável** para o futuro do Don Fiapo! 🚀 