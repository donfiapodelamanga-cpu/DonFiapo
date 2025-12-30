# Environment Variables

## Required Variables

Create a `.env.local` file with the following variables:

```bash
# Oracle Service URL
NEXT_PUBLIC_ORACLE_URL=http://localhost:3001

# Lunes Network RPC
NEXT_PUBLIC_LUNES_RPC=wss://ws.lunes.io

# Don Fiapo Contract Address (replace with actual deployed address)
NEXT_PUBLIC_CONTRACT_ADDRESS=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_RECEIVER=YOUR_SOLANA_RECEIVER_WALLET_ADDRESS
```

## Development Setup

1. Copy the variables above to `.env.local`
2. Replace placeholder values with actual addresses
3. Start the development server: `npm run dev`

## Production Setup

Set the environment variables in your hosting platform (Vercel, Netlify, etc.)

Make sure to:
- Use mainnet RPC URLs
- Deploy the oracle service and update the URL
- Deploy the smart contract and update the address
- Set up a secure Solana receiver wallet

https://docs.pinata.cloud/quickstart