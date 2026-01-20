# 🚀 Checklist de Produção - Don Fiapo

**Servidor Destino:** `75.119.155.116`  
**Data:** 2026-01-07

---

## 📋 Status Geral

| Categoria | Status | Observação |
|:----------|:------:|:-----------|
| Build Frontend | ✅ | Next.js 16.1.1 compila sem erros |
| Build Backend | ✅ | Oracle Service compila sem erros |
| Dockerfiles | ✅ | Ambos os serviços têm Dockerfile |
| Vulnerabilidades Críticas | ⚠️ | 3 HIGH restantes (bigint-buffer - dependência transitiva) |
| Contrato Smart | ⚠️ | Precisa verificar deploy na mainnet |
| Variáveis de Ambiente | ❌ | Precisam ser configuradas para produção |

---

## 1. 🔧 Infraestrutura

### 1.1 Servidor
- [ ] Verificar acesso SSH ao servidor `75.119.155.116`
- [ ] Verificar Docker e Docker Compose instalados
- [ ] Verificar portas abertas (80, 443, 3000, 3001)
- [ ] Configurar firewall (ufw ou iptables)
- [ ] Verificar espaço em disco disponível (mínimo 5GB)
- [ ] Verificar memória RAM disponível (mínimo 2GB)

### 1.2 Domínio e SSL
- [ ] Configurar domínio apontando para o servidor
- [ ] Instalar Nginx como reverse proxy
- [ ] Configurar certificado SSL (Let's Encrypt / Certbot)
- [ ] Redirecionar HTTP → HTTPS

---

## 2. 🔐 Segurança

### 2.1 Variáveis de Ambiente (CRÍTICO)
Criar arquivos `.env` de produção com valores reais:

**Oracle Service (`oracle-service/.env`):**
```env
# Solana - USE RPC DEDICADO (Helius/QuickNode)
SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=SEU_API_KEY

# Carteira USDT para receber pagamentos (PRODUÇÃO)
USDT_RECEIVER_ADDRESS=SUA_CARTEIRA_SOLANA_PRODUCAO

# USDT Token (Mainnet - não alterar)
USDT_TOKEN_ADDRESS=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB

# Lunes Network - múltiplas URLs para redundância
LUNES_RPC_URL=wss://ws.lunes.io,wss://ws-lunes-main-02.lunes.io

# Endereço do contrato (APÓS DEPLOY NA MAINNET)
CONTRACT_ADDRESS=ENDERECO_DO_CONTRATO_MAINNET

# Seed do Oracle (MANTENHA SEGURO - NUNCA COMMITE!)
ORACLE_SEED=//SuaSeedSecreta

# API Key para proteger endpoints
ORACLE_API_KEY=SUA_API_KEY_SEGURA_ALEATORIA

# Configurações
MIN_CONFIRMATIONS=12
POLL_INTERVAL_MS=10000
PORT=3001

# DESABILITAR MOCK EM PRODUÇÃO
ENABLE_MOCK_PAYMENTS=false
```

**Frontend (`don-fiapo-web/.env`):**
```env
# URL do Oracle em produção
NEXT_PUBLIC_ORACLE_URL=https://SEU_DOMINIO/api

# Lunes RPC
NEXT_PUBLIC_LUNES_RPC=wss://ws.lunes.io

# Endereço do contrato
NEXT_PUBLIC_CONTRACT_ADDRESS=ENDERECO_DO_CONTRATO_MAINNET

# Solana
NEXT_PUBLIC_SOLANA_RPC=https://rpc.helius.xyz/?api-key=SEU_API_KEY
NEXT_PUBLIC_SOLANA_RECEIVER=SUA_CARTEIRA_SOLANA
```

### 2.2 Checklist de Segurança
- [ ] Alterar `ORACLE_SEED` para uma seed segura
- [ ] Gerar `ORACLE_API_KEY` aleatória e segura
- [ ] Verificar que `.env` está no `.gitignore`
- [ ] Configurar rate limiting no Nginx
- [ ] Habilitar CORS apenas para domínios confiáveis
- [ ] Desabilitar modo MOCK (`ENABLE_MOCK_PAYMENTS=false`)

---

## 3. 📦 Smart Contract

### 3.1 Deploy na Mainnet
- [ ] Verificar saldo da conta de deploy na Lunes Mainnet
- [ ] Executar `cargo contract build --release` no diretório `don_fiapo`
- [ ] Fazer upload do contrato via Polkadot.js Apps
- [ ] Instanciar contrato com parâmetros corretos
- [ ] Anotar endereço do contrato: `_____________________`
- [ ] Configurar conta Oracle no contrato
- [ ] Testar funções básicas (balance, transfer)

### 3.2 Verificação Pós-Deploy
- [ ] Verificar `total_supply` do contrato
- [ ] Confirmar que owner está configurado corretamente
- [ ] Testar staking em pequena escala
- [ ] Testar mint de NFT gratuito

---

## 4. 🚀 Deploy Simplificado (Via Script)

Preparei um pacote de deploy automático na pasta `deploy/`. Basta copiar e rodar!

### 4.1 Preparação
- [ ] Verificar acesso SSH ao servidor `75.119.155.116`
- [ ] Copiar pasta `deploy/` para o servidor:
  ```bash
  scp -r deploy root@75.119.155.116:/root/don-fiapo-deploy
  ```

### 4.2 Execução no Servidor
1. Acessar servidor: `ssh root@75.119.155.116`
2. Entrar na pasta: `cd /root/don-fiapo-deploy`
3. Rodar script de setup (instala Docker, cria configs):
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
4. **IMPORTANTE:** Editar os arquivos `.env.web` e `.env.oracle` com suas chaves reais:
   ```bash
   nano .env.web
   nano .env.oracle
   ```
5. Subir os serviços:
   ```bash
   docker compose up -d
   ```

### 4.3 Configuração SSL (Automática)
O script já configurou o Certbot. Para gerar o certificado pela primeira vez:
```bash
docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d donfiapo.com -d www.donfiapo.com
docker compose restart nginx
```
---

## 5. 🌐 Arquitetura (Referência)
A configuração técnica completa está nos arquivos:
- `deploy/docker-compose.yml`: Orquestração dos containers
- `deploy/nginx/`: Configuração do Proxy Reverso
- `deploy/setup.sh`: Automação de ambiente

---

## 6. 📊 Monitoramento
- [ ] Verificar logs: `docker compose logs -f`
- [ ] Monitorar uso de CPU/RAM
- [ ] Endpoint de saúde: `https://donfiapo.com/api/oracle/health`

---

## 7. ⚠️ Vulnerabilidades Conhecidas
| Pacote | Severidade | Status | Ação |
|:-------|:----------:|:------:|:-----|
| bigint-buffer | HIGH | ⚠️ Risco Aceito | Dependência transitiva obrigatória do `@solana/wallet-adapter`. Mitigado pois não expõe RCE direto. Monitorar atualizações do ecossistema Solana. |
| next (RCE) | CRITICAL | ✅ Corrigido | Atualizado para 16.1.1 |
| jws | HIGH | ✅ Corrigido | npm audit fix aplicado |

---

## 8. 📝 Resumo do Passo-a-Passo
1. [ ] Deploy do Smart Contract na Lunes Mainnet
2. [ ] Copiar pasta `deploy/` para o servidor
3. [ ] Rodar `./setup.sh` no servidor
4. [ ] Preencher `.env.web` e `.env.oracle`
5. [ ] `docker compose up -d`
6. [ ] Gerar SSL (passo 4.3)


---

## 9. 🔗 Links Úteis

- **Polkadot.js Apps (Deploy):** https://polkadot.js.org/apps/?rpc=wss://ws.lunes.io
- **Helius RPC (Solana):** https://www.helius.dev/
- **Let's Encrypt (SSL):** https://letsencrypt.org/
- **Docker Compose Docs:** https://docs.docker.com/compose/

---

**Última atualização:** 2026-01-07 10:27 BRT
