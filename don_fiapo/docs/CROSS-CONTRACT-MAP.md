# Mapa de Comunicação Cross-Contract — Don Fiapo Ecosystem

> ink! 4.2.1 | Lunes Network (Substrate) | RPC local: ws://127.0.0.1:9944

## Regra Fundamental de Selectors (ink! 4.x)

| Tipo de Método | Selector Gerado | Exemplo |
|---|---|---|
| Standalone `#[ink(message)] fn foo()` | `blake2b("foo")[:4]` | Affiliate, Rewards, Noble |
| Via trait `impl IPSP22 for Contract { fn transfer() }` | `blake2b("IPSP22::transfer")[:4]` | Core PSP22, Staking trait |
| Override `#[ink(message, selector = 0xDEAD)]` | `0xDEAD` (literal) | simple_target::ping |

**Chamadas cross-contract DEVEM usar o mesmo tipo de selector que o contrato-alvo expõe.**

---

## Contratos e Suas Chamadas Cross-Contract

### Core (fiapo-core) — Token PSP22
**Expõe via traits:**
- `IPSP22` → `transfer`, `transfer_from`, `approve`, `balance_of`, `allowance`, `total_supply`
- `IPSP22Mintable` → `mint_to`
- `IPSP22Burnable` → `burn`, `burn_from`

**Chamado por:** ICO, Staking, Marketplace, Governance, NFT Collections

---

### Staking (fiapo-staking)
**Expõe via trait `Staking`:**
- `ping()`, `get_user_positions(user)`, `core_contract()`

**Expõe standalone:**
- `get_stats()`, `stake()`, `stake_with_code()`, `stake_for()`, `claim_rewards()`, `unstake()`, etc.

**Chama:**
| Destino | Método | Via | Status |
|---|---|---|---|
| Core | `transfer`, `transfer_from` | `PSP22Ref` (trait IPSP22) | ✅ |
| Affiliate | `calculate_apy_boost`, `update_referral_activity` | `build_call` + `selector_bytes!` (standalone) | ✅ |
| Rewards | `add_rewards_fund` | `build_call` + `selector_bytes!` (standalone) | ✅ |
| Noble | `register_revenue` | `build_call` + `selector_bytes!` (standalone) | ✅ |

---

### ICO (fiapo-ico)
**Expõe standalone:**
- `mint_free()`, `mint_paid_for()`, `mint_paid_for_with_code()`, `claim_mined()`, `evolve_nft()`, etc.

**Chama:**
| Destino | Método | Via | Status |
|---|---|---|---|
| Core | `transfer` | `PSP22Ref` (trait IPSP22) | ✅ CORRIGIDO |
| Noble | `register_revenue` | `build_call` + `selector_bytes!` (standalone) | ✅ |

---

### Marketplace (fiapo-marketplace)
**Expõe standalone:**
- `list_nft()`, `buy_nft()`, `create_auction()`, `place_bid()`, `finalize_auction()`, etc.

**Chama:**
| Destino | Método | Via | Status |
|---|---|---|---|
| Core | `transfer`, `transfer_from` | `PSP22Ref` (trait IPSP22) | ✅ CORRIGIDO |
| ICO | `marketplace_transfer_nft` | `build_call` + `selector_bytes!` (standalone) | ✅ |
| Noble | `register_revenue` | `build_call` + `selector_bytes!` (standalone) | ✅ |

---

### Governance (fiapo-governance)
**Expõe standalone:**
- `create_proposal()`, `vote()`, `execute_proposal()`, `test_ping()`, etc.

**Chama:**
| Destino | Método | Via | Status |
|---|---|---|---|
| Core | `transfer`, `transfer_from` | `PSP22Ref` (trait IPSP22) | ✅ |
| Staking | `ping`, `get_user_positions` | `StakingRef` (trait Staking) | ✅ CORRIGIDO |
| Oracle | `is_payment_confirmed` | `OracleRef` (trait Oracle) | ✅ |
| Rewards | `add_rewards_fund` | `RewardsCall` (build_call, standalone) | ✅ |

---

### NFT Collections (fiapo-nft-collections)
**Expõe standalone:**
- `create_collection()`, `add_token()`, `mint_with_lunes()`, `mint_with_fiapo()`, etc.

**Chama:**
| Destino | Método | Via | Status |
|---|---|---|---|
| Core | `transfer_from` | `PSP22Ref` (trait IPSP22) | ✅ CORRIGIDO |

---

### Affiliate (fiapo-affiliate)
**Expõe standalone (NÃO via trait):**
- `register_referral()`, `calculate_apy_boost()`, `update_referral_activity()`, `get_config()`, etc.

**Chamado por:** Staking (via `AffiliateCall` build_call)

---

### Noble Affiliate (noble_affiliate)
**Expõe standalone:**
- `register_revenue()`, `add_commercial()`, `add_noble()`, etc.

**Chamado por:** ICO, Staking, Marketplace (via build_call + `selector_bytes!("register_revenue")`)

---

### Rewards (fiapo-rewards)
**Expõe standalone:**
- `add_rewards_fund()`, `execute_monthly_ranking()`, etc.

**Chamado por:** Staking, Governance (via `RewardsCall` build_call)

---

### Oracle Multisig
**Expõe via trait `Oracle`:**
- `is_payment_confirmed()`

**Chamado por:** Governance (via `OracleRef`), ICO (via oracle-service externo)

---

## Helpers em fiapo-logics

| Helper | Tipo | Para chamar |
|---|---|---|
| `PSP22Ref` | `contract_ref!(IPSP22)` | Core: transfer, transfer_from, approve, etc. |
| `PSP22MintableRef` | `contract_ref!(IPSP22Mintable)` | Core: mint_to |
| `PSP22BurnableRef` | `contract_ref!(IPSP22Burnable)` | Core: burn, burn_from |
| `StakingRef` | `contract_ref!(Staking)` | Staking: ping, get_user_positions, core_contract |
| `OracleRef` | `contract_ref!(Oracle)` | Oracle: is_payment_confirmed |
| `AffiliateCall` | `build_call` helper | Affiliate: calculate_apy_boost, update_referral_activity |
| `RewardsCall` | `build_call` helper | Rewards: add_rewards_fund |

## Deploy Local (ws://127.0.0.1:9944)

Ordem de deploy para comunicação funcional:

1. **Core** (sem dependências)
2. **Oracle Multisig** (sem dependências)
3. **Affiliate** (recebe `core_contract` no constructor)
4. **Noble Affiliate** (recebe `core_contract`)
5. **Rewards** (recebe `core_contract`)
6. **Staking** (recebe `core_contract`, depois `set_linked_contracts` com oracle, affiliate, rewards, noble, team, burn)
7. **ICO** (recebe `core_contract`, oracle, noble)
8. **Marketplace** (recebe `core_contract`, ico, noble, staking, team)
9. **Governance** (recebe `core_contract`, staking, oracle, rewards, noble, team, burn)
10. **NFT Collections** (recebe `core_contract`, treasury, marketplace)

**Pós-deploy:** `core.authorize_minter(staking_address)` e `core.authorize_minter(ico_address)` para permitir minting.
