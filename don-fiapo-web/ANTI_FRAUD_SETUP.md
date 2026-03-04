# Anti-Fraud System — Setup Guide

## Variáveis de Ambiente Necessárias

Adicione ao seu `.env.local`:

```env
# ─── X (Twitter) OAuth 2.0 PKCE ────────────────────────────────────────────
# Obtidas em: https://developer.twitter.com/en/portal/dashboard
# App type: Web App (Confidential Client) — necessário para Client Secret
TWITTER_CLIENT_ID=seu_client_id_aqui
TWITTER_CLIENT_SECRET=seu_client_secret_aqui
TWITTER_CALLBACK_URL=http://localhost:3000/api/auth/twitter/callback

# ─── Telegram Bot ───────────────────────────────────────────────────────────
# Crie um bot via @BotFather no Telegram
# O bot DEVE ser administrador do grupo/canal para getChatMember funcionar
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_GROUP_ID=-1001234567890

# ─── Recheck Cron Job ───────────────────────────────────────────────────────
# Segredo para autorizar chamadas ao endpoint /api/missions/recheck
# Use uma string longa e aleatória em produção
RECHECK_SECRET=seu-segredo-aqui

# ─── App URL (usado nos redirects OAuth) ────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Configuração do X Developer App

1. Acesse [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard)
2. Crie ou edite seu App
3. Em **Authentication settings**:
   - Ative **OAuth 2.0**
   - Selecione **Web App** (Confidential Client)
   - Adicione o Callback URL: `https://seu-dominio.com/api/auth/twitter/callback`
   - Adicione também `http://localhost:3000/api/auth/twitter/callback` para dev
4. Copie o **Client ID** e **Client Secret**

### Tier necessário por tipo de missão

| Tipo de Missão | Tier Mínimo | Custo    |
|----------------|-------------|----------|
| FOLLOW         | Free        | Grátis   |
| LIKE           | Free        | Grátis   |
| REPOST         | Free        | Grátis   |
| COMMENT        | **Basic**   | $100/mês |

> ⚠️ O operador `conversation_id:` usado na verificação de COMMENT requer o plano **Basic** ou superior.
> Em produção, desative missões do tipo COMMENT se não tiver o plano Basic.

---

## Configuração do Telegram Bot

1. Abra o Telegram e fale com [@BotFather](https://t.me/BotFather)
2. Use `/newbot` para criar um bot
3. Copie o token gerado → `TELEGRAM_BOT_TOKEN`
4. **Adicione o bot como administrador** no seu grupo/canal
5. Para obter o `TELEGRAM_GROUP_ID`:
   - Encaminhe uma mensagem do grupo para [@userinfobot](https://t.me/userinfobot)
   - O ID será algo como `-1001234567890` (negativo para supergrupos/canais)

---

## Configuração do Cron Job (Recheck)

O endpoint `POST /api/missions/recheck` deve ser chamado periodicamente para re-verificar
ações sociais e revogar pontos de quem desfez a ação (desfollowou, saiu do grupo, etc.).

### Vercel Cron (recomendado)

Adicione ao `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/missions/recheck",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

> ⚠️ Vercel Cron não envia o header `Authorization`. Use um serviço externo como
> [cron-job.org](https://cron-job.org) configurando o header `Authorization: Bearer <RECHECK_SECRET>`.

### cron-job.org (alternativa gratuita)

- URL: `https://seu-dominio.com/api/missions/recheck`
- Method: `POST`
- Header: `Authorization: Bearer <RECHECK_SECRET>`
- Schedule: a cada 6 horas

---

## Formato do campo `targetUrl` nas Missions

O campo `targetUrl` da `Mission` deve seguir este formato dependendo do `actionType`:

| actionType | Formato de targetUrl           | Exemplo                          |
|------------|-------------------------------|----------------------------------|
| FOLLOW     | `follow:<X_USER_ID_NUMERICO>` | `follow:44196397`                |
| LIKE       | `tweet:<TWEET_ID>`            | `tweet:1234567890123456789`      |
| REPOST     | `tweet:<TWEET_ID>`            | `tweet:1234567890123456789`      |
| COMMENT    | `tweet:<TWEET_ID>`            | `tweet:1234567890123456789`      |
| TELEGRAM   | *(não usado — usa GROUP_ID)*  | —                                |

> Para o FOLLOW, use o **ID numérico** do perfil X, não o username.
> Para obter o ID de um perfil: `GET /2/users/by/username/:username`

---

## Fluxo Completo para o Usuário

1. Usuário conecta a wallet (Lunes)
2. Para missões X: clica em **Connect X** → OAuth redirect → callback salva tokens
3. Para missões Telegram: completa a missão → bot verifica membership via `getChatMember`
4. Clica em **Verify Quest** → backend chama a API X/Telegram em tempo real
5. Se verificado: pontos adicionados, `recheckAt` agendado para 24-72h depois
6. Job de recheck verifica periodicamente → revoga pontos se ação foi desfeita
