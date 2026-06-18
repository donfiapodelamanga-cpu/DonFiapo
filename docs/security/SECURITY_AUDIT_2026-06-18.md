## 1. Resumo Executivo

O ecossistema **DonFiapo** abrange 20 contratos **ink! 4.3** (Substrate/Lunes), um **oracle-service** Node/TypeScript que faz a ponte de pagamentos Solana USDT, e dois apps **Next.js** (`don-fiapo-web` e `don-fiapo-admin`). Apos sintese adversarial dos 5 relatorios e **verificacao direta em codigo** dos achados de maior severidade, o veredito e **CRITICO**.

A camada off-chain demonstra maturidade real em varios pontos (correcoes P0/P1 verificadas: RNG server-side, derivacao server-side de preco, replay protection, prova de posse de carteira, proxy anti-SSRF, sessao HMAC+scrypt no admin, Prisma parametrizado). **Porem** o sistema carrega **5 vulnerabilidades CRITICAS ABERTAS** confirmadas em codigo, que atravessam contratos, oracle e admin, e um **risco sistemico dominante de Broken Access Control + verificacao de pagamento ausente** que permeia todas as fronteiras.

Tres delas sao mutuamente agravantes: ICO cunha NFTs pagos de graca (perda de arrecadacao), o oracle nem sequer consegue creditar pagamentos legitimos (ABI de retorno quebrado -> DoS de monetizacao), e o oracle-service aceita pagamento em token sem valor (bypass de mint). O produto **nao esta apto para mainnet/producao**.

## 2. Vulnerabilidades (priorizadas)

### CRITICAS

**C1 — ICO.mint_paid cunha NFTs de tier pago sem prova de pagamento on-chain**
- Severidade: **Critico** | OWASP: **A01:2021 Broken Access Control** (SWC-105)
- Local: `don_fiapo/contracts/ico/src/lib.rs:631-664`
- Risco/Prob/Impacto: **Verificado em codigo.** A mensagem e chamavel por qualquer conta; os unicos controles sao `ico_active`, `tier!=0`, supply nao esgotado e `payment_hash` inedito. Nao ha `caller==oracle`, `transferred_value()`, nem chamada ao oracle. **Probabilidade Alta.** Atacante passa strings arbitrarias e cunha NFTs mineradores de ate $500 de graca ate esgotar o cap, drenando o supply e a arrecadacao e inflando a emissao de FIAPO via mineracao.

**C2 — oracle_multisig declara retorno () mas callees retornam Result<...> (toda confirmacao reverte)**
- Severidade: **Critico** | OWASP: **SWC-113 (DoS with failed call) / A04:2021**
- Local: `oracle_multisig/src/lib.rs:343,363,382` vs `ico:668` / `staking:314` / `lottery:223`
- Risco/Prob/Impacto: **Verificado.** As tres chamadas usam `.returns::<()>()`, mas `mint_paid_for -> Result<u64,ICOError>`, `stake_for -> Result<u64,StakingError>`, `buy_tickets_for -> Result<(),LotteryError>`. O decode de `()` falha com retorno nao-vazio, caindo em `CrossContractCallFailed` e revertendo `submit_confirmation` **apos** o consenso M-de-N. **Probabilidade Alta.** Usuario paga em Solana, oraculos confirmam, e **nada e creditado on-chain** — DoS total do fluxo de monetizacao via oraculo.

**C3 — oracle-service: bypass de validacao de mint para spl-token 'transfer' e inner instructions**
- Severidade: **Critico** | OWASP: **A04:2021 Insecure Design** (prova on-chain incompleta)
- Local: `oracle-service/src/solana-verifier.ts:203-216, 226-232`
- Risco/Prob/Impacto: **Verificado.** O mint so e comparado quando `parsed.type === 'transferChecked'`; para `'transfer'` e para todas as **inner instructions** a transferencia e aceita sem validar o mint. **Probabilidade Media.** Atacante envia ao receiver esperado uma transferencia SPL de um token sem valor com `amount` igual ao esperado e libera spins/NFT/staking sem pagar USDT real.

**C4 — admin: rotas financeiras mutaveis sem RBAC por rota**
- Severidade: **Critico** | OWASP: **A01:2021 Broken Access Control**
- Local: `don-fiapo-admin/src/app/api/finance/{expenses,revenues,transactions}/route.ts`
- Risco/Prob/Impacto: **Verificado.** Os handlers POST nao chamam `requireAdminAuth(req,"finance")`; sao protegidos apenas pelo middleware, que so prova **autenticacao**, nunca **autorizacao por dominio**. **Probabilidade Alta.** Qualquer papel autenticado (marketing, comercial) cria despesas/receitas/transacoes (estas marcadas `completed`), forjando os livros financeiros.

**C5 — admin: proxy missions/verify libera payout sem requireAdminAuth (usa ADMIN_API_KEY)**
- Severidade: **Critico** | OWASP: **A01:2021 Broken Access Control**
- Local: `don-fiapo-admin/src/app/api/admin/missions/verify/route.ts:8`
- Risco/Prob/Impacto: **Verificado.** O POST chama `fetchWebApi` (que injeta a `ADMIN_API_KEY` privilegiada) sem qualquer checagem de permissao. **Probabilidade Alta.** Aprovar missoes dispara payout; qualquer sessao de baixo privilegio vira acao privilegiada upstream.

### ALTAS (priorizadas)
- **A1 — noble.register_revenue + rewards.add_rewards_fund sem auth de chamador** (DEDUP de 2 relatorios). `A01:2021/SWC-105`. `noble_affiliate/src/lib.rs:266-306`, `rewards/src/lib.rs:306-312`. **Verificado:** ambas `#[ink(message)]` sem `ensure_*`. Qualquer conta infla comissoes/fundos; `register_revenue` usa `base_amount` quando `transferred_value==0` (comissao sem Lunes).
- **A2 — governance.vote permite voto multiplo (sem 1-pessoa-1-voto)** `A04:2021`. `governance/src/lib.rs:223-262`. Sem `Mapping<(proposal_id,voter),bool>`; rate limit horario apenas desacelera. Captura de governanca por quem paga mais taxas.
- **A3 — oracle-service TOCTOU: dupla confirmacao on-chain (double-spend)** `A04:2021`. `index.ts:244-248,293-323`. Hash so persiste apos a chamada ao contrato; duas requisicoes concorrentes confirmam duas vezes antes do unique index travar.
- **A4 — oracle API key comparada com `!==` (nao timing-safe)** `A07:2021`. `index.ts:84`.
- **A5 — oracle API key default fraca `'dev-secret-key'` sem gate de forca** `A07:2021/A05:2021`. `index.ts:40`.
- **A6 — web: ausencia de sessao/proof-of-ownership (identidade via string `wallet`)** `A01:2021/A07:2021`. `games/spin/roll/route.ts:121-132`. **Verificado:** `userId` derivado de `findOrCreateUserByWallet(wallet)` sem assinatura/sessao — terceiro queima spins pagos da vitima.
- **A7 — web: IDOR em /api/migration e /api/referral** `A01:2021`. `migration/route.ts:108-126`, `referral/route.ts:90-122`. `userId` via query e vazado no `/api/leaderboard`.
- **A8 — admin: login sem rate limiting (brute force)** `A07:2021`. `auth/login/route.ts:15`.
- **A9 — admin: tokenomics PATCH sem RBAC** `A01:2021`. `admin/tokenomics/route.ts:34`.
- **A10 — admin: missions(route)/completions e collections/items/upload sem permissao por rota (agrupado RBAC-admin)** `A01:2021`. `requireAdminAuth(req)` sem permissao = qualquer papel; `createdBy` vindo do body (spoofavel).

### MEDIAS (resumo)
oracle_multisig sem piso de quorum no construtor (`==0`/`==1`); lottery RNG previsivel + lista de elegiveis do caller; spin_game RNG previsivel (impacto bounded off-chain); oracle stake_for/mint_paid_for confiam no payload do oraculo; spin_purchase sem expectedSender (front-running); CSP ausente no web; CSP/HSTS/headers ausentes no admin; Helmet/headers ausentes no oracle; CORS ausente no oracle; tokens X em texto puro; admin API key estatica unica sem rate limit/timing-safe; rate limiter oracle ineficaz sem trust proxy; vazamento de detalhes de erro no oracle.

### BAIXAS (resumo)
marketplace overpayment retido (**rebaixada de Medio**: requer erro do usuario, sem ganho do atacante); upgrade sem `set_code_hash`; CORS wildcard admin/public (apenas enderecos publicos); rate limiter web contornavel por chave do cliente; fallback `ADMIN_PASSWORD` em texto plano com `==`.

### Desafios adversariais (rebaixados/descartados)
- **Padrao CEI / reentrancia (rewards.claim, staking)** — o proprio auditor confirma que NAO e explotavel na semantica do pallet-contracts (transfer nativo nao executa codigo; PSP22 vai ao core confiavel sem hook). **Reclassificado para Info/defense-in-depth — NAO contado como vuln aberta.**
- **marketplace overpayment** — **rebaixada Medio->Baixo**: nao ha vetor de roubo por terceiro, apenas perda por erro do proprio comprador.
- **Permissao 'commercial' inexistente (noble)** — fail-closed, **nao e vulnerabilidade** (bug funcional/Info).
- **oracle_multisig threshold** — reportado Alto e Baixo; consolidado como **Medio**: e misconfiguracao de deploy (mitigavel no deploy), com defeito de codigo real apenas no caso `==0` (sem floor).

## 3. Correcoes (ANTES / DEPOIS) — Criticas e Altas

**C1 — ICO.mint_paid**
```rust
// ANTES (ico/src/lib.rs:631-664): qualquer caller, sem prova de pagamento
pub fn mint_paid(&mut self, tier: u8, payment_hash: String) -> Result<u64, ICOError> {
    // ... unico controle: used_payment_hashes.contains(&payment_hash)
    self.mint_nft_internal(caller, nft_tier, config.price_usdt_cents as u128, false)
}
// DEPOIS (Opcao A recomendada): remover mint_paid publico; usar SOMENTE mint_paid_for via oracle.
// Opcao B: exigir confirmacao do oracle multisig on-chain:
let oracle = self.oracle_contract.ok_or(ICOError::Unauthorized)?;
let confirmed: bool = build_call::<ink::env::DefaultEnvironment>().call(oracle)
    .exec_input(ExecutionInput::new(Selector::new(ink::selector_bytes!("is_payment_confirmed")))
        .push_arg(payment_hash.clone()).push_arg(caller).push_arg(config.price_usdt_cents).push_arg(false))
    .returns::<bool>().invoke();
if !confirmed { return Err(ICOError::PaymentRequired); }
```

**C2 — oracle ABI de retorno**
```rust
// ANTES (oracle_multisig:343)
.returns::<()>().try_invoke();
match result { Ok(Ok(())) => Ok(()), _ => Err(OracleError::CrossContractCallFailed) }
// DEPOIS — decodificar o tipo REAL do callee
.returns::<Result<u64, ICOError>>().try_invoke();
match result {
    Ok(Ok(Ok(_nft_id))) => Ok(()),
    Ok(Ok(Err(_))) => Err(OracleError::CrossContractCallFailed),
    _ => Err(OracleError::CrossContractCallFailed),
}
// stake_for -> Result<u64,StakingError>; buy_tickets_for -> Result<(),LotteryError>
```

**C3 — oracle-service mint bypass**
```ts
// ANTES (solana-verifier.ts:203)
if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
  if (parsed.type === 'transferChecked' && info.mint !== this.usdtTokenAddress) continue;
  return { sender: info.authority || info.source, receiver: info.destination, amount: parseInt(info.amount,10) };
}
// DEPOIS — so transferChecked, mint sempre validado (inclusive inner instructions)
if (parsed.type === 'transferChecked') {
  if (String(info.mint) !== String(this.usdtTokenAddress)) continue;
  return { sender: info.authority || info.source, receiver: info.destination, amount: parseInt(info.amount,10) };
}
// 'transfer' simples NAO prova o mint -> ignorar.
```

**C4 — admin finance RBAC**
```ts
// ANTES (finance/expenses/route.ts:37)
export async function POST(req: Request) { const body = await req.json(); await prisma.expense.create({ data: {...} }); }
// DEPOIS
import { requireAdminAuth } from "@/lib/server/admin-auth";
export async function POST(req: NextRequest) {
  const auth = requireAdminAuth(req, "finance");
  if (!auth.ok) return auth.response;
  // ... validar amount finito >= 0, depois create
}
// Mesmo padrao em revenues/route.ts e transactions/route.ts.
```

**C5 — admin missions/verify**
```ts
// ANTES (admin/missions/verify/route.ts:8)
export async function POST(req: NextRequest) { const res = await fetchWebApi("/api/missions/verify", {...}); }
// DEPOIS
export async function POST(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;
  const res = await fetchWebApi("/api/missions/verify", {...});
}
// Regra: todo proxy com fetchWebApi(protected=true) DEVE validar permissao server-side ANTES.
```

**A1 — noble/rewards access control**
```rust
// DEPOIS (rewards.add_rewards_fund)
let caller = self.env().caller();
if caller != self.owner && caller != self.core_contract
   && Some(caller) != self.staking_contract && Some(caller) != self.governance_contract {
    return Err(RewardsError::Unauthorized);
}
self.rewards_fund = self.rewards_fund.saturating_add(amount);
// noble.register_revenue: + allowlist revenue_sources setada por owner; rejeitar caller fora dela.
```

**A6 — web proof-of-ownership**
```ts
// DEPOIS (games/spin/roll/route.ts)
const session = await getVerifiedSession(req); // JWT httpOnly emitido apos challenge+assinatura
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.userId; // identidade NUNCA vem do body
```

**A3 — TOCTOU oracle**
```ts
// DEPOIS — reserva atomica ANTES de tocar o contrato Lunes
const reserved = PaymentRepository.reserveForTx(paymentId, transactionHash);
// UPDATE pending_payments SET status='processing', transaction_hash=? WHERE id=? AND status='pending'
if (!reserved) { res.status(409).json({ error: 'Transaction already in use' }); return; }
// agora verifica Solana e chama o contrato; rollback em falha.
```

**A4/A5 — oracle API key**
```ts
// DEPOIS
import { createHash, timingSafeEqual } from 'crypto';
function safeEqual(a, b){ return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest()); }
// config.apiKey: process.env.ORACLE_API_KEY || '';  e no boot:
if (!config.enableMock && (!config.apiKey || config.apiKey.length < 32)) throw new Error('ORACLE_API_KEY ausente/fraca');
```

## 4. Security Score — conta detalhada

Base **100**.

- **5 Criticas abertas** x (-30) = **-150**
- **10 Altas abertas** x (-20) = **-200**
- **13 Medias abertas** x (-10) = **-130**
- **5 Baixas abertas** x (-5) = **-25**
- **+5** boas praticas avancadas comprovadas (crypto.randomInt server-side; derivacao server-side de preco por id; prova de posse Lunes<->Solana com challenge+nonce+Ed25519/SR25519; Prisma 100% parametrizado; sessao HMAC+scrypt; overflow-checks=true + saturating_*)
- **+5** defesa em profundidade comprovada (proxy Oracle anti-SSRF fail-closed; CORS dinamico allowlist rejeitando hosts internos no web; replay protection por unique index; RBAC correto em finance/wallets)

Soma: `100 - 150 - 200 - 130 - 25 + 5 + 5 = -395` -> **piso 0**.

**Security Score final = 10/100** (piso 0 + reconhecimento dos +10 de bonus comprovado).
**Classificacao: CRITICO** (<50).

> Observacao adversarial: mesmo descartando integralmente a camada off-chain ja mitigada, as 5 criticas on-chain/oracle/admin sozinhas (-150) ja zeram o score. A nota nao melhora de forma significativa sem o fechamento das criticas.

## 5. Recomendacoes Estrategicas

1. **Gate de release**: nenhuma promocao a mainnet/producao ate fechar as 5 Criticas + a maioria das Altas. Corrigir o ABI do oracle com **teste e2e cross-contract** em `substrate-contracts-node` que de fato execute `build_call` (os testes unitarios atuais usam GovernanceDeposit justamente para nao exercer a chamada — mascarando C2).
2. **Autorizacao deny-by-default em todas as camadas**: wrapper `withPermission()` obrigatorio e tipado (`type Permission`) no admin; allowlists de contratos-fonte no on-chain (noble/rewards); sessao JWT httpOnly no web derivando `userId` de assinatura, nunca do body.
3. **Verificacao de pagamento robusta na fronteira**: somente `transferChecked` com mint USDT (inclusive inner); `expectedSender` obrigatorio em spin_purchase; reserva atomica anti-TOCTOU antes do contrato; derivar amount/tier de tabela de preco a partir do `amount_usdt` confirmado.
4. **Hardening de transporte/segredos**: Helmet + CORS allowlist + remocao do default `dev-secret-key` no oracle; `timingSafeEqual` para todos os segredos; AES-256-GCM para tokens X; CSP (report-only -> enforce) + HSTS no web e admin.
5. **Rate limiting distribuido**: Redis/Upstash chaveado por IP real (com `trust proxy`) ou `userId` de sessao — nunca por identificador do cliente; rate limit + backoff no login admin (hoje ausente).
6. **Governanca e RNG**: `has_voted` em governance; commit-reveal/VRF em lottery e spin_game; elegibilidade do sorteio derivada de saldos on-chain; piso de quorum (`>=2 && <= n`) no construtor do oracle_multisig.
7. **Preventivo 2025+**: CI de seguranca (teste que falha em mudanca de selector/ABI; lint rejeitando `#[ink(message)]` mutavel sem `ensure_*` e rota admin/finance sem `requireAdminAuth`; analise estatica ink!); **WAF/Shield** (Cloudflare/AWS WAF) na frente de web/admin/oracle com bot mitigation e protecao de credential stuffing; gestao de segredos via **KMS/secret manager** com rotacao, eliminando segredos em texto puro no `.env`/banco.

---

## Anexo — Ja Mitigado (verificado) vs Vulnerabilidades Abertas

**Ja mitigado (confirmado em codigo, NAO conta no score):**
- web: RNG de spin server-side (crypto.randomInt), consumo atomico de saldo, replay por txHash, compra derivada de packageId.
- web: prova de posse Lunes<->Solana (challenge+nonce+expiracao+Ed25519/SR25519); CORS dinamico com allowlist rejeitando localhost/IP interno (sem wildcard); proxy Oracle anti-SSRF fail-closed; Prisma parametrizado (sem SQLi); IDs UUID/cuid; sem logs de segredo.
- admin: sessao HMAC-SHA256 + scrypt; middleware fail-closed; RBAC correto em `/api/finance/wallets` e algumas overview; ADMIN_API_KEY obrigatoria em prod.
- oracle-service: derivacao server-side de valor/beneficio por id rejeitando preco do cliente; replay sequencial por unique index; SQL parametrizado (better-sqlite3).
- contratos: `overflow-checks=true` (release+dev) + `saturating_*` consistente (pendencia do PLANO_DE_ACAO ja corrigida); core PSP22 com `ensure_owner`/minter/burner; timelock gated; governance com replay de tx_hash.

**Vulnerabilidades abertas (contam no score):** 5 Criticas + 10 Altas + 13 Medias + 5 Baixas, detalhadas na Secao 2.