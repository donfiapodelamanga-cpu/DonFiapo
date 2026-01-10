#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting Production Setup for Don Fiapo...${NC}"

# 1. Install Docker & Docker Compose if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please log out and back in to use docker without sudo."
fi

# 2. Check for .env files
if [ ! -f .env.web ] || [ ! -f .env.oracle ]; then
    echo -e "${YELLOW}Creating template .env files...${NC}"
    
    # Web .env template
    if [ ! -f .env.web ]; then
        echo "NEXT_PUBLIC_ORACLE_URL=https://donfiapo.com/api/oracle" > .env.web
        echo "NEXT_PUBLIC_LUNES_RPC=https://lunes-rpc.mainnet.address" >> .env.web
        echo "NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address_here" >> .env.web
        echo "NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com" >> .env.web
        echo "NEXT_PUBLIC_SOLANA_RECEIVER=your_solana_receiver_wallet" >> .env.web
        echo -e "${GREEN}Created .env.web. Please edit it with real values.${NC}"
    fi

    # Oracle .env template
    if [ ! -f .env.oracle ]; then
        echo "SOLANA_RPC_URL=https://api.mainnet-beta.solana.com" > .env.oracle
        echo "USDT_RECEIVER_ADDRESS=your_solana_receiver_wallet" >> .env.oracle
        echo "LUNES_RPC_URL=wss://lunes-node-1,wss://lunes-node-2" >> .env.oracle
        echo "CONTRACT_ADDRESS=your_contract_address_here" >> .env.oracle
        echo "ORACLE_SEED=your_secure_seed_phrase" >> .env.oracle
        echo "ORACLE_API_KEY=$(openssl rand -hex 32)" >> .env.oracle
        echo "MIN_CONFIRMATIONS=12" >> .env.oracle
        echo "PORT=3001" >> .env.oracle
        echo "ENABLE_MOCK_PAYMENTS=false" >> .env.oracle
        echo -e "${GREEN}Created .env.oracle. Please edit it with real values.${NC}"
    fi
fi

# 3. Create necessary directories
mkdir -p certbot/conf
mkdir -p certbot/www

# 4. Instructions
echo -e "${GREEN}Setup prepared!${NC}"
echo "-----------------------------------"
echo "Next Steps:"
echo "1. Edit .env.web and .env.oracle with production values."
echo "2. Run: docker compose up -d"
echo "3. Issue SSL Certificate (run only once):"
echo "   docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d donfiapo.com -d www.donfiapo.com"
echo "4. Restart Nginx to load certificate:"
echo "   docker compose restart nginx"
echo "-----------------------------------"
