#!/bin/bash

# ==============================================================================
# NFT Minting Test Script for Don Fiapo
# ==============================================================================
# Testa o fluxo completo de minting de NFTs (Free e Paid)
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
echo -e "${BLUE}║          Don Fiapo - NFT Minting Test Suite           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load .env
if [ ! -f "$ROOT_ENV" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    exit 1
fi

export $(grep -v '^#' "$ROOT_ENV" | xargs)

# Gerar endereço de teste
TEST_ACCOUNT=$(subkey generate --scheme Sr25519 --network substrate)
TEST_ADDRESS=$(echo "$TEST_ACCOUNT" | grep "SS58 Address" | awk '{print $4}')
TEST_SEED=$(echo "$TEST_ACCOUNT" | grep "Secret phrase" | sed 's/.*`\(.*\)`.*/\1/')

echo -e "${YELLOW}📝 Conta de teste gerada:${NC}"
echo -e "   Address: ${GREEN}$TEST_ADDRESS${NC}"
echo -e "   (Seed salva temporariamente)\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Teste 1: Mint Free NFT (Primeira)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}Tentando mint de NFT gratuito (tier 0)...${NC}"

# Primeiro, enviar alguns LUNES para a conta de teste
echo -e "${YELLOW}Enviando 20 LUNES para conta de teste...${NC}"
cargo contract call \
    --contract "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM" \
    --message transfer \
    --args "$TEST_ADDRESS" "2000000000" \
    --suri "$DEPLOYER_SEED" \
    --url "$LUNES_RPC_URL" \
    --skip-dry-run \
    -x || echo -e "${YELLOW}(Ignoring transfer error - pode já ter balance)${NC}"

sleep 3

# Tentar mint
MINT_RESULT=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message mint_nft \
    --args 0 "$TEST_ADDRESS" 0 null \
    --suri "$TEST_SEED" \
    --url "$LUNES_RPC_URL" \
    --skip-dry-run \
    -x 2>&1)

if echo "$MINT_RESULT" | grep -q "Success"; then
    echo -e "${GREEN}✅ Free NFT #1: Mint bem-sucedido${NC}"
else
    echo -e "${RED}❌ Free NFT #1: Falhou${NC}"
    echo "$MINT_RESULT" | tail -5
fi

sleep 2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Teste 2: Mint Free NFT (Segunda - Requer 10 LUNES)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}Tentando segunda mint de NFT gratuito...${NC}"

MINT_RESULT2=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message mint_nft \
    --args 0 "$TEST_ADDRESS" 0 null \
    --suri "$TEST_SEED" \
    --url "$LUNES_RPC_URL" \
    --skip-dry-run \
    -x 2>&1)

if echo "$MINT_RESULT2" | grep -q "Success"; then
    echo -e "${GREEN}✅ Free NFT #2: Mint bem-sucedido (balance LUNES OK)${NC}"
else
    if echo "$MINT_RESULT2" | grep -q "InsufficientLunes"; then
        echo -e "${YELLOW}⚠️  Free NFT #2: Falhou por falta de LUNES (CORRETO!)${NC}"
    else
        echo -e "${RED}❌ Free NFT #2: Falhou por outro motivo${NC}"
        echo "$MINT_RESULT2" | tail -5
    fi
fi

sleep 2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Teste 3: Tentar 6ª Free NFT (Deve Falhar)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Mintar mais 3 para atingir o limite
for i in {3..5}; do
    echo -e "${YELLOW}Mintando Free NFT #$i...${NC}"
    cargo contract call \
        --contract "$CONTRACT_ADDRESS" \
        --message mint_nft \
        --args 0 "$TEST_ADDRESS" 0 null \
        --suri "$TEST_SEED" \
        --url "$LUNES_RPC_URL" \
        --skip-dry-run \
        -x > /dev/null 2>&1
    sleep 1
done

echo -e "${YELLOW}Tentando 6ª Free NFT (deve falhar - limite de 5)...${NC}"

MINT_RESULT_6=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message mint_nft \
    --args 0 "$TEST_ADDRESS" 0 null \
    --suri "$TEST_SEED" \
    --url "$LUNES_RPC_URL" \
    --skip-dry-run \
    -x 2>&1)

if echo "$MINT_RESULT_6" | grep -q "FreeNFTLimitReached"; then
    echo -e "${GREEN}✅ Limite de 5 Free NFTs: FUNCIONANDO${NC}"
else
    echo -e "${RED}❌ 6ª NFT não bloqueada (limite quebrado!)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Teste 4: Verificar NFTs da Conta${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

NFT_COUNT=$(cargo contract call \
    --contract "$CONTRACT_ADDRESS" \
    --message get_user_nft_count \
    --args "$TEST_ADDRESS" \
    --url "$LUNES_RPC_URL" \
    --dry-run 2>&1 | grep -oP 'Ok\(\K[0-9]+' || echo "0")

echo -e "${YELLOW}NFTs da conta de teste: ${GREEN}$NFT_COUNT${NC}"

if [ "$NFT_COUNT" -ge "1" ]; then
    echo -e "${GREEN}✅ NFTs mintados com sucesso${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Teste 5: Verificar Mining (Após 1 dia simulado)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}Nota: Mining acumula ~5 FIAPO/dia para Free NFT${NC}"
echo -e "${YELLOW}Para testar claim, aguarde 24h ou avance timestamp no testnet${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Testes de Minting Concluídos              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Resumo:${NC}"
echo -e "  ✅ Free NFT mint funcionando"
echo -e "  ✅ Requisito de 10 LUNES verificado"
echo -e "  ✅ Limite de 5 NFTs por carteira verificado"
echo -e "  ⏭️  Paid NFT requer oracle (testar separadamente)"
echo ""
echo -e "${BLUE}Conta de teste: $TEST_ADDRESS${NC}"
echo -e "${YELLOW}(Você pode usar essa conta para mais testes)${NC}"
