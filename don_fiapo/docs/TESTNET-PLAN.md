# Don Fiapo — Plano de Testes Testnet Local

> Rede: Substrate local (`ws://127.0.0.1:9944`) | ink! 4.2.1  
> Ferramenta: `npx @vudovn/ag-kit init`  
> Data: Fevereiro 2026

---

## 1. Checklist de Contratos (16 contratos)

### Camada Base
| # | Contrato | Construtor | Dependências | Status |
|---|----------|-----------|--------------|--------|
| 1 | **Core** (PSP22) | `new(name, symbol, supply, burn_w, team_w, staking_w, rewards_w)` | Nenhuma | ⬜ |
| 2 | **Security** | `new()` | Nenhuma | ⬜ |

### Camada Financeira
| # | Contrato | Construtor | Dependências | Status |
|---|----------|-----------|--------------|--------|
| 3 | **Staking** | `new(core_address)` | Core | ⬜ |
| 4 | **Rewards** | `new(core_address)` | Core | ⬜ |
| 5 | **Affiliate** | `new(core_address)` | Core | ⬜ |
| 6 | **Noble Affiliate** | `new(core_address)` | Core | ⬜ |

### Camada de Produtos
| # | Contrato | Construtor | Dependências | Status |
|---|----------|-----------|--------------|--------|
| 7 | **ICO** | `new(core_address)` | Core, Oracle | ⬜ |
| 8 | **Marketplace** | `new(core_address, ico_address)` | Core, ICO | ⬜ |
| 9 | **NFT Collections** | `new(core_address)` | Core | ⬜ |
| 10 | **Lottery** | `new(core_address)` | Core | ⬜ |
| 11 | **Spin Game** | `new(oracle_address)` | Oracle | ⬜ |
| 12 | **Airdrop** | `new(core_address)` | Core | ⬜ |

### Camada de Governança/Infraestrutura
| # | Contrato | Construtor | Dependências | Status |
|---|----------|-----------|--------------|--------|
| 13 | **Oracle Multisig** | `new(oracles[], required)` | Nenhuma | ⬜ |
| 14 | **Governance** | `new(core_address, governors[])` | Core, Staking, Oracle | ⬜ |
| 15 | **Timelock** | `new(admins[])` | Nenhuma | ⬜ |
| 16 | **Upgrade** | `new(approvers[], min_approvals)` | Nenhuma | ⬜ |

---

## 2. Ordem de Deploy (Sequencial)

```
Fase 1: Base
  1. Core (token FIAPO)
  2. Security (módulo de proteção)
  3. Oracle Multisig (bridge Solana→Lunes)

Fase 2: Financeiro
  4. Staking (pools DonBurn/DonLunes/DonFiapo)
  5. Rewards (rankings e recompensas)
  6. Affiliate (sistema 2 níveis)
  7. Noble Affiliate (receitas afiliados premium)

Fase 3: Produtos
  8. ICO (NFTs mineradores 7 tiers)
  9. Marketplace (venda/leilão/troca NFTs)
  10. NFT Collections (colecionáveis)
  11. Lottery (sorteios mensais/anuais)
  12. Spin Game (Royal Wheel)
  13. Airdrop (distribuição por pontos)

Fase 4: Governança
  14. Governance (propostas/votos)
  15. Timelock (delays operações críticas)
  16. Upgrade (sistema de atualização)
```

### Pós-Deploy — Configurações Obrigatórias

```
1. Core.authorize_minter(Staking)
2. Core.authorize_minter(ICO)
3. Core.authorize_minter(Airdrop)
4. Core.authorize_minter(Rewards)
5. Core.transfer(Staking, 240B FIAPO)       — Seed Treasury
6. Core.transfer(ICO, 6B FIAPO)             — Seed Treasury
7. Core.transfer(Airdrop, 21B FIAPO)        — Seed Treasury
8. Core.transfer(Rewards, 1B FIAPO)         — Seed Treasury
9. Oracle.set_contract_address("ico", ICO)
10. Oracle.set_contract_address("staking", Staking)
11. Oracle.set_contract_address("lottery", Lottery)
12. Oracle.set_contract_address("spin_game", SpinGame)
13. Oracle.set_contract_address("governance", Governance)
14. ICO.set_oracle_contract(Oracle)
15. ICO.set_marketplace_contract(Marketplace)
16. Marketplace.set_staking_contract(Staking)
17. Lottery.set_oracle_contract(Oracle)
18. Staking.set_affiliate_contract(Affiliate)
19. Staking.set_rewards_contract(Rewards)
20. Staking.set_noble_contract(Noble)
21. ICO.set_noble_contract(Noble)
22. ICO.activate_ico()
23. ICO.activate_mining()
```

---

## 3. Fluxos de Usuário (User Journeys)

### 3.1 Fluxo: Novo Usuário — Mint NFT Gratuito
```
Usuário → Frontend → mint_free()
  ├─ ICO verifica: free_minted[caller] == false
  ├─ ICO minta NFT Tier Free (id=N)
  ├─ ICO define visual_rarity (pseudo-random)
  ├─ ICO emite evento NFTMinted
  └─ Usuário agora tem 1 NFT Free (minera 5 FIAPO/dia)
```
**Teste:**
1. Alice chama `ico.mint_free()` → Recebe NFT id=1, Tier=Free
2. Alice tenta `mint_free()` de novo → Erro `FreeMintAlreadyUsed`
3. Verificar: `ico.get_nft(1)` retorna dados corretos

### 3.2 Fluxo: Compra de NFT com USDT (via Oracle)
```
Usuário → Frontend → Oracle Service (POST /api/payment/create)
  ├─ Oracle cria registro pendente (SQLite)
  ├─ Retorna endereço Solana + valor USDT
  │
Usuário → Solana Wallet → Envia USDT
  │
Oracle Watcher → Detecta tx Solana → Verifica confirmações
  ├─ Oracle chama oracle.submit_confirmation(tx_hash, sender, amount, user, NFTPurchase{tier})
  ├─ Se consenso atingido (M de N):
  │   ├─ Oracle chama ico.mint_paid_for(user, tier)
  │   ├─ ICO minta NFT
  │   └─ ICO emite evento NFTMinted
  └─ Usuário recebe NFT no tier escolhido
```
**Teste (Mock Oracle - testnet):**
1. Alice (como oracle) chama `oracle.submit_confirmation("tx1", "sol_addr", 1350, Bob, NFTPurchase{tier:1})`
2. Verificar: `ico.get_nft(2)` → Bob é owner, Tier=Tier2
3. Verificar: `ico.get_stats()` → total_nfts_minted incrementou

### 3.3 Fluxo: Mineração de Tokens + Claim
```
Usuário (tem NFT) → Frontend → ico.claim_mining(nft_id)
  ├─ ICO calcula: tokens = daily_rate * dias_passados
  ├─ ICO chama core.mint_to(user, tokens) — cross-contract via PSP22Ref
  ├─ ICO atualiza nft.tokens_mined, nft.tokens_claimed
  └─ ICO emite evento TokensClaimed
```
**Teste:**
1. Avançar timestamp (simulação local)
2. Bob chama `ico.claim_mining(nft_id)` → Recebe tokens FIAPO
3. Verificar: `core.balance_of(Bob)` > 0

### 3.4 Fluxo: Staking de FIAPO
```
Usuário → Frontend → core.approve(staking_contract, amount)
Usuário → Frontend → staking.stake(pool=0, amount)
  ├─ Staking chama core.transfer_from(user, staking, amount) — PSP22Ref
  ├─ Staking calcula entry_fee (10%/5%/2.5%/1%/0.5% baseado em amount)
  ├─ Staking distribui fee: 50% Team, 40% Staking, 5% Rewards, 5% Noble
  ├─ Staking cria StakingPosition {id, user, pool, net_amount, start_time}
  └─ Staking emite evento Staked
```
**Teste:**
1. Alice aprova Staking para 100.000 FIAPO
2. Alice chama `staking.stake(0, 100_000 * SCALE)` → Position id=1
3. Verificar: `staking.get_position(1)` → amount correto (após fee)
4. Verificar: `core.balance_of(Alice)` diminuiu
5. Verificar: `staking.get_stats()` → total_staked > 0

### 3.5 Fluxo: Claim Rewards de Staking
```
Usuário → Frontend → staking.claim_rewards(position_id)
  ├─ Staking calcula: reward = amount * apy * tempo / 365
  ├─ Se affiliate: busca boost via affiliate.calculate_apy_boost(user)
  ├─ Aplica boost ao reward
  ├─ Deduz 1% fee do reward
  ├─ Staking chama core.transfer(user, net_reward) — PSP22Ref
  └─ Staking emite evento RewardsClaimed
```

### 3.6 Fluxo: Venda de NFT no Marketplace
```
Vendedor → marketplace.list_nft(nft_id, price, currency=1)
  ├─ Marketplace verifica: ico.get_nft(nft_id).owner == caller
  ├─ Marketplace cria Listing {nft_id, seller, price}
  └─ Emite NFTListed

Comprador → core.approve(marketplace, price)
Comprador → marketplace.buy_nft(listing_id)
  ├─ Marketplace chama core.transfer_from(buyer, marketplace, price)
  ├─ Marketplace calcula fee (6%)
  ├─ Marketplace distribui: 50% Seller, 44% Seller (post-fee), 3% Team, 3% Noble
  ├─ Marketplace chama ico.marketplace_transfer_nft(seller, buyer, nft_id)
  │   ├─ ICO auto-claim tokens pendentes → seller recebe mining
  │   └─ ICO transfere ownership do NFT
  └─ Emite NFTSold
```

### 3.7 Fluxo: Evolução de NFT
```
Usuário (tem 2+ NFTs mesmo tier) → ico.evolve_nfts([nft_id_1, nft_id_2])
  ├─ ICO verifica: ambos NFTs são do caller, mesmo tier, ativos
  ├─ ICO queima ambos NFTs (active=false, burned++)
  ├─ ICO minta 1 NFT tier+1
  ├─ ICO aplica evolution_bonus
  └─ Emite NFTEvolved
```
**Teste:**
1. Criar 2 NFTs Free (mint_free com 2 contas + transfer, ou oracle mint)
2. Evoluir: `ico.evolve_nfts([1, 2])` → NFT id=3, Tier=Tier2
3. Verificar: NFTs 1 e 2 inativos, NFT 3 ativo

### 3.8 Fluxo: Governance — Criar e Votar Proposta
```
Proposer → Paga 100 USDT (Solana) + 1000 FIAPO
  ├─ Oracle confirma pagamento USDT
  ├─ Governance verifica staking ativo via staking.get_user_positions(caller)
  ├─ Governance coleta FIAPO: core.transfer_from(caller, governance, 1000)
  ├─ Governance cria Proposal {description, voting_end, timelock}
  └─ Emite ProposalCreated

Voter → Paga 10 USDT + 100 FIAPO
  ├─ Governance verifica staking + rate limit (10 votos/hora)
  ├─ Governance registra voto (For/Against/Abstain)
  └─ Emite VoteCast
```

### 3.9 Fluxo: Spin Game (Royal Wheel)
```
Usuário → Paga USDT (Solana) por pacote de spins
  ├─ Oracle confirma pagamento
  ├─ Oracle chama spin_game.credit_spins(user, spins, tier)
  └─ Usuário recebe créditos

Usuário → spin_game.spin(package)
  ├─ SpinGame verifica: user tem spins suficientes
  ├─ SpinGame gera resultado pseudo-random (hash de block+time+caller+nonce)
  ├─ Aplica limites diários (max 200 USDT/dia, max 1 jackpot/dia)
  ├─ Registra resultado
  └─ Emite SpinExecuted
```

### 3.10 Fluxo: Airdrop
```
Admin → airdrop.create_round(total_amount, criteria)
Admin → airdrop.register_eligible(addresses[], amounts[])
Admin → airdrop.activate_round()

Usuário elegível → airdrop.claim()
  ├─ Airdrop verifica elegibilidade + não reclamado
  ├─ Airdrop chama core.transfer(user, amount) — PSP22Ref
  └─ Emite AirdropClaimed
```

---

## 4. Plano de Testes de Volume

### 4.1 Testes de Carga por Contrato

| Teste | Operação | Volume | Métrica |
|-------|----------|--------|---------|
| T1 | `core.transfer` | 1000 transferências | TPS, gas médio |
| T2 | `ico.mint_free` | 500 mints (contas distintas) | Gas, storage growth |
| T3 | `ico.mint_paid_for` | 200 mints (via oracle) | Latência cross-contract |
| T4 | `ico.claim_mining` | 500 claims simultâneos | Gas, TPS |
| T5 | `staking.stake` | 300 stakes (3 pools) | Gas, cross-contract fee |
| T6 | `staking.claim_rewards` | 200 claims | Gas, precision |
| T7 | `marketplace.list_nft` | 100 listings | Storage |
| T8 | `marketplace.buy_nft` | 100 compras | Cross-contract chain |
| T9 | `oracle.submit_confirmation` | 50 pagamentos consenso | Latência M-de-N |
| T10 | `spin_game.spin` | 500 spins | Random distribution |

### 4.2 Testes de Stress

| Teste | Cenário | Objetivo |
|-------|---------|----------|
| S1 | 50 stakers fazem claim no mesmo bloco | Verificar gas limit |
| S2 | NFT evolution chain: Free→T2→T3→T4→T5→T6→T7 | Verificar integridade |
| S3 | Marketplace: 20 bids simultâneos no mesmo leilão | Verificar ordenação |
| S4 | Transfer 0 FIAPO, MAX FIAPO, negative | Edge cases |
| S5 | Oracle: 5 oracles confirmam, 3 rejeitam | Consenso parcial |

### 4.3 Testes de Integridade Financeira

| Teste | Verificação |
|-------|------------|
| F1 | Soma total de balances == total_supply - total_burned |
| F2 | Fee distribution: 30% burn + 50% staking + 20% rewards == fee total |
| F3 | Staking entry fee: amount_in - net_staked == fee_distributed |
| F4 | Mining: tokens_claimed <= tokens_per_nft (nunca mais que o alocado) |
| F5 | ICO: minted <= max_supply por tier |
| F6 | Marketplace: seller_received + fee == buyer_paid |

---

## 5. Passo-a-Passo: Setup Testnet Local

### 5.1 Pré-requisitos

```bash
# Rust + cargo-contract
rustup update stable
cargo install cargo-contract --force

# Node.js 18+
node --version  # >= 18.0.0

# Polkadot.js dependencies
cd scripts && npm install
```

### 5.2 Iniciar Nó Local

```bash
# Opção A: ag-kit (recomendado)
npx @vudovn/ag-kit init

# Opção B: substrate-contracts-node
substrate-contracts-node --dev --ws-port 9944

# Verificar conexão
# O nó deve estar em ws://127.0.0.1:9944
# Contas pré-financiadas: //Alice, //Bob, //Charlie, //Dave, //Eve, //Ferdie
```

### 5.3 Build dos Contratos

```bash
cd don_fiapo

# Build completo (requer cargo-contract)
./build_all.sh

# Ou build individual:
cd contracts/core && cargo contract build --release && cd ../..
cd contracts/ico && cargo contract build --release && cd ../..
cd contracts/staking && cargo contract build --release && cd ../..
# ... etc para cada contrato
```

Artefatos gerados em: `don_fiapo/target/ink/{contract_name}/{contract_name}.contract`

### 5.4 Deploy do Ecossistema

```bash
cd scripts

# Deploy completo (todos os 14 contratos + configurações)
LUNES_RPC_URL=ws://127.0.0.1:9944 DEPLOYER_SEED=//Alice node deploy_ecosystem.cjs

# Resultado salvo em: scripts/last_deploy_ecosystem.json
```

### 5.5 Iniciar Oracle Service (Mock)

```bash
cd oracle-service

# Configurar para testnet local
cat > .env.local << EOF
LUNES_RPC_URL=ws://127.0.0.1:9944
CONTRACT_ADDRESS=<ORACLE_ADDRESS do deploy>
ORACLE_SEED=//Alice
ENABLE_MOCK_PAYMENTS=true
PORT=3001
ORACLE_API_KEY=test-key
EOF

npm run dev
```

---

## 6. Script de Teste Manual — Passo a Passo

### Fase 1: Token Básico
```
1. ✅ Verificar deploy: core.name() == "Don Fiapo"
2. ✅ Verificar supply: core.total_supply() == 600B * 10^8
3. ✅ Transfer: Alice → Bob 1000 FIAPO
4. ✅ Verificar fee: Bob recebeu 1000 - 0.6% = 994 FIAPO
5. ✅ Verificar burn: core.total_burned() > 0
6. ✅ Approve + TransferFrom: Alice aprova Charlie, Charlie transfere de Alice para Dave
```

### Fase 2: ICO / NFTs
```
7. ✅ Ativar ICO: ico.activate_ico()
8. ✅ Ativar Mining: ico.activate_mining()
9. ✅ Free Mint: Bob chama ico.mint_free() → NFT id=1
10. ✅ Verificar NFT: ico.get_nft(1) → owner=Bob, tier=Free
11. ✅ Paid Mint (via Oracle): oracle.submit_confirmation(tx, addr, 1350, Charlie, NFTPurchase{1})
12. ✅ Verificar: ico.get_nft(2) → owner=Charlie, tier=Tier2
13. ✅ Claim Mining: (avançar tempo) Bob chama ico.claim_mining(1) → recebe FIAPO
14. ✅ Stats: ico.get_stats() → total_nfts_minted == 2
```

### Fase 3: Staking
```
15. ✅ Approve: Alice chama core.approve(staking, 1M FIAPO)
16. ✅ Stake: Alice chama staking.stake(0, 500_000 * SCALE) → position id=1
17. ✅ Verificar position: staking.get_position(1) → amount < 500k (fee deduzida)
18. ✅ Claim: (avançar tempo) Alice chama staking.claim_rewards(1) → recebe tokens
19. ✅ Stats: staking.get_stats() → total_staked > 0
```

### Fase 4: Marketplace
```
20. ✅ List: Bob chama marketplace.list_nft(1, 10000*SCALE, 1) → listing id=1
21. ✅ Approve: Dave chama core.approve(marketplace, 10000*SCALE)
22. ✅ Buy: Dave chama marketplace.buy_nft(1)
23. ✅ Verificar: ico.get_nft(1).owner == Dave
24. ✅ Verificar: core.balance_of(Bob) aumentou
```

### Fase 5: Governance
```
25. ✅ Config: governance.set_oracle_contract(oracle)
26. ✅ Config: governance.set_staking_contract(staking)
27. ✅ Proposta: Alice (tem staking) cria proposta
28. ✅ Voto: Bob vota a favor
29. ✅ Verificar: governance.get_proposal(1) → votes_for > 0
```

### Fase 6: Spin Game + Lottery + Airdrop
```
30. ✅ Spin: Oracle credita spins para Bob → spin_game.credit_spins(Bob, 10, 0)
31. ✅ Bob chama spin_game.spin(One) → SpinResult
32. ✅ Lottery: Admin cria round → ativa → registra elegíveis → executa
33. ✅ Airdrop: Admin cria round → registra → ativa → claim
```

---

## 7. Mapa de Comunicação Cross-Contract (Validado)

```
                    ┌──────────────┐
                    │   ORACLE     │
                    │  MULTISIG    │
                    └──┬──┬──┬──┬─┘
                       │  │  │  │
          mint_paid_for│  │  │  │credit_spins
                       ▼  │  │  ▼
                    ┌─────┐│  │┌──────────┐
                    │ ICO ││  ││SPIN GAME │
                    └──┬──┘│  │└──────────┘
                       │   │  │
  marketplace_transfer │   │  │buy_tickets_for
                       │   │  │
          ┌────────────┤   │  ▼
          ▼            │   │ ┌─────────┐
   ┌─────────────┐     │   │ │ LOTTERY │
   │ MARKETPLACE │     │   │ └────┬────┘
   └──────┬──────┘     │   │      │
          │            │   │      │
          │     stake_for  │      │
          │            │   ▼      │
          │            │┌────────┐│
          │            ││STAKING ││
          │            │└──┬─┬─┬─┘│
          │            │   │ │ │  │
          │            │   │ │ │  │
          ▼            ▼   ▼ │ ▼  ▼
    ┌──────────────────────────────────┐
    │         CORE (PSP22 FIAPO)       │ ◄── transfer/transfer_from (PSP22Ref)
    │  transfer, transfer_from, mint   │
    └──────────────────────────────────┘
          ▲         ▲         ▲
          │         │         │
    ┌─────┴──┐ ┌────┴───┐ ┌──┴──────┐
    │AIRDROP │ │REWARDS │ │GOVERNAN.│
    └────────┘ └────────┘ └─────────┘

    Staking ──→ Affiliate (calculate_apy_boost, update_referral_activity)
    Staking ──→ Rewards (add_rewards_fund)
    Staking/ICO/Marketplace ──→ Noble (register_revenue)
    Governance ──→ Staking (get_user_positions) via StakingRef
    Governance ──→ Oracle (is_payment_confirmed) via OracleRef
```

---

## 8. Contas de Teste (Substrate Dev)

| Conta | Seed | Papel Sugerido |
|-------|------|---------------|
| Alice | `//Alice` | Owner/Deployer/Admin |
| Bob | `//Bob` | Oracle #1 |
| Charlie | `//Charlie` | Oracle #2 |
| Dave | `//Dave` | Usuário Regular #1 |
| Eve | `//Eve` | Usuário Regular #2 |
| Ferdie | `//Ferdie` | Usuário Regular #3 |

---

## 9. Critérios de Sucesso

### Mínimo para Testnet ✅
- [ ] Todos os 16 contratos compilam (`cargo contract build`)
- [ ] Todos os 16 contratos deployam no nó local
- [ ] Configurações pós-deploy executam sem erro
- [ ] Free mint funciona (mint_free → get_nft)
- [ ] Transfer FIAPO funciona com fee correto
- [ ] Oracle confirma pagamento → ICO minta NFT
- [ ] Staking stake/claim funciona com cross-contract
- [ ] Marketplace buy/sell funciona com NFT transfer

### Completo para Produção
- [ ] Evolução de NFTs funciona (burn 2 → mint 1)
- [ ] Mining claim calcula tokens corretos
- [ ] Governance proposta + voto + execução
- [ ] Lottery execução com distribuição de prêmios
- [ ] Spin Game resultado + limites diários
- [ ] Airdrop distribuição completa
- [ ] Testes de volume passam sem OOG (out-of-gas)
- [ ] Verificação de integridade financeira (F1-F6)
- [ ] Nenhum selector mismatch em cross-contract calls
