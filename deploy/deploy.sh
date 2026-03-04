#!/bin/bash
set -e

# ============================================
# Don Fiapo - Production Deployment Script
# Server: 75.119.155.116
# ============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Don Fiapo - Deployment Script${NC}"
echo "============================================"

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}Docker installed!${NC}"
fi

# 2. Create .env.web (Frontend)
echo -e "${YELLOW}Creating .env.web...${NC}"
cat > .env.web << 'EOF'
NEXT_PUBLIC_ORACLE_URL=http://75.119.155.116/api/oracle
NEXT_PUBLIC_LUNES_RPC=wss://ws.lunes.io,wss://ws-lunes-main-02.lunes.io
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com,https://mainnet.helius-rpc.com/?api-key=a5b95fe2-7bde-414b-8ab4-e2efec736d35,https://solana.drpc.org
NEXT_PUBLIC_SOLANA_RECEIVER=Cx5z3uLHZhyiGqrUk65vsxdEMgd5ujwzLx5dsMrqNLjB
DATABASE_URL=file:/app/db/dev.db

# Contract Addresses (Updated 2026-01-25)
NEXT_PUBLIC_CORE_CONTRACT=5DgU3eU5EhBF7Sr79Zo45S8BhMUrqhPPkQeHnN4jYLCHtfvi
NEXT_PUBLIC_STAKING_CONTRACT=5EnoaKTmBYS4T2tvHEwG8QibVJghrFdJHtmrcjxBBrFrJDMa
NEXT_PUBLIC_ORACLE_MULTISIG_CONTRACT=5HcdK7GTqbyY6sQTCZGrfHaDT7k2aPnMULiteGsVv8gRVsJZ
NEXT_PUBLIC_ICO_CONTRACT=5E3LsdqLvDHZiDVviDkkF4tX8XAUC4CGUwwYzcY93Smn1Qac
NEXT_PUBLIC_MARKETPLACE_CONTRACT=5GBVmJzYNg9f6oNs121JwBi8xHGuwLVTM6hzgMXaM1EnFSd6
NEXT_PUBLIC_LOTTERY_CONTRACT=5EgLeGCyCZUAUzTGoXWaDpYiiLukveMkUG3y6T3GMiBdmnRL
NEXT_PUBLIC_SPIN_GAME_CONTRACT=5CEMEjVhT1HbyXLYKxwgF3cQ3tqHx72HJcnMqs7E2EuzRLnx
NEXT_PUBLIC_AIRDROP_CONTRACT=5GikVxLdZcrzBASAih3QejG579jCFWYpurxfD3pN3qjBS6jV
NEXT_PUBLIC_REWARDS_CONTRACT=5DeaitntGGJNSRJNgq3GCEgxC5Pqt6Qv5NmCqhvvJq6A5n4U
NEXT_PUBLIC_AFFILIATE_CONTRACT=5Dg3itXXTzBZYpTEGg1ZpGcLUkPxJoNg9CULhNvub3oxqXyR
NEXT_PUBLIC_GOVERNANCE_CONTRACT=5CNQhoAs368o7S53B82dnSK9zADDrKbuPn2J9uR64KWsUHa5
NEXT_PUBLIC_SECURITY_CONTRACT=5CFmZwH82q5EH1K8o4aY3MjA1iSSrXb314NWaRinsJG7GqV4
NEXT_PUBLIC_TIMELOCK_CONTRACT=5CXmNEyzxo1AjYzcx5n8fkBfr1spVs73KEJkEF558e4PnJYe
NEXT_PUBLIC_UPGRADE_CONTRACT=5Cjsh3qx3CxxBFody4KEmyiGybhsqBMqd4dxP9RYmEiBk6ex
EOF
echo -e "${GREEN}✓ .env.web created${NC}"

# 3. Create .env.oracle (Backend)
echo -e "${YELLOW}Creating .env.oracle...${NC}"

# Generate random API key if not exists
API_KEY=$(openssl rand -hex 32)

cat > .env.oracle << EOF
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com,https://mainnet.helius-rpc.com/?api-key=a5b95fe2-7bde-414b-8ab4-e2efec736d35,https://solana.drpc.org
USDT_RECEIVER_ADDRESS=Cx5z3uLHZhyiGqrUk65vsxdEMgd5ujwzLx5dsMrqNLjB
LUNES_RPC_URL=wss://ws.lunes.io,wss://ws-lunes-main-02.lunes.io
CONTRACT_ADDRESS=5FnyHugYUp4rnBSXAVjGfK7U9NmobC2tTQAZD1Gvv5nxFtJh
ORACLE_SEED=ALTERE_PARA_SUA_SEED_SECRETA
ORACLE_API_KEY=${API_KEY}
MIN_CONFIRMATIONS=12
PORT=3001
ENABLE_MOCK_PAYMENTS=false
EOF
echo -e "${GREEN}✓ .env.oracle created${NC}"

# 4. Create necessary directories
mkdir -p certbot/conf
mkdir -p certbot/www

# 5. Show warning about ORACLE_SEED
echo ""
echo -e "${RED}⚠️  ATENÇÃO: Você PRECISA editar o ORACLE_SEED!${NC}"
echo -e "${YELLOW}Execute: nano .env.oracle${NC}"
echo -e "${YELLOW}E altere a linha ORACLE_SEED para a frase secreta da carteira Oracle.${NC}"
echo ""

# 6. Ask to proceed
read -p "Já editou o ORACLE_SEED? (s/n): " confirm
if [ "$confirm" != "s" ]; then
    echo "Por favor, edite o .env.oracle primeiro."
    echo "Depois execute: docker compose up -d"
    exit 0
fi

# 7. Start services
echo -e "${YELLOW}Starting Docker services...${NC}"
docker compose down 2>/dev/null || true
docker compose up -d --build

# 8. Run Migrations
echo -e "${YELLOW}Running database migrations...${NC}"
# Wait for container to be ready specifically if needed, but 'up -d' return implies started.
# We might need a small sleep to ensure process is up.
sleep 5
docker compose exec -T don-fiapo-web npx prisma migrate deploy || echo -e "${RED}Migration failed! Check logs.${NC}"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}🎉 Deploy concluído!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Acesse: http://75.119.155.116"
echo ""
echo "Comandos úteis:"
echo "  docker compose logs -f        # Ver logs"
echo "  docker compose ps             # Ver status"
echo "  docker compose restart        # Reiniciar"
