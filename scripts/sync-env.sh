#!/bin/bash

# ==============================================================================
# Environment Sync Script for Don Fiapo Web Interface
# ==============================================================================
# Este script copia variáveis do .env raiz para don-fiapo-web/.env.local
# com os prefixos corretos para Next.js
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_ENV="$ROOT_DIR/.env"
WEB_ENV="$ROOT_DIR/don-fiapo-web/.env.local"

echo -e "${YELLOW}🔄 Sincronizando variáveis de ambiente para Next.js...${NC}"

# Verifica se .env existe
if [ ! -f "$ROOT_ENV" ]; then
    echo "❌ Arquivo .env não encontrado na raiz do projeto!"
    echo "   Copie .env.example para .env e configure as variáveis."
    exit 1
fi

# Cria .env.local com variáveis Next.js
cat > "$WEB_ENV" << 'EOF'
# ==============================================================================
# Don Fiapo Web Interface - Environment Variables
# ==============================================================================
# ATENÇÃO: Este arquivo é gerado automaticamente por scripts/sync-env.sh
# Não edite manualmente! Edite o .env raiz e execute o script.
# ==============================================================================

EOF

# Extrai e converte variáveis
echo -e "${YELLOW}📋 Processando variáveis...${NC}"

while IFS='=' read -r key value; do
    # Ignora comentários e linhas vazias
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Remove espaços
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    # Converte variáveis para formato Next.js
    case "$key" in
        LUNES_RPC_URL)
            echo "NEXT_PUBLIC_LUNES_RPC=${value}" >> "$WEB_ENV"
            ;;
        CONTRACT_ADDRESS)
            echo "NEXT_PUBLIC_CONTRACT_ADDRESS=${value}" >> "$WEB_ENV"
            ;;
        SOLANA_RPC_URL)
            echo "NEXT_PUBLIC_SOLANA_RPC=${value}" >> "$WEB_ENV"
            ;;
        USDT_RECEIVER_ADDRESS|USDC_RECEIVER_ADDRESS)
            echo "NEXT_PUBLIC_SOLANA_RECEIVER=${value}" >> "$WEB_ENV"
            ;;
        ORACLE_SERVICE_URL)
            echo "NEXT_PUBLIC_ORACLE_URL=${value}" >> "$WEB_ENV"
            ;;
        LUNES_MNEMONIC)
            # Esta variável NÃO deve ter prefixo NEXT_PUBLIC_ (privada)
            echo "LUNES_MNEMONIC=${value}" >> "$WEB_ENV"
            ;;
    esac
done < "$ROOT_ENV"

echo -e "${GREEN}✅ Variáveis sincronizadas com sucesso!${NC}"
echo -e "   Arquivo: $WEB_ENV"
