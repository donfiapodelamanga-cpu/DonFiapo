# DonFiapo - Project Requirements and Test Specs

Data: 2026-06-10
Status: baseline consolidado apos analise de 5 especialistas

## Resposta objetiva

Antes deste documento, os requisitos nao estavam documentados de forma completa, atual e rastreavel.

Existiam tres camadas de documentacao:

- `Requisitos/requisitos.md` e `Requisitos/site.md`: requisitos amplos de produto, tokenomics, staking, governanca, ICO/NFTs e paginas.
- `INTEGRATION_FIX_CHECKLIST.md`: checklist recente de correcoes tecnicas e producao.
- `docs/CHECKLIST_PRODUCAO.md`, `deploy/README.md` e docs internas: deploy, seguranca e planos antigos.

O problema e que essas fontes nao separavam claramente:

- requisito de negocio;
- spec testavel;
- arquivo/rota responsavel;
- status real em codigo;
- evidencia de teste;
- bloqueador de producao.

Este documento passa a ser a spec mestre atual para continuar o projeto sem falso positivo. Ele nao declara que tudo esta implementado; ele declara o que precisa existir, como testar e o que bloqueia deploy.

## Regra de engenharia

Toda correcao nova deve seguir este fluxo:

1. Escrever ou atualizar spec/teste antes do codigo.
2. Rodar o teste e confirmar que falha pelo motivo esperado quando viavel.
3. Implementar a menor mudanca que satisfaz a spec.
4. Rodar teste isolado da mudanca.
5. Rodar gate ampliado quando a area for compartilhada ou financeira.
6. Atualizar este documento ou o checklist com status real.

Nao considerar uma feature pronta apenas porque buildou. Para areas financeiras, a feature so passa quando existe teste negativo, teste positivo e smoke operacional.

## Fontes atuais

- Requisitos de produto: `Requisitos/requisitos.md`
- Estrutura de site/admin: `Requisitos/site.md`
- Checklist tecnico atual: `INTEGRATION_FIX_CHECKLIST.md`
- Checklist de producao legado: `docs/CHECKLIST_PRODUCAO.md`
- Deploy atual: `deploy/docker-compose.yml`, `deploy/deploy.sh`, `deploy/nginx/conf.d/donfiapo.conf`
- Web app: `don-fiapo-web`
- Admin: `don-fiapo-admin`
- Oracle: `oracle-service`
- Contratos: `don_fiapo`

## Status por dominio

| Dominio | Status documental | Status tecnico | Risco |
|---|---|---|---|
| Producao/deploy | Parcialmente documentado | Corrigido localmente, nao aplicado em producao | Critico |
| Segredos | Parcialmente documentado | Ha segredo/artefato sensivel exposto | Critico |
| Spin game | Parcialmente documentado | Compra melhorada, roll ainda permite risco financeiro | Critico |
| Oracle/pagamentos | Parcialmente documentado | Proxy melhorado, contrato de API ainda permissivo | Critico |
| Admin/backoffice | Insuficiente | Rotas financeiras e RBAC incompletos | Critico |
| System wallets | Parcialmente documentado | Admin e web ainda dividem fonte de verdade | Alto |
| Staking | Produto documentado | Fluxo taxa -> stake nao e atomico/auditavel | Alto |
| Affiliate/referral | Parcialmente documentado | Link helper existe, handler publico `/ref/:code` falta | Alto |
| ICO/NFT/mining | Documentado em requisitos antigos | Cobertura E2E superficial | Medio/Alto |
| Governanca/rewards/lottery | Documentado em produto/contratos | Admin tem rotas TODO/fallback | Medio/Alto |
| SEO/i18n | Parcialmente documentado | Canonicals ainda precisam snapshots por locale | Medio |
| QA/CI | Insuficiente | Sem CI detectavel; Oracle tem teste placeholder | Alto |

## Bloqueadores P0

### P0-001 - Conter segredos e artefatos sensiveis

Requisito:
Nenhum segredo real, seed, mnemonic, API key ou `.env` pode ficar versionado ou dentro de pacote de deploy.

Evidencias atuais:

- `don-fiapo-web/SECURITY_AUDIT.md` contem mnemonic literal versionada.
- `deploy-package.zip` contem `.env*` e deve ser tratado como artefato comprometido.

Specs antes do codigo:

- `SPEC-SEC-001`: varredura falha se arquivo rastreado contem mnemonic/seed literal.
- `SPEC-SEC-002`: pacote de deploy falha se contem `.env`, `.env.local`, `.env.web`, `.env.admin` ou `.env.oracle`.
- `SPEC-SEC-003`: documentar rotacao de carteiras/chaves expostas antes de novo deploy.

Aceite:

- Segredo removido do working tree.
- Carteiras/chaves rotacionadas fora do repo.
- Historico Git tratado antes de push publico, se o segredo ja foi commitado.
- Build de pacote bloqueia `.env*`.

### P0-002 - Spin roll deve consumir saldo real antes de sortear/pagar

Requisito:
Um usuario so pode girar quando tiver saldo positivo de spins. O consumo deve ser atomico e protegido contra chamadas paralelas.

Problema:
`GET /api/games/spin` calcula saldo, mas `POST /api/games/spin/roll` nao garante saldo antes de sortear, gravar resultado e pagar premio.

Specs antes do codigo:

- `SPEC-SPIN-001`: roll com saldo zero retorna erro e nao cria `SpinResult`.
- `SPEC-SPIN-002`: roll com saldo zero nao chama payout.
- `SPEC-SPIN-003`: duas chamadas paralelas com saldo 1 resultam em exatamente 1 sucesso.
- `SPEC-SPIN-004`: limite diario permanece aplicado sob concorrencia.
- `SPEC-SPIN-005`: consumo e resultado ficam na mesma transacao logica ou com estado reconciliavel.

Aceite:

- Saldo calculado server-side.
- Uso do spin registrado antes do payout ou em transacao atomica.
- Teste de concorrencia cobrindo o caso mais perigoso.

### P0-003 - Compra de spin deve ser derivada no servidor

Requisito:
Cliente nao pode escolher quantidade de spins nem preco final. O cliente deve enviar `packageId`; servidor deriva `spins`, `priceUsdt`, mint, receiver e validade.

Problema:
O fluxo atual aceita `spins` e `priceUsdt` do body e pode liberar quantidade incorreta.

Specs antes do codigo:

- `SPEC-SPIN-PURCHASE-001`: `POST /purchase` rejeita body com preco/spins arbitrarios.
- `SPEC-SPIN-PURCHASE-002`: pacote invalido retorna 400 e nao cria purchase.
- `SPEC-SPIN-PURCHASE-003`: valor atomico esperado deve ser maior que zero.
- `SPEC-SPIN-PURCHASE-004`: `PATCH /purchase` valida mint, receiver, sender esperado e valor exato.
- `SPEC-SPIN-PURCHASE-005`: transaction hash usado antes nao pode confirmar nova compra.
- `SPEC-SPIN-PURCHASE-006`: se `POST /purchase` falha, o client nao chama `sendUSDT`.

Aceite:

- Tabela server-side de pacotes.
- Transacao Solana validada por saldos token pre/post.
- Sender esperado vinculado ao usuario/carteira quando possivel.

### P0-004 - Vinculo de wallet deve provar posse

Requisito:
Salvar `solanaWallet` para um `lunesAddress` exige prova de posse do endereco Lunes e prova ou assinatura do endereco Solana.

Problema:
Qualquer caller que saiba um `lunesAddress` pode tentar gravar/substituir wallet Solana de outro usuario.

Specs antes do codigo:

- `SPEC-WALLET-001`: sem assinatura Lunes valida, update retorna 401/403.
- `SPEC-WALLET-002`: assinatura com endereco Lunes diferente retorna 403.
- `SPEC-WALLET-003`: Solana wallet invalida retorna 400.
- `SPEC-WALLET-004`: tentativa de trocar wallet de outro usuario nao altera banco.
- `SPEC-WALLET-005`: challenge tem nonce, expiracao e single-use.

Status em 2026-06-10:
Implementado localmente no web. Specs executaveis:

- `src/lib/wallets/wallet-link-proof.test.ts`
- `src/lib/wallets/wallet-link-save.test.ts`
- `src/lib/wallets/wallet-link-route-contract.test.ts`

Implementacao:

- `POST /api/user/wallet/challenge` gera mensagem canonica server-side com nonce e expiracao.
- `POST /api/user/wallet` exige `challengeId`, assinatura Lunes e assinatura Solana antes de upsert.
- Challenge e consumido uma unica vez via `WalletLinkChallenge.consumedAt`.
- Solana wallet ja vinculada a outro usuario retorna conflito e nao altera a tabela `Wallet`.

Aceite:

- Challenge assinado.
- Nonce usado uma vez.
- Rastro minimo via challenge criado/consumido; auditoria dedicada de alteracoes de carteira fica como melhoria P1.

### P0-005 - Oracle publico nao pode criar beneficio arbitrario

Requisito:
Rotas publicas de pagamento devem aceitar apenas uma acao/produto permitido; valores financeiros devem ser derivados server-side.

Problema:
Proxy injeta `x-api-key`, mas repassa body publico para `api/payment`, permitindo combinacoes arbitrarias de `paymentType`, `itemAmount` e `expectedAmount`.

Specs antes do codigo:

- `SPEC-ORACLE-001`: cliente publico nao consegue criar pagamento com `expectedAmount` arbitrario.
- `SPEC-ORACLE-002`: `paymentType` desconhecido retorna 400.
- `SPEC-ORACLE-003`: `spin_purchase` exige package server-side.
- `SPEC-ORACLE-004`: `transactionHash` unico no Oracle.
- `SPEC-ORACLE-005`: replay de tx retorna conflito e nao chama contrato.
- `SPEC-ORACLE-006`: verificador Solana exige mint, receiver, sender e delta via balances.
- `SPEC-ORACLE-007`: `/api/oracle/health` via web proxy retorna ok quando envs estao corretas e 503 quando configuracao esta ausente.

Status em 2026-06-10:
Implementado localmente para os fluxos publicos atuais.

- `spin_purchase`: derivado por `packageId` oficial.
- `nft_mint`: derivado por `tierId` e `quantity`; `itemAmount` e `expectedAmount` publicos sao rejeitados.
- `staking`: derivado por `stakingType`, `paymentMethod=usdt` e `fiapoAmount`; LUSDT continua bloqueado ate existir verificador Lunes real.
- `ico`: rejeitado ate existir rota/policy derivada especifica.
- `expectedSender` e obrigatorio para NFT/staking em USDT, prendendo a verificacao a carteira Solana conectada.

Specs executaveis:

- `oracle-service/src/__tests__/payment-policy.test.ts`
- `don-fiapo-web/src/lib/api/oracle-payment.test.ts`
- `oracle-service/src/__tests__/oracle-api.test.ts`
- `oracle-service/src/__tests__/payment-replay.test.ts`

Aceite:

- API publica estreita.
- Banco do Oracle com unicidade para transacoes confirmadas.
- Testes reais substituem placeholder.

### P0-006 - Admin financeiro precisa RBAC server-side

Requisito:
Toda rota que lista, grava, seeda, desativa ou exporta dados financeiros deve validar sessao admin e permissao server-side.

Problemas:

- `/api/finance/*` esta fora do middleware protegido.
- `/api/admin/wallets` confia em RBAC da UI.
- Proxies mutaveis injetam `x-admin-key` antes de validar permissao de dominio.

Specs antes do codigo:

- `SPEC-ADMIN-001`: `POST /api/finance/wallets` sem sessao retorna 401.
- `SPEC-ADMIN-002`: sessao sem permissao `finance` retorna 403.
- `SPEC-ADMIN-003`: `/api/admin/wallets` exige permissao `finance` para POST/PATCH/DELETE.
- `SPEC-ADMIN-004`: proxy mutavel de airdrop/missions/migrations exige permissao correspondente.
- `SPEC-ADMIN-005`: `updatedBy` vem da sessao, nao do body.
- `SPEC-ADMIN-006`: operacao sensivel gera `AuditLog`.

Aceite:

- Middleware ou handler cobre `/api/finance/:path*`.
- RBAC nao depende de `localStorage`.
- Testes Jest cobrem 401/403/200.

### P0-007 - System wallets precisam fonte de verdade unica

Requisito:
Web server-side e web client-side devem resolver carteiras de sistema pela mesma fonte confiavel.

Problema:
Client web consulta admin public endpoint, mas servicos server-side ainda tentam `db.systemWallet`, enquanto o schema web nao possui `SystemWallet`.

Specs antes do codigo:

- `SPEC-WALLETS-001`: `spin_usdt`, `spin_lunes`, `spin_revenue`, `treasury_solana`, `ico_receiver` resolvem pelo mesmo helper.
- `SPEC-WALLETS-002`: role ausente falha fechado em operacoes financeiras.
- `SPEC-WALLETS-003`: endpoint publico so expoe roles ativas e enderecos validos.
- `SPEC-WALLETS-004`: seed cria templates sem sobrescrever enderecos existentes.
- `SPEC-WALLETS-005`: seed endpoint tem modelo unico de autenticacao.

Aceite:

- Payout e migration nao consultam modelo inexistente.
- Admin publico nao retorna `{}` em producao apos seed/env.

### P0-008 - Producao deve receber deploy e passar smoke

Requisito:
Producao deve refletir os manifests locais corrigidos.

Falhas observadas em 2026-06-10:

- `https://donfiapo.fun/en` responde 200, mas header `Link` vaza `https://don-fiapo-web:3000`.
- CORS ainda permite/origina localhost.
- Twitter OAuth redireciona para localhost com `x_error=not_configured`.
- `https://donfiapo.fun/api/oracle/health` retorna 500.
- `https://admin.donfiapo.fun/api/admin/wallets/public` retorna `{}`.
- `https://www.donfiapo.fun/en` nao resolve.

Specs antes do deploy:

- `SPEC-PROD-001`: `npm run smoke:prod` deve passar 6/6.
- `SPEC-PROD-002`: `docker compose config` deve passar no diretorio `deploy`.
- `SPEC-PROD-003`: `www.donfiapo.fun` resolve e tem certificado valido.
- `SPEC-PROD-004`: host/IP desconhecido redireciona para `https://donfiapo.fun`.
- `SPEC-PROD-005`: Oracle nao e exposto diretamente no Nginx.

Aceite:

- Smoke de producao verde.
- Logs sem crash loop.
- Admin wallets publicas nao vazias e sem endereco invalido.

## Requisitos funcionais por area

### Web publico e SEO

Requisitos:

- Origem publica de producao deve ser `https://donfiapo.fun`.
- Admin publico deve ser `https://admin.donfiapo.fun`.
- Locale deve ser consistente em canonical, sitemap, robots e redirects.
- Rotas publicas nao podem usar host interno Docker.

Specs:

- Snapshot de canonical/hreflang para `/en`, `/pt`, `/en/airdrop`, `/pt/games/spin`.
- Smoke de `Link` header sem `don-fiapo-web:3000`.
- CORS permite admin real e bloqueia localhost em producao.

### Twitter/X OAuth e missoes

Requisitos:

- OAuth deve usar callback publico.
- State/PKCE devem ser preservados.
- Falta de credencial em producao deve falhar de forma clara, nunca para localhost.
- Recheck de missao deve falhar fechado se `RECHECK_SECRET` estiver ausente.

Specs:

- Twitter auth sem env retorna erro sem redirect localhost.
- Callback usa cookie/state valido.
- `RECHECK_SECRET` ausente retorna 503/500.
- `Authorization: Bearer undefined` nunca autentica.

### Spin game

Requisitos:

- Compra de spins com USDT Solana validada por mint, receiver, sender e valor.
- Roll consome saldo antes de RNG/payout.
- Payout usa carteiras de sistema configuradas.
- Premios e limites devem ser auditaveis.

Specs:

- Ver P0-002, P0-003, P0-004 e P0-007.

### Staking

Requisitos:

- Taxa de entrada deve passar pelo Oracle.
- Stake deve ser vinculado a pagamento confirmado e single-use.
- Falha de stake depois de pagamento deve criar estado reconciliavel.
- LUSDT deve continuar desabilitado ate existir verificador Lunes real.

Specs:

- Pagamento confirmado vinculado a wallet, pool, amount e `paymentId`.
- Mesmo `paymentId` nao pode ser reutilizado.
- Falha da tx de stake registra estado de revisao/reembolso.
- Health do Oracle via proxy deve ser parte do fluxo.

### ICO, NFTs e mining

Requisitos principais de produto:

- NFTs mineradoras com tiers/precos/supply conforme `Requisitos/requisitos.md`.
- NFT gratuito limitado por carteira e regras de saldo Lunes.
- Mineracao linear por 112 dias.
- Vesting de tokens minerados por 112 dias.
- Evolucao de NFT deve queimar combinacoes validas e preservar historico.

Specs:

- Mint gratuito respeita limite por wallet.
- Mint pago exige pagamento validado.
- Claim diario calcula proporcional sem liberar transfer antes do fim do vesting.
- Evolucao rejeita NFTs de outro owner, NFTs ja queimadas e combinacoes invalidas.
- E2E atual deve ser reforcado com asserts de negocio, nao apenas render.

### Affiliate/referral

Requisitos:

- Link de referral deve usar dominio publico correto.
- `/ref/:code` deve capturar codigo, gravar cookie/ref e redirecionar para locale correto.
- Registro deve usar contrato/cliente affiliate correto.
- Comissoes e boost de APY precisam ser auditaveis.

Specs:

- `/ref/REF-...` grava cookie e redireciona.
- Codigo ambiguo/invalido retorna fluxo seguro.
- Pagina affiliate usa cliente dedicado de affiliate.
- Dashboard mostra apenas dados da wallet conectada.

### Airdrop e migration

Requisitos:

- Airdrop/missoes devem ser protegidos contra recheck aberto.
- Migration Solana deve falhar fechado sem treasury/mint.
- Validacao Solana deve exigir mint, destinatario, sender e delta.

Specs:

- Treasury ausente retorna erro configuracional.
- Tx Solana para receiver errado nao cria migration pendente.
- Amount do body nao prevalece sobre delta on-chain.
- Admin verify exige permissao server-side.

### Admin/backoffice

Requisitos:

- Login admin com sessao segura.
- Bootstrap admin por env deve ser one-time ou explicitamente restrito.
- Rotas de finance, wallets, airdrop, missions, migrations, transactions sync, settings e proxies mutaveis devem ter RBAC server-side.
- Seeds reais nao devem ser geradas/salvas em claro pelo painel sem decisao de custodia.
- `WalletTransaction` precisa migration antes de uso.

Specs:

- Ver P0-006.
- Login tem rate limit/lockout basico.
- `ADMIN_SESSION_SECRET`, `ADMIN_API_KEY`, `WEB_API_URL` e `SYSTEM_WALLET_*` documentados.
- `Noble` usa permissao padronizada e aparece no menu correto.
- Settings nao pode depender de APIs inexistentes sem status claro.

### Oracle service

Requisitos:

- Receber apenas chamadas autenticadas internas para rotas sensiveis.
- Verificar Solana por token balances.
- Persistir pagamento, status e tx hash com unicidade.
- Expor health real.
- Rodar watcher Lunes sem mock em producao.

Specs:

- Testes reais para `/health`, auth de API key, create payment, status, verify tx invalida, replay tx.
- `ENABLE_MOCK_PAYMENTS=false` em producao.
- `ORACLE_API_KEY` igual entre web e Oracle.

### Contratos Lunes

Requisitos:

- Enderecos de core, staking, governance, affiliate, rewards, airdrop, lottery, marketplace, oracle e spin devem ser resolvidos por env canonica.
- Deploy mainnet deve registrar enderecos e permitir smoke de leitura.
- Scripts que podem gastar LUNES real devem ser manuais/explicitamente aprovados.

Specs:

- Resolver de contrato aceita nome canonico e fallback legacy documentado.
- Smoke de leitura de contratos em RPC.
- Scripts de deploy falham non-zero em erro critico.

### Deploy e operacao

Requisitos:

- Usar `deploy/docker-compose.yml`, nao compose dev da raiz, para producao.
- Oracle fica atras do proxy web.
- Nginx publica web/admin e canonical redirect.
- DNS inclui `donfiapo.fun`, `www.donfiapo.fun`, `admin.donfiapo.fun`.
- Env files gerados nao entram no Git/pacote.

Specs:

- `npm run test:deploy`.
- `docker compose -f deploy/docker-compose.yml config --quiet`.
- `npm run smoke:prod`.
- Backup de volumes SQLite antes de deploy.
- Rollback documentado por imagem/env/db.

## Gates minimos

### Antes de qualquer deploy

```bash
npm run test:deploy
cd don-fiapo-web && npm run test:unit && npx tsc --noEmit --pretty false && npm run build
cd don-fiapo-admin && npm test -- --runInBand && npx tsc --noEmit --pretty false && npm run build
cd oracle-service && npm run build && npm test
```

Observacao: o teste atual do Oracle ainda nao e suficiente; deve ser substituido por specs reais antes de considerar pagamento seguro.

### Depois do deploy

```bash
npm run smoke:prod
```

Tambem validar manualmente:

- login/logout admin;
- wallets publicas nao vazias;
- Twitter OAuth sem localhost;
- Oracle health via proxy;
- create/status payment sem transacao real;
- verify com tx invalida retornando erro esperado;
- logs sem crash loop;
- DNS/certificados.

## Decisoes em aberto

1. Fonte de verdade de system wallets: admin endpoint interno vs replicacao no web DB.
2. Modelo de seed templates: sessao admin `finance` vs maquina-a-maquina com `ADMIN_API_KEY`.
3. UX de prova de posse de wallet Lunes/Solana.
4. Lista final de pacotes de spin e precos.
5. Contrato publico exato da API Oracle permitida para cada produto.
6. Tratamento operacional de pagamentos feitos quando a acao posterior falha.
7. Se `spin_game` on-chain continua ativo ou o spin sera somente offchain.
8. Politica de custodia: se o admin pode ou nao armazenar seed/private key.
9. Roadmap real de Lottery/Rewards/Governance no admin: on-chain real ou dashboard informativo.
10. CI oficial e quais gates bloqueiam merge/deploy.

## Proxima ordem de implementacao

1. Conter segredos e remover artefatos sensiveis.
2. Escrever specs do Spin roll sem saldo e compra server-side.
3. Corrigir Spin roll/purchase.
4. Escrever specs admin RBAC financeiro.
5. Proteger `/api/finance/*`, `/api/admin/wallets` e proxies mutaveis.
6. Escrever specs Oracle reais.
7. Endurecer Oracle/public proxy e replay protection.
8. Unificar system wallets.
9. Atualizar env docs e checklist de deploy.
10. Deployar e rodar `smoke:prod` ate passar.

## Conclusao

Os requisitos de negocio existem em documentos antigos, mas nao estavam completos como specs executaveis. A partir deste arquivo, o projeto tem uma baseline consolidada de requisitos, riscos e specs prioritarias. O trabalho restante e transformar cada spec P0 em teste real e codigo corrigido, sem considerar build verde como garantia de producao.
