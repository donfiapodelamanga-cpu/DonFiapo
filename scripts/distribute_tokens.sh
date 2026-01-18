#!/bin/bash

# ==============================================================================
# Token Distribution Script for Don Fiapo
# ==============================================================================
# Distribui tokens do Deployer para Team, Marketing, Charity e Treasury
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_ENV="$ROOT_DIR/.env"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Don Fiapo - Distribuição de Tokens Inicial       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load .env
if [ ! -f "$ROOT_ENV" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    exit 1
fi

export $(grep -v '^#' "$ROOT_ENV" | xargs)

# Verificar variáveis necessárias
REQUIRED_VARS=(
    "CONTRACT_ADDRESS"
    "DEPLOYER_SEED"
    "LUNES_RPC_URL"
    "TEAM_WALLET_ADDRESS"
    "MARKETING_WALLET_ADDRESS"
    "CHARITY_WALLET_ADDRESS"
)

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo -e "${RED}❌ Variável $VAR não definida no .env${NC}"
        exit 1
    fi
done

# Valores de distribuição (com 8 decimais)
TEAM_AMOUNT="300000000000000000"          # 3.000.000.000 (3B)
MARKETING_AMOUNT="1500000000000000000"    # 15.000.000.000 (15B)
CHARITY_AMOUNT="1500000000000000000"      # 15.000.000.000 (15B)

# Se TREASURY_WALLET_ADDRESS estiver definido
if [ -n "$TREASURY_WALLET_ADDRESS" ]; then
    TREASURY_AMOUNT="1200000000000000000"  # 12.000.000.000 (12B)
fi

echo -e "${YELLOW}📊 Plano de Distribuição:${NC}"
echo -e "   Team:      ${GREEN}3.000.000.000 FIAPO${NC} → $TEAM_WALLET_ADDRESS"
echo -e "   Marketing: ${GREEN}15.000.000.000 FIAPO${NC} → $MARKETING_WALLET_ADDRESS"
echo -e "   Charity:   ${GREEN}15.000.000.000 FIAPO${NC} → $CHARITY_WALLET_ADDRESS"
if [ -n "$TREASURY_WALLET_ADDRESS" ]; then
    echo -e "   Treasury:  ${GREEN}12.000.000.000 FIAPO${NC} → $TREASURY_WALLET_ADDRESS"
fi
echo ""

# Confirmação
read -p "Confirmar distribuição? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Distribuição cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Iniciando distribuição...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Função para transferir tokens
transfer_tokens() {
    local WALLET_NAME=$1
    local WALLET_ADDRESS=$2
    local AMOUNT=$3
    
    echo -e "${YELLOW}📤 Transferindo para $WALLET_NAME...${NC}"
    
    cargo contract call \
        --contract "$CONTRACT_ADDRESS" \
        --message transfer \
        --args "$WALLET_ADDRESS" "$AMOUNT" \
        --suri "$DEPLOYER_SEED" \
        --url "$LUNES_RPC_URL" \
        --skip-dry-run \
        -x
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $WALLET_NAME: Transferência concluída${NC}\n"
    else
        echo -e "${RED}❌ $WALLET_NAME: Transferência falhou${NC}\n"
        exit 1
    fi
}

# Executar transferências
transfer_tokens "TEAM" "$TEAM_WALLET_ADDRESS" "$TEAM_AMOUNT"
transfer_tokens "MARKETING" "$MARKETING_WALLET_ADDRESS" "$MARKETING_AMOUNT"
transfer_tokens "CHARITY" "$CHARITY_WALLET_ADDRESS" "$CHARITY_AMOUNT"

if [ -n "$TREASURY_WALLET_ADDRESS" ]; then
    transfer_tokens "TREASURY" "$TREASURY_WALLET_ADDRESS" "$TREASURY_AMOUNT"
fi

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Distribuição Concluída com Sucesso!         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Próximo passo: bash scripts/verify_distribution.sh${NC}"
