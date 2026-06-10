# DonFiapo Integration Fix Checklist

Data: 2026-06-09

Pratica adotada: cada correcao deve nascer com uma spec ou teste focado antes do codigo de producao. Quando a suite global estiver quebrada por debitos pre-existentes, rodar pelo menos o teste isolado da mudanca e registrar a limitacao.

Spec mestre atual: `docs/PROJECT_REQUIREMENTS_SPEC.md` (criada em 2026-06-10 apos analise com 5 especialistas). Esta passa a ser a fonte de rastreabilidade requisito -> spec -> teste -> status.

## P0 - Bloqueadores de producao

- [x] Validar compra de giros em Solana contra mint, destinatario e valor esperado antes de liberar spins.
- [x] Corrigir configuracao de mint USDT/USDC no front para nao depender de endereco devnet hardcoded em producao.
- [x] Corrigir Oracle proxy para falhar com 503 configuracional quando `ORACLE_SERVICE_URL`/`ORACLE_API_KEY` estiverem ausentes ou apontando para localhost em producao.
- [x] Corrigir fallback do OAuth Twitter/X para nao redirecionar/callback em `localhost`.
- [x] Corrigir URLs publicas/SEO para ignorar host interno `don-fiapo-web:3000` em producao.
- [x] Configurar CORS dinamico de producao sem origens localhost e sem header com lista separada por virgula.
- [x] Semear templates e validar carteiras de sistema, especialmente `spin_revenue` e tesouraria Solana; ficam inativas ate endereco valido ser configurado.
- [x] Corrigir manifests de deploy para publicar web/admin e manter Oracle atras do proxy seguro do web.
- [ ] Aplicar deploy em producao e validar que headers, OAuth e Oracle deixaram de usar localhost/IP interno.
- [x] Remover API keys hardcoded dos manifests/scripts de deploy versionaveis.
- [ ] Rotacionar no provedor qualquer chave que ja tenha sido exposta em historico/scripts antes de novo deploy.
- [ ] Conter segredo real versionado em `don-fiapo-web/SECURITY_AUDIT.md`, rotacionar carteira/chaves afetadas e limpar historico antes de push publico.
- [x] Remover/regenerar `deploy-package.zip` sem `.env*` e adicionar gate para impedir envs em pacote.
- [x] Corrigir `POST /api/games/spin/roll` para validar/consumir saldo atomico antes de RNG/payout.
- [x] Corrigir `POST /api/games/spin/roll` para rejeitar saldo zero antes de RNG/payout.
- [x] Fortalecer `POST /api/games/spin/roll` contra concorrencia paralela com consumo atomico/reconciliavel.
- [x] Corrigir compra de spin para aceitar somente `packageId` e derivar `spins`/`priceUsdt` no servidor.
- [x] Exigir prova de posse para vinculo Lunes -> Solana em `/api/user/wallet`.
- [x] Fechar proxy/API Oracle para nao permitir criacao publica de pagamento com beneficio arbitrario.
- [x] Endurecer Oracle para derivar `spin_purchase` por `packageId` oficial e rejeitar tipos/valores invalidos.
- [x] Adicionar replay protection de `transactionHash` no Oracle.
- [x] Proteger `/api/finance/*` e `/api/admin/wallets` com RBAC server-side.
- [x] Proteger proxies admin mutaveis de airdrop/missions/migrations/transactions com permissoes server-side por dominio.
- [x] Criar migration real para `WalletTransaction` no admin antes de usar sync/vendas/transacoes.
- [x] Unificar fonte de verdade de `SystemWallet` entre web server-side e admin.

## P1 - Integracoes quebradas ou inconsistentes

- [x] Alinhar endpoints de staking fee com as rotas reais do Oracle (`/api/payment/*` vs `/api/staking/*`).
- [x] Corrigir rota de roll do spin que referencia campos inexistentes no `User` (`solanaWallet`, `walletAddress`).
- [x] Unificar nomes de env do contrato do spin (`NEXT_PUBLIC_SPIN_GAME_CONTRACT` vs `NEXT_PUBLIC_SPIN_GAME_CONTRACT_ADDRESS`).
- [x] Corrigir manifesto Nginx para host desconhecido/IP direto redirecionar ao dominio canonico.
- [x] Corrigir links de referral/affiliate para nao usar `donfiapo.com`.
- [ ] Corrigir DNS/canonicals para `www.donfiapo.fun` e dominios alternativos planejados.
- [ ] Configurar DNS de `www.donfiapo.fun`; em 2026-06-09 o host nao resolve publicamente.
- [ ] Configurar credenciais reais de Twitter/X em producao; endpoint atual retorna `not_configured`.
- [x] Preparar seed idempotente de carteiras de sistema no admin; endpoint publico atual so muda apos deploy/env reais.
- [x] Corrigir proxies do admin para o web API: remover fallbacks diretos `WEB_API_URL || http://localhost:3000` das rotas criticas e exigir `ADMIN_API_KEY` em producao.
- [x] Corrigir cliente web de carteiras publicas para usar admin real (`localhost:3002` em dev, `admin.donfiapo.fun` em producao) e habilitar CORS no endpoint publico do admin.

## P2 - Qualidade tecnica para evitar falsos positivos

- [x] Adicionar runner unitario oficial ao `don-fiapo-web` ou formalizar script de testes isolados.
- [x] Reduzir erros de tsc globais para que `npm run build` e `tsc --noEmit` virem gates confiaveis no web.
- [x] Adicionar smoke tests de producao para Oracle, Twitter OAuth, CORS, canonical host, DNS `www` e carteiras de sistema.
- [ ] Fazer `npm run smoke:prod` passar apos deploy e configuracao de DNS/segredos/carteiras.
- [x] Documentar variaveis obrigatorias de producao sem valores sensiveis.
- [x] Consolidar requisitos e specs atuais do projeto em documento rastreavel.
- [x] Substituir teste placeholder do Oracle por specs reais de health, auth, create/status/verify e replay.
- [x] Substituir teste placeholder do Oracle por specs reais de policy de pagamento e replay.
- [x] Adicionar gate explicito de type-check do admin sem depender de `ignoreBuildErrors`.

## Execucao atual

- [x] Spec: rejeitar pagamento de spin com destinatario incorreto.
- [x] Spec: rejeitar pagamento de spin com mint incorreto.
- [x] Spec: rejeitar pagamento de spin com valor insuficiente.
- [x] Spec: aceitar pagamento de spin somente quando mint, destinatario e valor batem.
- [x] Codigo: usar transacao parseada de Solana e saldos SPL pre/post para validar a compra.
- [x] Spec: selecionar carteira de payout por rede priorizando carteira primaria.
- [x] Codigo: usar tabela `Wallet` para payouts USDT/LUNES no roll do spin.
- [x] Codigo: remover bloqueios restantes do `tsc --noEmit` do web.
- [x] Spec: resolver origem publica segura para redirects, SEO e CORS.
- [x] Codigo: aplicar origem publica em Twitter OAuth, callback, sitemap, robots, metadata e CORS dinamico.
- [x] Spec: resolver URL do web API e headers protegidos do admin.
- [x] Codigo: migrar proxies admin de spin, missions, migrations, referrals, airdrop e transactions sync para helper comum.
- [x] Codigo: corrigir bloqueios de TypeScript do admin e validar build.
- [x] Spec: payload, paths e status do Oracle payment para staking/NFT.
- [x] Codigo: staking fee usa `/api/oracle/api/payment/*`, envia `paymentType/itemAmount`, verifica por hash e desabilita LUSDT ate existir verificador Lunes.
- [x] Spec: resolver origem publica do admin para busca de system wallets.
- [x] Codigo: `/api/admin/wallets/public` responde CORS para o web app.
- [x] Spec: templates obrigatorios, normalizacao e validacao de `SystemWallet`.
- [x] Codigo: API admin bloqueia carteira ativa invalida, endpoint publico filtra enderecos invalidos, seed cria templates inativos/por-env.
- [x] Spec: configuracao segura do Oracle proxy e allowlist de paths.
- [x] Codigo: `/api/oracle/[...path]` valida config antes de chamar upstream, bloqueia paths proibidos e suporta resposta upstream nao-JSON.
- [x] Spec: deploy precisa conter admin, dominios `donfiapo.fun`/`admin.donfiapo.fun`, segredos compartilhados e Oracle atras do web proxy.
- [x] Codigo: `docker-compose.yml` inclui `don-fiapo-admin`, Nginx publica web/admin sem proxy direto para Oracle, scripts geram `.env.web`, `.env.admin` e `.env.oracle` coerentes.
- [x] Validacao: `node --test deploy/deploy-config.test.mjs`, `docker compose -f deploy/docker-compose.yml config --quiet`, `bash -n deploy/deploy.sh`, `bash -n deploy/setup.sh`.
- [x] Smoke: `npm run smoke:prod` criado para validar producao; em 2026-06-09 falha nos 6 pontos esperados antes do deploy/configuracao.
- [x] Spec: resolver contrato do spin aceita `NEXT_PUBLIC_SPIN_GAME_CONTRACT` e fallback legacy `NEXT_PUBLIC_SPIN_GAME_CONTRACT_ADDRESS`.
- [x] Codigo: `API_CONFIG`, `CONTRACT_ADDRESSES`, cliente on-chain do spin e verificador de missao usam o mesmo resolver.
- [x] Runner: `don-fiapo-web` agora tem `npm run test:unit` com 33 specs passando via `node --import tsx --test`.
- [x] Spec: referral link usa origem publica configurada e fallback deterministico por wallet.
- [x] Codigo: pagina de affiliate monta `/ref/...` com `buildReferralLink`; `npm run test:unit` agora cobre 33 specs.
- [x] Spec: Nginx exige `default_server` em 80/443 redirecionando host desconhecido para `https://donfiapo.fun`.
- [x] Codigo: default vhost adicionado ao manifesto Nginx; producao precisa receber deploy para alterar `http://75.119.155.116`.
- [x] Spec: manifests de deploy nao podem conter `api-key=` nem segredo UUID-like inline.
- [x] Codigo: removidos defaults Solana com API key embutida de `deploy.sh`.
- [x] Spec: `SOLANA_RECEIVER_WALLET` preenche wallets publicas Solana (`treasury_solana`, `ico_receiver`) quando envs especificas nao existem.
- [x] Codigo: rota protegida `/api/admin/wallets/seed-templates` cria/upserta templates de carteiras sem sobrescrever endereco/status existentes.
- [x] Deploy: `deploy.sh` chama o seed seguro via `x-admin-key` e falha hard se migration/db push/seed falharem.
- [x] Validacao final local: web `npm run test:unit`, web/admin `tsc --noEmit`, admin Jest, `npm run test:deploy`, web/admin `npm run build`.
- [x] Spec: gate de seguranca do deploy falha se arquivos rastreados tiverem mnemonic/seed literal ou se `deploy-package.zip` contiver `.env*`.
- [x] Codigo: `deploy/security-hygiene.test.mjs` adicionado ao `npm run test:deploy`.
- [x] Codigo: mnemonics/seeds rastreadas redigidas ou substituidas por env obrigatoria em `SECURITY_AUDIT.md`, `fund_deployer.ts`, `deploy_ico_contract.sh` e `get_address.cjs`.
- [x] Operacao local: `deploy-package.zip` removido por conter `.env.local`, `.env`, `.env.web` e `.env.oracle`.
- [x] Validacao: `npm run test:deploy` passou com 8/8 apos a correcao de higiene de segredos.
- [x] Spec: saldo de spin calcula `FREE_SPINS + compras CONFIRMED - usos`, nunca negativo, e rejeita usuario sem spin.
- [x] Codigo: `src/lib/games/spin-balance.ts` centraliza regra usada por GET e roll.
- [x] Codigo: `POST /api/games/spin/roll` chama `ensureSpinBalanceForUser` antes de selecionar premio, gravar resultado ou pagar premio.
- [x] Validacao: web `npm run test:unit` passou com 37/37 e `npx tsc --noEmit --pretty false` passou.
- [x] Spec: pacotes oficiais de spin sao resolvidos por `packageId` e rejeitam `spins`, `price`, `priceUsdt` ou `payToAddress` vindos do cliente.
- [x] Codigo: `src/lib/games/spin-packages.ts` centraliza pacotes oficiais.
- [x] Codigo: `POST /api/games/spin/purchase` gera `paymentId`, `spins`, `priceUsdt` e receiver no servidor.
- [x] Codigo: `SpinBuyModal` envia apenas `packageId` e usa `paymentId`/receiver retornados pelo backend antes de chamar a carteira Solana.
- [x] Validacao: web `npm run test:unit` passou com 40/40 e `npx tsc --noEmit --pretty false` passou.
- [x] Spec: rotas admin financeiras negam acesso sem permissao `finance` e usam email da sessao em vez de `updatedBy` do body.
- [x] Codigo: `/api/finance/wallets` exige `requireAdminAuth(req, "finance")` em GET/POST.
- [x] Codigo: `/api/admin/wallets` exige `requireAdminAuth(req, "finance")` em GET/POST/DELETE.
- [x] Codigo: middleware agora cobre `/api/finance/:path*`.
- [x] Validacao: admin `npm test -- --runInBand` passou com 44/44 e `npx tsc --noEmit --pretty false` passou.
- [x] Spec: consumo de spin cria `SpinResult` dentro de `$transaction` apos rechecagem de saldo e nao cria resultado quando saldo e zero.
- [x] Codigo: `src/lib/games/spin-consumption.ts` centraliza consumo transacional e retorna saldo pos-consumo.
- [x] Codigo: `POST /api/games/spin/roll` grava o consumo/resultado antes de qualquer payout.
- [x] Validacao: web `npm run test:unit` passou com 42/42 e `npx tsc --noEmit --pretty false` passou.
- [x] Spec: proxies admin mutaveis nao chamam `fetchWebApi` sem permissao server-side.
- [x] Codigo: proxies de airdrop claims e migrations exigem `transactions`.
- [x] Codigo: proxies de mission milestones e referral fraud exigem `marketing`.
- [x] Validacao: admin `npm test -- --runInBand` passou com 49/49 e `npx tsc --noEmit --pretty false` passou.
- [x] Spec: schema admin nao pode declarar `WalletTransaction` sem migration SQL correspondente.
- [x] Codigo: migration `20260610120000_add_wallet_transactions` cria `WalletTransaction` e unique index em `externalId`.
- [x] Validacao: admin `npm test -- --runInBand` passou com 50/50, `npx tsc --noEmit --pretty false` passou e `npx prisma validate` passou.
- [x] Spec: web server-side nao pode consultar modelo Prisma local `SystemWallet`.
- [x] Codigo: payout USDT/LUNES usa `getSystemWalletAddress` do helper admin/env.
- [x] Codigo: migration Solana usa `migration_treasury` via helper e falha fechado com 503 quando tesouraria nao esta configurada.
- [x] Spec: vinculo Lunes -> Solana exige challenge com nonce/expiracao, assinatura Lunes, assinatura Solana e rejeita replay/conflito.
- [x] Codigo: `/api/user/wallet/challenge` cria challenge canonico; `/api/user/wallet` consome challenge uma vez e salva Solana apenas apos prova das duas carteiras.
- [x] Spec: Oracle deriva `nft_mint` por `tierId/quantity` e staking por `stakingType/paymentMethod/fiapoAmount`, rejeitando `itemAmount/expectedAmount` publicos.
- [x] Codigo: cliente web de NFT/staking usa builders derivados; Oracle rejeita `ico`, payment types desconhecidos, LUSDT e overrides de preco/beneficio.
- [x] Validacao: web `npm run test:unit` passou com 43/43 e `npx tsc --noEmit --pretty false` passou.
- [x] Spec: Oracle deriva compra de spin por package oficial, rejeita `spin_purchase` sem `packageId`, rejeita tipo desconhecido e rejeita valores nao positivos.
- [x] Codigo: `oracle-service/src/payment-policy.ts` normaliza payloads de pagamento antes de persistir.
- [x] Spec: Oracle persiste `transaction_hash` com unique index e verifica replay antes de confirmar pagamento.
- [x] Codigo: `PaymentRepository.findByTransactionHash` e `completeWithTransactionHash` adicionados; `/api/payment/verify` retorna 409 para tx reutilizada.
- [x] Validacao: Oracle `npm test -- --runInBand` passou com 5/5 e `npm run build` passou.
