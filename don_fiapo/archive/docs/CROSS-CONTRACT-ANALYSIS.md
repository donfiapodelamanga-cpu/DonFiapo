# Análise Profunda: Cross-Contract Calls — PidChat vs DonFiapo

## 1. Análise do Projeto PidChat (Lunes Network)

### Estrutura
- **ink! 4.2.1** — mesma versão que usamos no DonFiapo
- Contrato PSP22 puro, **sem OpenBrush**
- Workspace simples com `contracts/**`
- Deploy via `ui.use.ink` + nó local Lunes Nightly

### Padrão PSP22 do PidChat
O PidChat implementa o PSP22 de forma **manual/nativa**:
- Define `#[ink::trait_definition] pub trait Psp22` com todas as mensagens
- O enum `PSP22Error` é definido **fora** do módulo `#[ink::contract]`
- O contrato `token` importa o trait e o implementa

### Cross-Contract Pattern do PidChat
O PidChat usa o padrão **ink-as-dependency** puro (sem OpenBrush):

**No Cargo.toml do contrato chamado:**
```toml
[features]
ink-as-dependency = []
```

**No final do lib.rs do contrato chamado:**
```rust
#[cfg(feature = "ink-as-dependency")]
pub use self::other_contract::*;
```

**No Cargo.toml do contrato chamador:**
```toml
[dependencies]
other-contract = { path = "./other-contract", default-features = false, features = ["ink-as-dependency"] }
```
E na feature `std`:
```toml
std = [
    "other-contract/std",
]
```

### Conclusão PidChat
- Abordagem **simples e direta** sem dependências externas pesadas
- Funciona perfeitamente com ink! 4.2.1 na rede Lunes
- Não usa OpenBrush — evita problemas de compatibilidade

---

## 2. Estado Atual dos Contratos DonFiapo

### Abordagem Atual: Híbrida (OpenBrush + ink-as-dependency)

O DonFiapo tem **duas camadas** de abstração para cross-contract:

#### Camada 1: `fiapo-traits` (ink puro)
- Arquivo: `contracts/traits/src/lib.rs`
- Define traits com `#[ink::trait_definition]`: IPSP22, IStaking, IGovernance, etc.
- Usado pelo `fiapo-core` com `features = ["ink-as-dependency"]`
- **Funciona bem** para definições de tipo compartilhadas

#### Camada 2: `fiapo-logics` (OpenBrush)
- Arquivo: `logics/traits/*.rs`
- Usa `openbrush::traits::{AccountId, Balance}` e `openbrush::contracts::psp22::PSP22Error`
- Define `PSP22Ref`, `StakingRef`, `AffiliateRef`, `RewardsRef` via `ink::contract_ref!`
- Usado pelos contratos: staking, governance, test_cross
- **Depende do OpenBrush 4.0.0-beta** (git tag)

### Problemas Identificados

| # | Problema | Impacto |
|---|---------|---------|
| 1 | **OpenBrush 4.0.0-beta é instável** | Compilação pode quebrar; tag git pode sumir |
| 2 | **Duas camadas de traits redundantes** | `fiapo-traits` define IPSP22 e `fiapo-logics` define PSP22 — duplicação |
| 3 | **Tipos incompatíveis** | `fiapo-traits` usa `ink::primitives::AccountId` + `u128`; logics usa `openbrush::traits::{AccountId, Balance}` |
| 4 | **core não exporta ink-as-dependency** | O `fiapo-core/src/lib.rs` **NÃO** tem `#[cfg(feature = "ink-as-dependency")] pub use self::fiapo_core::*;` |
| 5 | **PSP22 trait mismatch** | logics/PSP22 trait tem `data: Vec<u8>` param; core IPSP22 não tem — assinaturas diferentes |
| 6 | **Staking impl Staking trait tem `ping()`** | Mas o `Staking` trait em logics não corresponde ao `IStaking` em fiapo-traits |
| 7 | **Nenhum contrato (exceto test_cross/test_pure) testa cross-contract na prática** | Toda a infra existe mas não está validada end-to-end |

---

## 3. Solução Proposta: Padrão PidChat Adaptado

### Filosofia: **Eliminar OpenBrush, usar ink-as-dependency puro**

O PidChat prova que **não precisamos de OpenBrush** para cross-contract calls na Lunes. O ink! 4.2.1 já suporta `ink::contract_ref!` nativamente.

### Arquitetura Proposta

```
contracts/
├── traits/           ← Tipos e traits compartilhados (já existe, manter)
├── core/             ← PSP22 token (CHAMADO por outros)
│   └── Cargo.toml    ← Já tem ink-as-dependency feature
│   └── src/lib.rs    ← ADICIONAR: #[cfg(feature = "ink-as-dependency")]
├── staking/          ← CHAMA core, affiliate, rewards
│   └── Cargo.toml    ← TROCAR: openbrush → fiapo-core como dependency
├── governance/       ← CHAMA core, staking
├── ico/              ← CHAMA core
├── marketplace/      ← CHAMA core, noble_affiliate
├── ...
└── logics/           ← SIMPLIFICAR: remover openbrush, usar contract_ref! puro
```

### Passo a Passo da Migração

#### Passo 1: Adicionar export no contrato Core (padrão PidChat - Imagem 1)

No final de `contracts/core/src/lib.rs`, adicionar:
```rust
// Permite que outros contratos importem este como dependência
#[cfg(feature = "ink-as-dependency")]
pub use self::fiapo_core::*;
```

#### Passo 2: Simplificar logics — remover OpenBrush

Trocar `logics/traits/psp22.rs` de:
```rust
use openbrush::traits::{AccountId, Balance};
use openbrush::contracts::psp22::PSP22Error;
```
Para:
```rust
use ink::primitives::AccountId;
type Balance = u128;
// PSP22Error definido em fiapo-traits
use fiapo_traits::PSP22Error;
```

Ou melhor: **usar diretamente o contrato como dependência** (padrão PidChat - Imagem 2):

#### Passo 3: Nos contratos chamadores, importar core como dependência

No `contracts/staking/Cargo.toml`:
```toml
[dependencies]
fiapo-core = { path = "../core", default-features = false, features = ["ink-as-dependency"] }

[features]
std = [
    "fiapo-core/std",
]
```

No `contracts/staking/src/lib.rs`:
```rust
use fiapo_core::FiapoCore;
// Agora pode chamar métodos do core type-safe
```

#### Passo 4: Para cada contrato que será chamado, adicionar o export

Repetir o padrão para todos os contratos que serão alvos de chamadas:
- `core/src/lib.rs` → `pub use self::fiapo_core::*;`
- `staking/src/lib.rs` → `pub use self::fiapo_staking::*;`  
- `rewards/src/lib.rs` → `pub use self::fiapo_rewards::*;`
- `affiliate/src/lib.rs` → `pub use self::fiapo_affiliate::*;`
- `noble_affiliate/src/lib.rs` → `pub use self::fiapo_noble::*;`

---

## 4. Dois Métodos de Cross-Contract Call no ink! 4.2.1

### Método A: `ink::contract_ref!` com trait local (Recomendado para simplicidade)
```rust
// Define trait mínimo localmente
#[ink::trait_definition]
pub trait PSP22Trait {
    #[ink(message)]
    fn transfer(&mut self, to: AccountId, value: Balance) -> Result<(), PSP22Error>;
}

// Usa contract_ref!
let mut token: ink::contract_ref!(PSP22Trait) = core_address.into();
token.transfer(to, amount)?;
```
**Prós:** Não precisa importar o contrato inteiro; leve  
**Contras:** Precisa manter trait em sincronia manualmente

### Método B: `ink-as-dependency` direto (Padrão PidChat - MAIS SEGURO)
```toml
# Cargo.toml do chamador
fiapo-core = { path = "../core", default-features = false, features = ["ink-as-dependency"] }
```
```rust
// lib.rs do chamador
use fiapo_core::FiapoCore;
let mut token: FiapoCore = ink::env::call::FromAccountId::from_account_id(core_address);
token.transfer(to, amount);
```
**Prós:** Type-safe em compile-time; garantia de ABI correta  
**Contras:** Acoplamento mais forte; compilação mais lenta

### Método C: `build_call` raw (Já usado em `test_pure` e `noble_register`)
```rust
use ink::env::call::{build_call, ExecutionInput, Selector};
let result = build_call::<ink::env::DefaultEnvironment>()
    .call(target)
    .exec_input(ExecutionInput::new(Selector::new([0x90, 0x72, 0xb1, 0x14])))
    .returns::<u32>()
    .try_invoke();
```
**Prós:** Zero dependências; flexível  
**Contras:** Sem verificação de tipo em compile-time; propenso a erros de selector

---

## 5. Mapa de Dependências Cross-Contract do DonFiapo (ATUALIZADO)

```
                    ┌──────────┐
                    │   CORE   │ ← PSP22 Token (FIAPO)
                    └────┬─────┘
                         │ transfer/transfer_from/mint_to/burn
          ┌──────────────┼──────────────┬──────────────┐
          │              │              │              │
    ┌─────▼────┐   ┌─────▼────┐   ┌────▼─────┐  ┌────▼─────┐
    │ STAKING  │   │   ICO    │   │MARKETPLACE│  │ REWARDS  │
    │          │   │          │   │           │  │          │
    └──┬──┬────┘   └──┬───────┘   └─────┬─────┘  └──────────┘
       │  │           │                 │
       │  └────────┐  │   ┌─────────────┘
       │           │  │   │
  ┌────▼─────┐  ┌──▼──▼───▼──┐
  │AFFILIATE │  │   NOBLE     │ ← ICO + Staking + Marketplace
  │ (boost)  │  │ AFFILIATE   │    (register_revenue)
  └──────────┘  └─────────────┘
```

### Chamadas necessárias:

| Chamador | Chamado | Método | Mecanismo |
|----------|---------|--------|-----------|
| Staking → | Core | transfer, transfer_from | `contract_ref!(IPSP22)` |
| Staking → | Affiliate | calculate_apy_boost, update_referral_activity | `build_call` (AffiliateCall) |
| Staking → | Rewards | add_rewards_fund | `build_call` (RewardsCall) |
| Staking → | Noble | register_revenue | `build_call` raw |
| ICO → | Noble | register_revenue (IcoNft) | `build_call` raw |
| Marketplace → | Core | transfer, transfer_from | `build_call` raw |
| Marketplace → | Noble | register_revenue (MarketplaceFee) | `build_call` raw |
| Governance → | Core | transfer, transfer_from | `contract_ref!(IPSP22)` |
| Governance → | Staking | get_user_positions, ping | `contract_ref!(Staking)` / `build_call` |
| Governance → | Oracle | is_payment_confirmed | `contract_ref!(Oracle)` |
| Governance → | Rewards | add_rewards_fund | `build_call` (RewardsCall) |
| Rewards → | Core | transfer | `build_call` raw |
| Airdrop → | Core | transfer | `build_call` raw |
| Lottery → | Core | transfer | `build_call` raw |
| SpinGame → | Core | mint_to | `build_call` raw |

---

## 6. Implementação Realizada ✅

### OpenBrush completamente removido do projeto!

#### Arquivos modificados:

**Exports adicionados (padrão PidChat — Imagem 1):**
- `core/src/lib.rs` → `pub use self::fiapo_core::*;`
- `staking/src/lib.rs` → `pub use self::fiapo_staking::*;`
- `rewards/src/lib.rs` → `pub use self::fiapo_rewards::*;`
- `affiliate/src/lib.rs` → `pub use self::fiapo_affiliate::*;`
- `noble_affiliate/src/lib.rs` → `pub use self::noble_affiliate::*;`

**fiapo-logics reescrito (sem OpenBrush):**
- `logics/Cargo.toml` → trocou `openbrush` por `fiapo-traits`
- `logics/traits/psp22.rs` → `PSP22Ref = ink::contract_ref!(IPSP22)` (selectors corretos!)
- `logics/traits/staking.rs` → `StakingRef = ink::contract_ref!(Staking)` (puro ink!)
- `logics/traits/oracle.rs` → `OracleRef = ink::contract_ref!(Oracle)` (puro ink!)
- `logics/traits/affiliate.rs` → `AffiliateCall` helper via `build_call` + `selector_bytes!`
- `logics/traits/rewards.rs` → `RewardsCall` helper via `build_call` + `selector_bytes!`

**Contratos atualizados:**
- `staking/Cargo.toml` → removeu openbrush
- `staking/src/lib.rs` → usa PSP22Ref (IPSP22), AffiliateCall, RewardsCall
- `governance/Cargo.toml` → removeu openbrush
- `governance/src/lib.rs` → usa PSP22Ref (IPSP22), StakingRef, OracleRef, RewardsCall
- `test_cross/Cargo.toml` → removeu openbrush
- `Cargo.toml` (workspace) → removeu openbrush das workspace.dependencies

**Bug corrigido:**
- `ico/src/lib.rs` → match arm órfão após `call_noble_register` (erro de sintaxe pré-existente)

#### Problema crítico resolvido: Selector Mismatch

**Antes:** Staking chamava `PSP22::transfer(to, value, data)` (OpenBrush) → selector `PSP22::transfer`
**Core implementava:** `IPSP22::transfer(to, value)` (fiapo-traits) → selector `IPSP22::transfer`
**Resultado:** Selectors diferentes = chamada falharia em runtime!

**Agora:** Staking usa `PSP22Ref = ink::contract_ref!(IPSP22)` → selector `IPSP22::transfer` ✅

#### Estratégia de chamadas por tipo:

| Método | Quando usar | Exemplo |
|--------|------------|---------|
| `contract_ref!(Trait)` | Contrato implementa o trait via `impl Trait for Contract` | Core (IPSP22), Staking (Staking trait) |
| `build_call` + `selector_bytes!` | Métodos standalone `#[ink(message)]` | Affiliate, Rewards, Noble |
| `build_call` + `Selector::new([bytes])` | Quando o selector é conhecido | test_cross ping manual |

### Status: Compilação completa do workspace sem erros ✅

---

## 7. Referências
- [PidChat PSP22](https://github.com/pidchat/pidchat_psp22) — ink! 4.2.1 na Lunes
- [ink! Cross-Contract Calls](https://use.ink/basics/cross-contract-calling)
- [Lunes Nightly](https://github.com/lunes-io/lunes-nightly) — nó local para testes
