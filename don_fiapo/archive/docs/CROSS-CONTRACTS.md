# Cross-Contract Calls — ink! 4.2.1 na Rede Lunes

> Guia prático para comunicação entre contratos no DonFiapo.
> **Sem OpenBrush** — usa apenas ink! puro com `ink-as-dependency`.

---

## 1. Padrão ink-as-dependency (Referência Oficial)

### No contrato que SERÁ CHAMADO (ex: `other-contract/lib.rs`)

Adicionar no **final** do arquivo, fora do módulo `#[ink::contract]`:

```rust
#[cfg(feature = "ink-as-dependency")]
pub use self::other_contract::*;
```

E no `Cargo.toml` do mesmo contrato, declarar a feature:

```toml
[features]
ink-as-dependency = []
```

### No contrato que VAI CHAMAR (ex: `cross-contract-calls/Cargo.toml`)

Adicionar o contrato chamado como dependência com a feature ativada:

```toml
[dependencies]
other-contract = { path = "../other-contract", default-features = false, features = ["ink-as-dependency"] }

[features]
std = [
    "other-contract/std",
]
```

### No código do chamador (`cross-contract-calls/lib.rs`)

```rust
use other_contract::OtherContractRef;

#[ink(storage)]
pub struct MyContract {
    other: OtherContractRef,
}

impl MyContract {
    #[ink(constructor)]
    pub fn new(other_address: AccountId) -> Self {
        let other: OtherContractRef = other_address.into();
        Self { other }
    }

    #[ink(message)]
    pub fn call_other(&self) -> bool {
        self.other.get()
    }
}
```

---

## 2. Dois métodos de chamada no DonFiapo

### Método A: `contract_ref!` com trait (tipado, seguro)

Quando o contrato chamado **implementa um trait** via `impl Trait for Contract`:

```rust
use fiapo_logics::traits::psp22::{PSP22, PSP22Ref};

// No construtor
let mut token: PSP22Ref = core_address.into();

// Chamada tipada — selector verificado em compile-time
token.transfer(to, amount)?;
```

Usado em: **Staking → Core**, **Governance → Core**, **Governance → Staking**

### Método B: `build_call` raw (flexível, sem dependência direta)

Quando o método chamado é **standalone** (`#[ink(message)]` sem trait):

```rust
use ink::env::call::{build_call, ExecutionInput, Selector};

let result = build_call::<ink::env::DefaultEnvironment>()
    .call(target_address)
    .gas_limit(0)
    .transferred_value(0)
    .exec_input(
        ExecutionInput::new(Selector::new(ink::selector_bytes!("register_revenue")))
            .push_arg(code)
            .push_arg(amount)
    )
    .returns::<Result<(), ()>>()
    .try_invoke();
```

Usado em: **ICO → Noble**, **Marketplace → Noble**, **Staking → Affiliate/Rewards**

---

## 3. Construtor e variáveis configuráveis

Passe o `AccountId` do contrato chamado no construtor ou via setter:

```rust
#[ink(constructor)]
pub fn new(core_contract: AccountId) -> Self {
    Self {
        core_contract,
        staking_contract: None,  // configurável depois
    }
}

#[ink(message)]
pub fn set_staking_contract(&mut self, addr: AccountId) -> Result<(), Error> {
    self.ensure_owner()?;
    self.staking_contract = Some(addr);
    Ok(())
}
```

Isso permite apontar para deployments diferentes (local, testnet, mainnet).

---

## 4. Ordem de compilação e deploy

1. **Compilar e deployar** os contratos base primeiro (que não chamam ninguém):
   - `fiapo-traits` (tipos compartilhados)
   - `core` (token PSP22)
   - `oracle_multisig`

2. **Depois** os contratos que dependem dos base:
   - `affiliate`, `noble_affiliate`, `rewards`

3. **Por último** os contratos que chamam vários outros:
   - `staking` (chama core, affiliate, rewards, noble)
   - `governance` (chama core, staking, oracle, rewards)
   - `ico` (chama core, noble)
   - `marketplace` (chama core, noble)

4. **Após deploy**, configurar endereços via setters:
   ```
   staking.set_affiliate_contract(AFFILIATE_ADDR)
   staking.set_rewards_contract(REWARDS_ADDR)
   governance.set_staking_contract(STAKING_ADDR)
   ```

---

## 5. Selectors — cuidado crítico

O **selector** é o hash do nome do trait + método. Se o chamador usa um trait diferente
do que o chamado implementa, os selectors não batem e a chamada falha **silenciosamente**.

Exemplo de problema real corrigido no DonFiapo:
- Core implementa `IPSP22::transfer` → selector de `IPSP22::transfer`
- Se o chamador usava `PSP22::transfer` (OpenBrush) → selector diferente → **falha em runtime**

Solução: usar o **mesmo trait** (`IPSP22` do `fiapo-traits`) em ambos os lados.

---

## 6. Debugging comum

- **Chamada retorna `Ok` mas nada acontece**: selector errado — verificar trait
- **`ContractTrapped`**: o contrato chamado fez panic (overflow, assert, etc.)
- **`TransferFailed`**: saldo insuficiente no contrato chamado
- **Decode error**: tipo de retorno no `returns::<T>()` não bate com o real
- **Conta não existe**: endereço passado não tem contrato deployado naquele ambiente

---

## 7. Referências

- [ink! Cross-Contract Examples](https://github.com/use-ink/ink-examples/tree/main/cross-contract-calls) — padrão oficial
- [PidChat PSP22](https://github.com/pidchat/pidchat_psp22) — ink! 4.2.1 na Lunes (puro, sem OpenBrush)
- [use.ink docs](https://use.ink/basics/cross-contract-calling) — documentação oficial
- `don_fiapo/archive/docs/CROSS-CONTRACT-ANALYSIS.md` — análise detalhada do DonFiapo