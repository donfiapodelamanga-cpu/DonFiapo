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
if [ ! -f .env.web ] || [ ! -f .env.admin ] || [ ! -f .env.oracle ]; then
    echo -e "${YELLOW}Creating template .env files...${NC}"

    API_KEY=""
    if [ -f .env.oracle ]; then
        API_KEY=$(sed -n 's/^ORACLE_API_KEY=//p' .env.oracle | head -n 1)
    fi
    if [ -z "$API_KEY" ]; then
        API_KEY=$(openssl rand -hex 32)
    fi

    ADMIN_API_KEY=""
    if [ -f .env.admin ]; then
        ADMIN_API_KEY=$(sed -n 's/^ADMIN_API_KEY=//p' .env.admin | head -n 1)
    fi
    if [ -z "$ADMIN_API_KEY" ]; then
        ADMIN_API_KEY=$(openssl rand -hex 32)
    fi

    # Web .env template
    if [ ! -f .env.web ]; then
        echo "NEXT_PUBLIC_APP_URL=https://donfiapo.fun" > .env.web
        echo "NEXT_PUBLIC_ADMIN_URL=https://admin.donfiapo.fun" >> .env.web
        echo "ADMIN_URL=https://admin.donfiapo.fun" >> .env.web
        echo "NEXT_PUBLIC_ORACLE_URL=/api/oracle" >> .env.web
        echo "ORACLE_SERVICE_URL=http://don-fiapo-oracle:3001" >> .env.web
        echo "ORACLE_API_KEY=${API_KEY}" >> .env.web
        echo "ADMIN_API_KEY=${ADMIN_API_KEY}" >> .env.web
        echo "NEXT_PUBLIC_LUNES_RPC=wss://ws.lunes.io,wss://ws-lunes-main-02.lunes.io" >> .env.web
        echo "NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address_here" >> .env.web
        echo "NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com" >> .env.web
        echo "NEXT_PUBLIC_SOLANA_RECEIVER=your_solana_receiver_wallet" >> .env.web
        echo "DATABASE_URL=file:/app/db/dev.db" >> .env.web
        echo "TWITTER_CALLBACK_URL=https://donfiapo.fun/api/auth/twitter/callback" >> .env.web
        echo "TWITTER_CLIENT_ID=" >> .env.web
        echo "TWITTER_CLIENT_SECRET=" >> .env.web
        echo -e "${GREEN}Created .env.web. Please edit it with real values.${NC}"
    fi

    # Admin .env template
    if [ ! -f .env.admin ]; then
        echo "DATABASE_URL=file:/app/db/dev.db" > .env.admin
        echo "ADMIN_SESSION_SECRET=$(openssl rand -hex 32)" >> .env.admin
        echo "ADMIN_EMAIL=admin@donfiapo.fun" >> .env.admin
        echo "ADMIN_PASSWORD=change-this-admin-password" >> .env.admin
        echo "WEB_API_URL=http://don-fiapo-web:3000" >> .env.admin
        echo "ADMIN_API_KEY=${ADMIN_API_KEY}" >> .env.admin
        echo "NEXT_PUBLIC_WEB_URL=https://donfiapo.fun" >> .env.admin
        echo "LUNES_RPC_URL=wss://ws.lunes.io,wss://ws-lunes-main-02.lunes.io" >> .env.admin
        echo "SOLANA_RPC_URL=https://api.mainnet-beta.solana.com" >> .env.admin
        echo "SOLANA_RECEIVER_WALLET=your_solana_receiver_wallet" >> .env.admin
        echo "SOLANA_USDT_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" >> .env.admin
        echo "SOLANA_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" >> .env.admin
        echo -e "${GREEN}Created .env.admin. Please edit it with real values.${NC}"
    fi

    # Oracle .env template
    if [ ! -f .env.oracle ]; then
        echo "SOLANA_RPC_URL=https://api.mainnet-beta.solana.com" > .env.oracle
        echo "USDT_RECEIVER_ADDRESS=your_solana_receiver_wallet" >> .env.oracle
        echo "LUNES_RPC_URL=wss://lunes-node-1,wss://lunes-node-2" >> .env.oracle
        echo "CONTRACT_ADDRESS=your_contract_address_here" >> .env.oracle
        echo "ORACLE_SEED=your_secure_seed_phrase" >> .env.oracle
        echo "ORACLE_API_KEY=${API_KEY}" >> .env.oracle
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
echo "1. Edit .env.web, .env.admin and .env.oracle with production values."
echo "2. Run: docker compose up -d"
echo "3. Issue SSL Certificate (run only once):"
echo "   docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d donfiapo.fun -d www.donfiapo.fun -d admin.donfiapo.fun"
echo "4. Restart Nginx to load certificate:"
echo "   docker compose restart nginx"
echo "-----------------------------------"
