# 🚀 Melhorias Futuras - Don Fiapo

Este documento lista melhorias técnicas planejadas para versões futuras do projeto.

---

## 1. Indexador Off-Chain para Governança

### Problema
A função `get_user_payments` em `governance.rs` itera sobre todos os IDs de pagamento históricos. Com milhares de propostas, isso consome gás excessivo.

### Solução Proposta
Implementar um **indexador off-chain** que escuta os eventos do contrato:

1. **Eventos emitidos:** `GovernancePaymentRegistered`, `ProposalCreated`, `VoteCast`
2. **Indexador:** Subsquid, Subquery ou solução customizada
3. **Banco de dados:** PostgreSQL para armazenar dados indexados
4. **API:** GraphQL ou REST para consultas do frontend

### Arquitetura
```
[Contrato] → [Eventos Blockchain] → [Indexador] → [PostgreSQL] → [API] → [Frontend]
```

### Benefícios
- ✅ Zero custo de gás para consultas
- ✅ Consultas complexas (filtros, ordenação, paginação)
- ✅ Não requer upgrade do contrato
- ✅ Escalabilidade infinita

### Prioridade
**Média** - Implementar quando houver volume significativo de propostas (>1000).

---

## 2. Multi-Sig para Oracle

### Problema
O Oracle é um ponto único de falha para pagamentos Solana e atualização de lista de Whales.

### Solução
Implementar multi-sig com 2-de-3 ou 3-de-5 assinaturas para operações críticas.

### Prioridade
**Alta** - Antes do lançamento em mainnet.

---

## 3. Cache de APY

### Problema
Cálculo de APY dinâmico é computacionalmente custoso.

### Solução
Implementar cache de APY calculado com atualização periódica (a cada bloco ou hora).

### Prioridade
**Baixa** - Otimização de performance futura.
