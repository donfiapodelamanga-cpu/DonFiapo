#!/bin/bash

# ==============================================================================
# Environment Verification Script
# ==============================================================================
# Verifica se todas as variáveis necessárias estão presentes
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_ENV="$ROOT_DIR/.env"

echo -e "${YELLOW}🔍 Verificando configuração de ambiente...${NC}\n"

# Variáveis obrigatórias
REQUIRED_VARS=(
    "LUNES_RPC_URL"
    "CONTRACT_ADDRESS"
    "SOLANA_RPC_URL"
    "USDT_TOKEN_ADDRESS"
    "USDT_RECEIVER_ADDRESS"
    "DEPLOYER_SEED"
    "ORACLE_SEED"
    "TEAM_WALLET_LUNES"
)

# Verifica se .env existe
if [ ! -f "$ROOT_ENV" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado na raiz do projeto!${NC}"
    echo -e "   Copie .env.example para .env e configure as variáveis."
    exit 1
fi

# Load .env
export $(grep -v '^#' "$ROOT_ENV" | xargs)

# Verifica cada variável
MISSING_COUNT=0
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ $var${NC} não está definida"
        ((MISSING_COUNT++))
    else
        echo -e "${GREEN}✓ $var${NC} = ${!var:0:20}..."
    fi
done

echo ""

if [ $MISSING_COUNT -gt 0 ]; then
    echo -e "${RED}❌ $MISSING_COUNT variáveis faltando!${NC}"
    echo -e "   Configure o arquivo .env antes de continuar."
    exit 1
fi

echo -e "${GREEN}✅ Todas as variáveis obrigatórias estão configuradas!${NC}"

# Verifica gitignore
if grep -q "^\.env$" "$ROOT_DIR/.gitignore" 2>/dev/null; then
    echo -e "${GREEN}✅ .env está no .gitignore${NC}"
else
    echo -e "${YELLOW}⚠️  .env NÃO está no .gitignore!${NC}"
    echo -e "   Adicione para evitar commit acidental de seeds."
fi
