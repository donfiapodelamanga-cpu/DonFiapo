# 🔮 Don Fiapo Oracle Service

Serviço de verificação de pagamentos USDT na Solana para o contrato Don Fiapo.

## 📋 Visão Geral

Este serviço atua como uma ponte entre a blockchain Solana (pagamentos USDT) e a rede Lunes (contrato Don Fiapo).

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Usuário   │────▶│  Oracle Service  │────▶│ Contrato Lunes  │
│  (Frontend) │     │    (este app)    │     │  (Don Fiapo)    │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                     │
       │                     ▼
       │            ┌──────────────────┐
       └───────────▶│     Solana       │
         Paga USDT  │  (verificação)   │
                    └──────────────────┘
```

## 🚀 Instalação

```bash
cd oracle-service
npm install
```

## ⚙️ Configuração

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Configure as variáveis:

```env
# Solana - Use Helius ou QuickNode para melhor performance
SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_API_KEY

# Sua carteira Solana para receber USDT
USDT_RECEIVER_ADDRESS=YOUR_SOLANA_WALLET

# Contrato USDT oficial na Solana
USDT_TOKEN_ADDRESS=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB

# Rede Lunes - Use múltiplas URLs separadas por vírgula para redundância
LUNES_RPC_URL=wss://ws.lunes.io,wss://ws-backup.lunes.io

# Endereço do contrato Don Fiapo (após deploy)
CONTRACT_ADDRESS=5...

# Seed da conta oracle (MANTENHA SEGURO!)
ORACLE_SEED=//OracleAccount

# Configurações
MIN_CONFIRMATIONS=12
PORT=3000
```

## 🏃 Execução

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 📡 API Endpoints

### `GET /health`

Health check do serviço.

```bash
curl http://localhost:3000/health
```

### `POST /api/payment/create`

Cria um pagamento pendente.

```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "lunesAccount": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "fiapoAmount": 1000000000000,
    "expectedAmount": 10000000
  }'
```

**Resposta:**

```json
{
  "paymentId": "PAY_1700000000000_abc123",
  "payToAddress": "YOUR_SOLANA_WALLET",
  "amount": 10000000,
  "amountUsdt": 10,
  "expiresAt": 1700003600000,
  "instructions": "Envie 10 USDT para YOUR_SOLANA_WALLET"
}
```

### `POST /api/payment/verify`

Verifica e confirma um pagamento após o usuário enviar USDT.

```bash
curl -X POST http://localhost:3000/api/payment/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "PAY_1700000000000_abc123",
    "transactionHash": "5VfydnLu4XWeL3tAHMQkjAVTNzHhyGqLLxTDeysxLwHBSvHyYBwRUuVbzEaumd2ywLb9nc8ojdh8yzAuFcZr2ih"
  }'
```

**Resposta (sucesso):**

```json
{
  "success": true,
  "message": "Payment verified and confirmed",
  "solana": {
    "transactionHash": "5Vfy...",
    "sender": "EPjF...",
    "amount": 10000000,
    "confirmations": 15
  },
  "lunes": {
    "transactionHash": "0x...",
    "blockNumber": 12345
  }
}
```

### `GET /api/payment/:id`

Consulta status de um pagamento.

```bash
curl http://localhost:3000/api/payment/PAY_1700000000000_abc123
```

## 🔒 Segurança

### Medidas Implementadas

1. **Verificação de Oracle Autorizado** - Apenas a conta configurada pode confirmar pagamentos
2. **Proteção Double-Spend** - Transações são registradas e não podem ser reprocessadas
3. **Validação de Formato** - Hash e endereços Solana são validados
4. **Timeout de Pagamento** - Pagamentos expiram após 1 hora
5. **Confirmações Mínimas** - 12 confirmações antes de aceitar

### Recomendações

- **NUNCA** exponha o `ORACLE_SEED` publicamente
- Use HTTPS em produção
- Configure firewall para limitar acesso
- Monitore logs para atividades suspeitas
- Use um RPC Solana dedicado (Helius, QuickNode)

## 🔄 Fluxo Completo

```
1. Frontend chama POST /api/payment/create
   → Retorna endereço e valor para pagar

2. Usuário envia USDT na Solana para o endereço retornado

3. Usuário copia o transaction hash

4. Frontend chama POST /api/payment/verify com o hash
   → Oracle verifica na Solana
   → Se válido, confirma no contrato Lunes
   → Retorna sucesso

5. Contrato Lunes libera funcionalidade (staking, ICO, etc.)
```

## 🧪 Testando Localmente

1. Use a testnet Solana:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
```

2. Use a testnet Lunes:

```env
LUNES_RPC_URL=wss://ws-test.lunes.io
```

3. Crie tokens USDT de teste no devnet Solana

## 📊 Monitoramento

O serviço loga todas as operações. Recomendamos:

- Configurar alertas para erros
- Monitorar latência das verificações
- Acompanhar taxa de sucesso/falha

## 🆘 Troubleshooting

### "Transaction not found"

- Aguarde mais confirmações
- Verifique se o hash está correto

### "Unauthorized oracle"

- Verifique se `ORACLE_SEED` está correto
- Confirme que a conta oracle está configurada no contrato

### "Transaction already processed"

- A transação já foi usada para outro pagamento
- Proteção contra double-spend funcionando

## 📄 Licença

MIT
