#!/bin/bash

# ==============================================================================
# Business Rules Test Script for Don Fiapo
# ==============================================================================
# Testa regras de negócio críticas antes do deploy em mainnet
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
echo -e "${BLUE}║      Don Fiapo - Business Rules Verification          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load .env
if [ ! -f "$ROOT_ENV" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    exit 1
fi

export $(grep -v '^#' "$ROOT_ENV" | xargs)

# Verificar se é testnet
if [[ "$LUNES_RPC_URL" == *"test"* ]]; then
    echo -e "${GREEN}✅ Rodando no TESTNET${NC}"
else
    echo -e "${YELLOW}⚠️  Rodando no MAINNET - Confirme se é intencional${NC}"
    read -p "Continuar? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}1. Verificando NFT Configurations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Verificar número de tiers
NFT_TIERS=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message get_nft_types_count \
    --url "$LUNES_RPC_URL" \
    --dry-run 2>&1 | grep -oP 'Ok\(\K[0-9]+' || echo "0")

if [ "$NFT_TIERS" == "7" ]; then
    echo -e "${GREEN}✅ NFT Tiers: 7 (correto)${NC}"
else
    echo -e "${RED}❌ NFT Tiers: $NFT_TIERS (esperado: 7)${NC}"
fi

# Verificar cada tier
for i in {0..6}; do
    echo -e "\n${YELLOW}   NFT Tier $i:${NC}"
    
    CONFIG=$(cargo contract call \
        --contract "$CONTRACT_ADDRESS" \
        --message get_nft_config \
        --args $i \
        --url "$LUNES_RPC_URL" \
        --dry-run 2>&1)
    
    # Extrair informações básicas
    PRICE=$(echo "$CONFIG" | grep -oP 'price_usdt_cents:\s*\K[0-9]+' || echo "?")
    MAX_SUPPLY=$(echo "$CONFIG" | grep -oP 'max_supply:\s*\K[0-9]+' || echo "?")
    
    echo -e "   Price: ${GREEN}$PRICE cents${NC}, Max Supply: ${GREEN}$MAX_SUPPLY${NC}"
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}2. Verificando ICO Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ICO_ACTIVE=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message is_ico_active \
    --url "$LUNES_RPC_URL" \
    --dry-run 2>&1 | grep -oP 'Ok\(\K(true|false)')

if [ "$ICO_ACTIVE" == "true" ]; then
    echo -e "${GREEN}✅ ICO Ativo: TRUE${NC}"
else
    echo -e "${RED}❌ ICO Ativo: FALSE${NC}"
    echo -e "${YELLOW}   Execute: cargo contract call --message set_ico_active --args true${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}3. Verificando Pause Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

IS_PAUSED=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message is_paused \
    --url "$LUNES_RPC_URL" \
    --dry-run 2>&1 | grep -oP 'Ok\(\K(true|false)')

if [ "$IS_PAUSED" == "false" ]; then
    echo -e "${GREEN}✅ Contrato: NÃO pausado (operacional)${NC}"
else
    echo -e "${RED}❌ Contrato: PAUSADO${NC}"
    echo -e "${YELLOW}   Execute: cargo contract call --message unpause_owner${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}4. Verificando Total Supply${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TOTAL_SUPPLY=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message total_supply \
    --url "$LUNES_RPC_URL" \
    --dry-run 2>&1 | grep -oP 'Ok\(\K[0-9]+' || echo "0")

EXPECTED_SUPPLY="30000000000000000000"  # 300B com 8 decimais

if [ "$TOTAL_SUPPLY" == "$EXPECTED_SUPPLY" ]; then
    echo -e "${GREEN}✅ Total Supply: 300.000.000.000 FIAPO${NC}"
else
    FORMATTED=$(python3 -c "print(f'{$TOTAL_SUPPLY / 10**8:,.0f}')")
    echo -e "${YELLOW}⚠️  Total Supply: $FORMATTED FIAPO${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}5. Verificando System Wallets${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

WALLETS=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message get_system_wallets \
    --url "$LUNES_RPC_URL" \
    --dry-run 2>&1)

echo "$WALLETS" | grep -q "team_wallet" && echo -e "${GREEN}✅ Team Wallet configurado${NC}" || echo -e "${RED}❌ Team Wallet ausente${NC}"
echo "$WALLETS" | grep -q "burn_wallet" && echo -e "${GREEN}✅ Burn Wallet configurado${NC}" || echo -e "${RED}❌ Burn Wallet ausente${NC}"
echo "$WALLETS" | grep -q "staking_wallet" && echo -e "${GREEN}✅ Staking Wallet configurado${NC}" || echo -e "${RED}❌ Staking Wallet ausente${NC}"
echo "$WALLETS" | grep -q "rewards_wallet" && echo -e "${GREEN}✅ Rewards Wallet configurado${NC}" || echo -e "${RED}❌ Rewards Wallet ausente${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}6. Verificando Total de NFTs Alocados${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TOTAL_TOKENS=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message get_total_ico_allocation \
    --url "$LUNES_RPC_URL" \
    --dry-run 2>&1 | grep -oP 'Ok\(\K[0-9]+' || echo "0")

if [ "$TOTAL_TOKENS" != "0" ]; then
    FORMATTED=$(python3 -c "print(f'{$TOTAL_TOKENS / 10**8:,.0f}')")
    echo -e "${GREEN}✅ Total ICO Allocation: $FORMATTED FIAPO${NC}"
    
    # Esperado: 4.317.600.000
    EXPECTED_ICO="431760000000000000"
    if [ "$TOTAL_TOKENS" == "$EXPECTED_ICO" ]; then
        echo -e "${GREEN}✅ Valor corresponde ao esperado (4.317.600.000)${NC}"
    fi
else
    echo -e "${RED}❌ Não foi possível calcular total ICO${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Verificação de Regras Concluída              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Próximo passo: bash scripts/test_nft_minting.sh${NC}"
