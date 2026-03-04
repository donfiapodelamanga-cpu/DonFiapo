# Plano de Ação: Contratos ink! — Segurança + Cross-Contract

Este documento detalha o progresso de segurança e cross-contract dos contratos `ink!`.

---

## Fase 1: Refatoração de Segurança (CONCLUÍDA)

1. **`oracle_multisig`** — Restaurado, adaptado para ink! 4.x, compilado ✅
2. **`ico`** — Operações aritméticas seguras (`saturating_*`), compilado ✅
3. **`staking`** — Pendente: `unstake` e `calculate_rewards` precisam `saturating_*`

---

## Fase 2: Cross-Contract Communication (25/02/2026)

### Problemas Identificados

| # | Problema | Impacto |
|---|---------|---------|
| 1 | `contract_ref!` com 2 argumentos (syntax incorreta p/ ink! 4.2.x) | Compilação pode falhar |
| 2 | `oracle_multisig` NÃO implementava trait `Oracle` | **Selectors não batiam** — chamadas via `OracleRef` falhavam silenciosamente |
| 3 | ink! version inconsistente (14 contratos com `4.2.0`, workspace define `~4.2.1`) | ABI incompatibilities potenciais |
| 4 | Faltava `#[cfg(feature = "ink-as-dependency")]` export em contratos chamados | Padrão Lunes não seguido |

### Correções Aplicadas

#### FIX 1: `contract_ref!` syntax (logics/traits/)
- `logics/traits/psp22.rs` — Removido `, ink::env::DefaultEnvironment` das 3 refs
- `logics/traits/staking.rs` — Removido segundo argumento
- `logics/traits/oracle.rs` — Removido segundo argumento

#### FIX 2: Oracle implementa trait Oracle (CRÍTICO)
- `oracle_multisig/src/lib.rs` — Adicionado `impl Oracle for FiapoOracleMultisig` com `is_payment_confirmed`
- `oracle_multisig/Cargo.toml` — Adicionado `fiapo-logics` como dependência
- Isso garante que `OracleRef.is_payment_confirmed()` usa o MESMO selector que o contrato

#### FIX 3: ink! version padronizada para `~4.2.1`
Todos os 14 contratos atualizados: core, ico, staking, governance, lottery, airdrop, rewards, marketplace, affiliate, spin_game, security, timelock, upgrade, oracle_multisig, traits, noble_affiliate, nft_collections

#### FIX 4: `ink-as-dependency` exports
Adicionado `#[cfg(feature = "ink-as-dependency")] pub use self::module_name::*;` em:
- core ✅ (já tinha)
- staking ✅ (já tinha)
- oracle_multisig ✅ (ADICIONADO)
- security ✅ (ADICIONADO)
- simple_target ✅ (ADICIONADO)
- affiliate ✅ (já tinha)
- noble_affiliate ✅ (já tinha)
- rewards ✅ (já tinha)
- ico ✅ (ADICIONADO)
- lottery ✅ (ADICIONADO)
- spin_game ✅ (ADICIONADO)

---

## Como Funciona o Cross-Contract no Projeto

### Abordagem 1: Trait-based `contract_ref!` (PSP22, Staking, Oracle)
```
[fiapo-traits] define #[ink::trait_definition] IPSP22, IStaking, etc.
[logics/traits] cria Ref types: PSP22Ref = contract_ref!(IPSP22)
[contratos caller] usa: let mut psp22: PSP22Ref = address.into();
[contratos callee] implementa: impl IPSP22 for FiapoCore { ... }
→ Selectors match automaticamente via trait
```

### Abordagem 2: `build_call` com selectors manuais (Affiliate, Rewards, Noble)
```
[logics/traits] cria helpers: AffiliateCall::calculate_apy_boost()
→ Usa ink::selector_bytes!("method_name") para gerar selector
→ Callee tem #[ink(message)] pub fn method_name() standalone
→ Selectors match pelo nome do método
```

### On-Chain vs Off-Chain
- **On-Chain**: Todas as chamadas cross-contract (token transfers, staking, oracle, rewards)
- **Off-Chain**: Admin panel, IPFS uploads, analytics

---

## Próximos Passos

### 1. Compilar workspace completo
```bash
cd don_fiapo
cargo check
```

### 2. Compilar contratos individuais (gera .wasm + .contract + .json)
```bash
cd contracts/core && cargo contract build
cd contracts/staking && cargo contract build
cd contracts/ico && cargo contract build
cd contracts/oracle_multisig && cargo contract build
cd contracts/governance && cargo contract build
# ... etc para cada contrato
```

### 3. Testar cross-contract na testnet local Lunes
```bash
# 1. Subir node Lunes local (substrate-contracts-node)
# 2. Deploy core contract → obter endereço
# 3. Deploy staking contract (passar core_address)
# 4. Deploy oracle contract
# 5. Configurar linked contracts (set_linked_contracts)
# 6. Testar: governance.test_ping() deve retornar 123 via StakingRef
# 7. Testar: governance.verify_oracle_usdt() deve funcionar via OracleRef
```

### 4. Staking security (pendente da Fase 1)
- Aplicar `saturating_*` em `unstake` e `calculate_rewards`
