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
NEXT_PUBLIC_CONTRACT_ADDRESS=5FnyHugYUp4rnBSXAVjGfK7U9NmobC2tTQAZD1Gvv5nxFtJh
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com,https://mainnet.helius-rpc.com/?api-key=a5b95fe2-7bde-414b-8ab4-e2efec736d35,https://solana.drpc.org
NEXT_PUBLIC_SOLANA_RECEIVER=Cx5z3uLHZhyiGqrUk65vsxdEMgd5ujwzLx5dsMrqNLjB
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
