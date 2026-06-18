# SPEC-A — Correção das Críticas On-Chain (Cross-Contract + ICO mint)

Data: 2026-06-18 · Branch: `security-audit-2026-06-18` · Fonte: `docs/security/SECURITY_AUDIT_2026-06-18.md` (críticas #1 e #2)

## Contexto / Problema

O fluxo de monetização do DonFiapo depende do `oracle_multisig` chamar, após consenso M-de-N,
os contratos de destino para creditar o benefício pago. Hoje:

- **#2 (Crítico — DoS de monetização):** `oracle_multisig` declara `.returns::<()>()` nos `build_call`
  para `mint_paid_for` / `stake_for` / `buy_tickets_for`, mas os callees retornam `Result<_, _>`:
  - `ico.mint_paid_for` → `Result<u64, ICOError>` (`contracts/ico/src/lib.rs:668`)
  - `staking.stake_for` → `Result<u64, StakingError>` (`contracts/staking/src/lib.rs:314`)
  - `lottery.buy_tickets_for` → `Result<(), LotteryError>` (`contracts/lottery/src/lib.rs:223`)
  O decode SCALE do retorno não bate → a chamada reverte (ou um `Err` do callee é lido como sucesso).
  Resultado: **usuário paga, nada é creditado.** Os testes unitários ink! **não exercem** `build_call`
  (comentado em `oracle_multisig/src/lib.rs:545`), por isso nunca pegaram.

- **#1 (Crítico — dreno de supply):** `ico.mint_paid(tier, payment_hash)` (`contracts/ico/src/lib.rs:632`)
  é público e **não verifica** o `payment_hash` on-chain → qualquer um cunha NFT de tier pago de graça.
  O caminho legítimo já existe e é seguro: `ico.mint_paid_for` (checa `caller == oracle_contract`).

## Decisão de design (A1)

Estender o **padrão trait-based** já usado no projeto (`Oracle`, `Staking`, `IPSP22`):
definir trait(s) `#[ink::trait_definition]` para os métodos delegados pelo oracle, com **tipo de retorno
correto**, e fazer os callees `impl` a trait. O oracle passa a chamar via `contract_ref!` (selector E
tipo de retorno passam a casar por construção). Erros dos callees são mapeados para um erro de retorno
compartilhado (definido junto da trait) para evitar acoplamento do oracle às enums internas de cada contrato.

> Alternativa considerada e rejeitada: apenas trocar `.returns::<()>()` por `.returns::<Result<u64, ()>>()`.
> Rejeitada por depender de tolerância a bytes residuais do SCALE (frágil entre versões) e por não resolver
> a classe do problema. Se o TDD mostrar que o refactor trait é desproporcional, reavaliar com o usuário.

## Critérios de Aceite (verificáveis, e2e no devnet Lunes local)

Harness em JS (`@polkadot/api` / `api-contract`) — **sem Python** — deploya no devnet `--tmp` local.

- **AC1.** Pagamento `NFTPurchase{tier}` confirmado pelo quórum → `ico.get_user_nfts(beneficiary)` passa a
  conter 1 NFT do tier. (Hoje: falha — nada creditado.)
- **AC2.** Pagamento `StakingEntry{amount,pool}` confirmado → `staking.get_user_positions(beneficiary)` não-vazio.
- **AC3.** Pagamento `LotteryTicket{quantity}` confirmado → tickets do beneficiário refletem a compra.
- **AC4.** Se o callee retornar `Err` (ex.: tier inválido), o oracle propaga falha — **não** marca como sucesso.
- **AC5 (#1).** `ico.mint_paid(...)` chamado por conta arbitrária (não-oracle) **falha** (`Unauthorized`/removido);
  cunhagem de tier pago só ocorre via `mint_paid_for` pelo oracle.
- **AC6 (não-regressão).** `governance.test_ping()` continua retornando `123` via `StakingRef`
  (prova que o cross-contract trait-based segue íntegro).

## Fora de escopo desta spec

Críticas off-chain (#3 oracle-service, #4/#5 admin RBAC) → Fase B. Altos/médios → Fase D.

## Plano de tarefas (TDD)

1. Buildar `ico` e `lottery` (faltam artefatos wasm). → verify: `.contract` gerados.
2. Escrever harness e2e JS que reproduz AC1–AC6 contra o código **atual**. → verify: AC1–AC4 **falham** (prova do bug).
3. Implementar A1 (trait-based) + A2 (trancar `mint_paid`). → verify: `cargo check` + rebuild wasm OK.
4. Rodar harness. → verify: AC1–AC6 **passam**.
5. Commit atômico por mudança, com a spec referenciada. Usuário revisa antes de merge.
