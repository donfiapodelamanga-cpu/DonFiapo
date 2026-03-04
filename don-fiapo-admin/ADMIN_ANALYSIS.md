# Don Fiapo Admin Panel — Análise de Integração

**Data:** 25/02/2026  
**Escopo:** Mapeamento completo de funcionalidades, gargalos e plano on-chain vs off-chain

---

## 1. Arquitetura Atual

| Componente | Tecnologia |
|------------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via Prisma (off-chain) |
| Blockchain | Polkadot.js + @polkadot/api-contract (Lunes Network) |
| Solana | @solana/web3.js + spl-token (consultas de saldo) |
| IPFS | Pinata SDK (upload de arte NFT) |
| Auth | localStorage (roles: admin_geral, admin, financeiro, marketing, comercial) |

---

## 2. Smart Contracts do Projeto (20 contratos)

| Contrato | Admin ABI | Admin Integração | Status |
|----------|-----------|-------------------|--------|
| core (PSP22 $FIAPO) | — | ✅ Via lunes.ts (balance query) | INTEGRADO |
| ico (NFTs Mineradores) | ✅ ico-abi.ts | ✅ ico.ts (stats, tiers, evolution) | INTEGRADO |
| staking (3 Pools) | ✅ staking-abi.ts | ✅ staking.ts (TVL, stakers, rewards) | INTEGRADO |
| marketplace | ✅ marketplace-abi.ts | ✅ marketplace.ts (listings, auctions) | INTEGRADO |
| nft_collections | ✅ nft-collections-abi.ts | ✅ nft-collections.ts (CRUD + mint) | INTEGRADO |
| noble_affiliate | ✅ noble-abi.ts | ⚠️ Parcial (ABI existe, sem queries) | PARCIAL |
| **airdrop** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| **governance** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| **lottery** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| **rewards** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| **affiliate** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| **oracle_multisig** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| **security** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| **timelock** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| **upgrade** | ❌ | ❌ Retorna JSON estático | **GARGALO** |
| spin_game | ❌ | ❌ Sem página no admin | AUSENTE |

---

## 3. API Routes — Classificação por Tipo

### ✅ On-Chain Real (lê dados do contrato)
| Route | Contrato | Operações |
|-------|----------|-----------|
| `/api/admin/ico` | fiapo_ico | Stats, tiers, evolution, rarity |
| `/api/admin/staking` | fiapo_staking | TVL, stakers, rewards, pools |
| `/api/admin/marketplace` | fiapo_marketplace | Listings, auctions, volume |
| `/api/finance/treasury` | core (PSP22) | LUNES + FIAPO balances |
| `/api/admin/collections/*` | nft_collections | Create, add items, mint (WRITE) |

### ⚠️ Proxy para don-fiapo-web
| Route | Operações |
|-------|-----------|
| `/api/admin/missions` | CRUD missões (GET/POST/PATCH/DELETE) |
| `/api/admin/migrations` | Listar/aprovar migrations Solana→Lunes |

### ❌ Apenas JSON Estático (SEM dados reais)
| Route | Problema |
|-------|---------|
| `/api/admin/airdrop` | Retorna config hardcoded, sem status real do contrato |
| `/api/admin/governance` | Retorna config hardcoded, sem propostas/votos reais |
| `/api/admin/lottery` | Retorna config hardcoded, sem sorteios/ganhadores reais |
| `/api/admin/rewards` | Retorna config hardcoded, sem rankings reais |
| `/api/admin/affiliate` | Retorna config hardcoded, sem árvore/comissões reais |
| `/api/admin/infrastructure` | Retorna config hardcoded, sem status real dos contratos |

### ✅ Off-Chain CRUD (Prisma/SQLite)
| Route | Model | Operações |
|-------|-------|-----------|
| `/api/admin/users` | AdminUser | CRUD |
| `/api/admin/sales` | Sale | CRUD |
| `/api/admin/transactions` | Transaction | CRUD |
| `/api/admin/campaigns` | Campaign | CRUD |
| `/api/admin/partners` | Partner | CRUD |
| `/api/admin/noble` | Noble | CRUD |
| `/api/finance/expenses` | Expense | CRUD |
| `/api/finance/revenues` | Revenue | CRUD |
| `/api/finance/wallets` | Wallet | CRUD |
| `/api/finance/branches` | Branch | CRUD |

---

## 4. Modelos Prisma Existentes vs Faltantes

### ✅ Existentes
- AdminUser, Branch, Wallet, Transaction, Expense, Revenue
- Campaign, Sale, Partner, Noble
- NFTCollection, NFTCollectionItem

### ❌ Faltantes
- **AuditLog** — Rastrear todas as ações admin (quem fez o quê)
- **TokenDistribution** — Rastrear distribuição real vs planejada (tokenomics)
- **AirdropSnapshot** — Snapshot de wallets elegíveis e status
- **MigrationRecord** — Histórico local de migrations processadas

---

## 5. Plano On-Chain vs Off-Chain

### Deve ser ON-CHAIN (lido do contrato)
| Dado | Contrato | Justificativa |
|------|----------|--------------|
| Saldo treasury FIAPO/LUNES | core | Fonte de verdade é a blockchain |
| ICO stats (minted, raised) | ico | Dados on-chain imutáveis |
| Staking TVL/stakers/rewards | staking | Estado real do protocolo |
| Marketplace listings/volume | marketplace | Transações on-chain |
| Airdrop claims/elegibilidade | airdrop | Distribuição on-chain |
| Propostas/votos governance | governance | Governança descentralizada |
| Sorteios/ganhadores lottery | lottery | Aleatoriedade on-chain |
| Rankings/scores rewards | rewards | Cálculos on-chain |
| Árvore afiliados/comissões | affiliate | Comissões automáticas |
| Oracle status/confirmações | oracle_multisig | Consenso multi-sig |
| Security state/blacklist | security | Proteções do protocolo |
| Timelock operações pendentes | timelock | Delays obrigatórios |
| NFT collections/items | nft_collections | Assets on-chain |

### Deve ser OFF-CHAIN (Prisma/SQLite)
| Dado | Justificativa |
|------|--------------|
| Admin users/roles/auth | Controle interno, não pertence à blockchain |
| Campanhas de marketing | Gestão operacional |
| Vendas/receitas/despesas | Contabilidade interna |
| Parceiros comerciais | Relacionamento B2B |
| Nobles (influencers) | CRM do ecossistema |
| Branches/wallets internas | Organização multi-filial |
| Audit logs | Compliance e segurança interna |
| Token distribution tracking | Comparativo planejado vs executado |
| NFT metadata/IPFS hashes | Cache local antes do mint on-chain |

---

## 6. Gargalos Críticos e Prioridade

### P0 — Bloqueadores (implementar agora)
1. **AuditLog** — Sem rastreabilidade de ações admin
2. **TokenDistribution** — Sem visibilidade de distribuição planejada vs real
3. **6 API routes estáticos** — Precisam tentar ler on-chain com fallback para config

### P1 — Alta Prioridade (implementar em seguida)
4. **Airdrop real integration** — Criar ABI + queries para claim status
5. **Governance integration** — Criar ABI + queries para propostas/votos
6. **Lottery integration** — Criar ABI + queries para sorteios
7. **Rewards integration** — Criar ABI + queries para rankings
8. **Affiliate integration** — Criar ABI + queries para árvore/comissões

### P2 — Importante (próximo sprint)
9. **Export/relatórios** — CSV/PDF para finance, sales, campaigns
10. **Dashboard analytics** — Gráficos de tendência no dashboard
11. **Spin Game** — Página admin para o jogo de roleta
12. **Notificações** — Alertas para operações críticas

---

## 7. Implementação — Fase 1 (Agora)

### 7.1 Novos Models Prisma
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  action    String   // CREATE, UPDATE, DELETE, MINT, APPROVE, etc.
  entity    String   // Noble, Campaign, Collection, Migration, etc.
  entityId  String?
  details   String?  // JSON com detalhes da ação
  adminEmail String
  ipAddress String?
  createdAt DateTime @default(now())
}

model TokenDistribution {
  id          String   @id @default(uuid())
  category    String   // presale, staking, airdrop, marketing, charity, ico, team
  planned     Float    // Quantidade planejada (em bilhões)
  distributed Float    @default(0) // Quantidade já distribuída
  percentage  Float    // Percentual planejado
  status      String   @default("pending") // pending, in_progress, completed
  notes       String?
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
}
```

### 7.2 Blockchain Integrations Faltantes
Para cada contrato faltante, criar:
1. `{contract}-abi.ts` — ABI extraído do contrato
2. `{contract}.ts` — Funções de query com fallback graceful

### 7.3 API Routes Atualizados
Converter rotas estáticas para padrão:
```typescript
// Tenta on-chain → fallback para config estático
try {
  const data = await getContractData();
  return NextResponse.json({ ...data, connected: true });
} catch {
  return NextResponse.json({ ...staticConfig, connected: false });
}
```
