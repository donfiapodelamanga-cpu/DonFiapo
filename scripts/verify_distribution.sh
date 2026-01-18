#!/bin/bash

# ==============================================================================
# Distribution Verification Script for Don Fiapo
# ==============================================================================
# Verifica se a distribuição de tokens foi executada corretamente
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
echo -e "${BLUE}║       Don Fiapo - Verificação de Distribuição         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load .env
if [ ! -f "$ROOT_ENV" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    exit 1
fi

export $(grep -v '^#' "$ROOT_ENV" | xargs)

# Função para buscar balance
get_balance() {
    local ADDRESS=$1
    local RESULT=$(cargo contract call \
        --contract "$CONTRACT_ADDRESS" \
        --message balance_of \
        --args "$ADDRESS" \
        --url "$LUNES_RPC_URL" \
        --dry-run 2>&1)
    
    # Extrair o valor numérico
    echo "$RESULT" | grep -oP 'Ok\(\K[0-9]+' || echo "0"
}

# Função para formatar número
format_number() {
    local NUM=$1
    # Dividir por 10^8 para converter de unidades mínimas
    python3 -c "print(f'{$NUM / 10**8:,.0f}')"
}

echo -e "${YELLOW}📊 Verificando balanços...${NC}\n"

# Valores esperados
declare -A EXPECTED
EXPECTED["TEAM"]="300000000000000000"       # 3B
EXPECTED["MARKETING"]="1500000000000000000" # 15B
EXPECTED["CHARITY"]="1500000000000000000"   # 15B

# Verificar cada carteira
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Carteiras Externas:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

verify_wallet() {
    local NAME=$1
    local ADDRESS_VAR=$2
    local EXPECTED_AMOUNT=$3
    
    local ADDRESS="${!ADDRESS_VAR}"
    
    if [ -z "$ADDRESS" ]; then
        echo -e "${YELLOW}⚠️  $NAME: Endereço não configurado${NC}"
        return
    fi
    
    local BALANCE=$(get_balance "$ADDRESS")
    local FORMATTED=$(format_number "$BALANCE")
    
    if [ "$BALANCE" == "$EXPECTED_AMOUNT" ]; then
        echo -e "${GREEN}✅ $NAME: $FORMATTED FIAPO${NC}"
    elif [ "$BALANCE" == "0" ]; then
        echo -e "${RED}❌ $NAME: $FORMATTED FIAPO (esperado: $(format_number $EXPECTED_AMOUNT))${NC}"
    else
        echo -e "${YELLOW}⚠️  $NAME: $FORMATTED FIAPO (esperado: $(format_number $EXPECTED_AMOUNT))${NC}"
    fi
}

verify_wallet "Team     " "TEAM_WALLET_ADDRESS" "${EXPECTED[TEAM]}"
verify_wallet "Marketing" "MARKETING_WALLET_ADDRESS" "${EXPECTED[MARKETING]}"
verify_wallet "Charity  " "CHARITY_WALLET_ADDRESS" "${EXPECTED[CHARITY]}"

if [ -n "$TREASURY_WALLET_ADDRESS" ]; then
    verify_wallet "Treasury " "TREASURY_WALLET_ADDRESS" "1200000000000000000"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Contrato:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CONTRACT_BALANCE=$(get_balance "$CONTRACT_ADDRESS")
CONTRACT_FORMATTED=$(format_number "$CONTRACT_BALANCE")
echo -e "Balance do Contrato: ${GREEN}$CONTRACT_FORMATTED FIAPO${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Deployer:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Derivar endereço do deployer da seed
DEPLOYER_ADDRESS=$(subkey inspect "$DEPLOYER_SEED" --network substrate 2>/dev/null | grep "SS58 Address" | awk '{print $4}')
DEPLOYER_BALANCE=$(get_balance "$DEPLOYER_ADDRESS")
DEPLOYER_FORMATTED=$(format_number "$DEPLOYER_BALANCE")
echo -e "Deployer Balance:    ${YELLOW}$DEPLOYER_FORMATTED FIAPO${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Total Supply Check:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TOTAL_SUPPLY_RAW=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message total_supply \
    --url "$LUNES_RPC_URL" \
    --dry-run 2>&1 | grep -oP 'Ok\(\K[0-9]+' || echo "0")

TOTAL_SUPPLY=$(format_number "$TOTAL_SUPPLY_RAW")
echo -e "Total Supply:        ${GREEN}$TOTAL_SUPPLY FIAPO${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Verificação Concluída                        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
