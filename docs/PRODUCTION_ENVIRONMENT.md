# DonFiapo Production Environment

Data: 2026-06-10

Este documento lista variaveis obrigatorias sem valores sensiveis. Nao commitar `.env`, seeds, mnemonics, chaves privadas, API keys reais ou arquivos gerados com esses valores.

## Web (`don-fiapo-web`)

- `DATABASE_URL`: banco do web.
- `NEXT_PUBLIC_APP_URL`: origem publica canonica, por exemplo `https://donfiapo.fun`.
- `ADMIN_PUBLIC_BASE_URL`: origem publica do admin usada para carteiras publicas.
- `ORACLE_SERVICE_URL`: URL interna/publica do Oracle acessivel pelo web server; em producao nao pode ser `localhost`.
- `ORACLE_API_KEY`: segredo compartilhado web -> Oracle.
- `TWITTER_CLIENT_ID`: app OAuth X/Twitter.
- `TWITTER_CLIENT_SECRET`: segredo OAuth X/Twitter.
- `TWITTER_CALLBACK_URL`: callback publico HTTPS.
- `NEXT_PUBLIC_LUNES_RPC`: RPC Lunes.
- `NEXT_PUBLIC_SOLANA_RPC`: RPC Solana.
- `NEXT_PUBLIC_SOLANA_USDT_MINT`: mint USDT Solana.
- `NEXT_PUBLIC_SOLANA_USDC_MINT`: mint USDC Solana.
- `NEXT_PUBLIC_SOLANA_RECEIVER`: receiver Solana publico para pagamentos onde aplicavel.
- `SPIN_REVENUE_SOLANA_WALLET`: receiver Solana de compra de spins.
- `SOLANA_USDT_MINT_ADDRESS`: mint USDT usado em verificacao server-side.
- `SOLANA_ADMIN_PRIVATE_KEY`: chave do pagador de premios Solana, somente server-side.
- `LUNES_MNEMONIC`: mnemonic do pagador Lunes, somente server-side.
- `NEXT_PUBLIC_CORE_CONTRACT`
- `NEXT_PUBLIC_ICO_CONTRACT`
- `NEXT_PUBLIC_STAKING_CONTRACT`
- `NEXT_PUBLIC_AIRDROP_CONTRACT`
- `NEXT_PUBLIC_AFFILIATE_CONTRACT`
- `NEXT_PUBLIC_GOVERNANCE_CONTRACT`
- `NEXT_PUBLIC_REWARDS_CONTRACT`
- `NEXT_PUBLIC_MARKETPLACE_CONTRACT`
- `NEXT_PUBLIC_SPIN_GAME_CONTRACT`

## Admin (`don-fiapo-admin`)

- `DATABASE_URL`: banco do admin.
- `ADMIN_URL`: origem publica do admin, por exemplo `https://admin.donfiapo.fun`.
- `NEXT_PUBLIC_ADMIN_URL`: origem publica usada pelo frontend admin.
- `WEB_API_URL`: URL interna/publica do web API usada pelos proxies admin.
- `ADMIN_API_KEY`: segredo compartilhado admin -> web API.
- `ADMIN_SESSION_SECRET`: segredo de sessao admin.
- `NEXT_PUBLIC_WEB_URL`: origem publica do web app.
- `SYSTEM_WALLET_SEED_SECRET`: segredo operacional para seeds protegidos, se aplicavel.
- `TREASURY_SOLANA_WALLET`
- `SPIN_REVENUE_SOLANA_WALLET`
- `MIGRATION_TREASURY_WALLET`
- `ICO_RECEIVER_WALLET`
- `SPIN_USDT_WALLET`
- `SPIN_LUNES_WALLET`

## Oracle (`oracle-service`)

- `PORT`: porta do servico Oracle.
- `ORACLE_API_KEY`: segredo compartilhado recebido do web.
- `DB_PATH`: caminho do banco SQLite/volume persistente do Oracle.
- `SOLANA_RPC_URL`: RPC Solana.
- `USDT_TOKEN_ADDRESS`: mint USDT aceito.
- `USDT_RECEIVER_ADDRESS`: receiver USDT oficial.
- `LUNES_RPC_URL`: lista de RPCs Lunes separada por virgula.
- `CONTRACT_ADDRESS`: contrato Lunes que recebe confirmacoes.
- `NOBLE_CONTRACT_ADDRESS`: contrato Noble, quando habilitado.
- `ORACLE_SEED`: seed/mnemonic do Oracle, somente server-side.
- `MIN_CONFIRMATIONS`: confirmacoes minimas para Solana.
- `POLL_INTERVAL_MS`: intervalo do watcher.
- `ENABLE_MOCK_PAYMENTS`: deve ser `false` em producao.

## Deploy/Infra

- `DOMAIN`: dominio principal.
- `ADMIN_DOMAIN`: dominio do admin.
- `SSL_EMAIL`: email para certificados.
- `POSTGRES_PASSWORD` ou credenciais equivalentes se o deploy usar Postgres.

## Regras

- Rotacionar qualquer chave que ja tenha aparecido em historico Git, logs, zips ou documentos.
- `deploy-package.zip` nao pode conter `.env*`.
- `npm run smoke:prod` deve passar depois do deploy e configuracao DNS/segredos.
- DNS esperado: `donfiapo.fun`, `admin.donfiapo.fun` e `www.donfiapo.fun` quando o alias `www` for habilitado.
