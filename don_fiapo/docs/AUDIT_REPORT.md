# Relatório de Auditoria Arquitetural — Don Fiapo Ecosystem

**Data:** 2026-03-03
**ink! Version:** 4.2.1
**Target:** Lunes Network (Substrate-based)

---

## 1. Mapa de Contratos

| Contrato | Package | Cross-Contract Calls | Dependências |
|---|---|---|---|
| **Core (PSP22)** | fiapo-core | Nenhuma (é chamado por outros) | fiapo-traits |
| **Staking** | fiapo-staking | Core (PSP22Ref), Affiliate (build_call), Rewards (build_call), Noble (build_call) | fiapo-traits, fiapo-logics |
| **Governance** | fiapo-governance | Core (PSP22Ref), Staking (StakingRef), Oracle (OracleRef), Rewards (build_call) | fiapo-traits, fiapo-logics |
| **ICO** | fiapo-ico | Core (PSP22Ref), Noble (build_call) | fiapo-traits, fiapo-logics |
| **Oracle Multisig** | fiapo-oracle-multisig | ICO (build_call), Staking (build_call), Lottery (build_call), ~~Spin (build_call)~~ | fiapo-traits, fiapo-logics |
| **Rewards** | fiapo-rewards | Core (PSP22Ref) | fiapo-traits, fiapo-logics |
| **Lottery** | fiapo-lottery | Core (PSP22Ref) | fiapo-traits, fiapo-logics |
| **Affiliate** | fiapo-affiliate | Nenhuma (é chamado por outros) | fiapo-traits |
| **Noble Affiliate** | noble_affiliate | Nenhuma (é chamado via build_call) | fiapo-traits |
| **NFT Collections** | fiapo-nft-collections | Core (PSP22Ref) | fiapo-traits, fiapo-logics |
| **Spin Game** | spin_game | ~~Nenhuma~~ **REMOVIDO (off-chain)** | fiapo-traits |
| **Security** | fiapo-security | Nenhuma | fiapo-traits |
| **Timelock** | fiapo-timelock | Nenhuma | fiapo-traits |
| **Upgrade** | fiapo-upgrade | Nenhuma | fiapo-traits |

## 2. Padrões de Cross-Contract Calls

### 2.1 Trait-based (contract_ref!)
- **PSP22Ref** → `IPSP22` trait → usado por: Staking, Governance, ICO, Rewards, Lottery
- **StakingRef** → `Staking` trait → usado por: Governance
- **OracleRef** → `Oracle` trait → usado por: Governance

### 2.2 Dynamic (build_call + selector_bytes!)
- **AffiliateCall** → `calculate_apy_boost`, `update_referral_activity`
- **RewardsCall** → `add_rewards_fund`
- **Noble** → `register_revenue` (chamado por Staking, ICO)
- **Oracle → ICO** → `mint_paid_for`
- **Oracle → Staking** → `stake_for`
- **Oracle → Lottery** → `buy_tickets_for`
- **Oracle → ~~Spin~~** → ~~`credit_spins`~~ **REMOVER**

## 3. Problemas Encontrados

### 3.1 CRÍTICO: Spin Game ainda no workspace e oracle
- `contracts/spin_game` ainda está nos `members` do workspace
- `oracle_multisig` ainda tem `SpinGameCredit` no enum `PaymentType`
- `oracle_multisig` ainda tem `spin_game_contract` no storage e `call_spin_game_credit()`

### 3.2 ALTO: build_call return types incorretos no Oracle
- `call_ico_mint_for` retorna `Result<u64, u8>` mas ICO retorna `Result<u64, ICOError>`
- `call_staking_stake_for` retorna `Result<u64, u8>` mas Staking retorna `Result<u64, StakingError>`
- `call_lottery_buy_tickets_for` retorna `Result<(), u8>` mas Lottery retorna `Result<(), LotteryError>`
- **RISCO:** Desserialização pode falhar silenciosamente

### 3.3 MÉDIO: Falta CallFlags::ALLOW_REENTRY onde necessário
- Chamadas cross-contract que modificam estado no contrato chamador devem usar `CallFlags`

### 3.4 MÉDIO: overflow-checks desabilitado em release
- `[profile.release] overflow-checks = false` — deveria ser `true` para contratos financeiros

### 3.5 BAIXO: Contratos de teste no workspace
- `test_cross`, `simple_target`, `test_pure` devem ser movidos ou excluídos do build de produção

## 4. Ações Corretivas

1. **Remover Spin do workspace e oracle** (spin agora é off-chain)
2. **Corrigir return types do build_call no Oracle** (usar `Result<T, ()>` genérico)
3. **Habilitar overflow-checks em release**
4. **Adicionar testes de cross-contract**
5. **Compilar e validar todos os contratos**
6. **Deploy local e teste de integração**
