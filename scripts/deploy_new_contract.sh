#!/bin/bash

# =============================================================================
# Don Fiapo Contract Deploy Script
# =============================================================================
# This script deploys a fresh contract to Lunes mainnet
# 
# Prerequisites:
# - cargo contract installed
# - DEPLOYER_SEED set in environment or .env
# 
# Usage: ./scripts/deploy_new_contract.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   Don Fiapo Fresh Deploy Script     ${NC}"
echo -e "${BLUE}======================================${NC}"

# Load environment - use set -a to export all variables  
if [ -f "oracle-service/.env" ]; then
    # Read .env line by line, ignoring comments and empty lines
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        # Export the variable
        export "$line" 2>/dev/null || true
    done < "oracle-service/.env"
    echo -e "${GREEN}✓ Loaded environment from oracle-service/.env${NC}"
fi

# Configuration
CONTRACT_DIR="don_fiapo"
LUNES_RPC="${LUNES_RPC_URL:-wss://ws.lunes.io}"
TEAM_WALLET="${TEAM_WALLET_LUNES}"

# Verify seeds are available
if [ -z "$DEPLOYER_SEED" ]; then
    echo -e "${RED}✗ DEPLOYER_SEED not found in environment${NC}"
    echo "Please set DEPLOYER_SEED or add it to oracle-service/.env"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Checking contract artifacts...${NC}"

WASM_PATH="$CONTRACT_DIR/target/ink/don_fiapo_contract.wasm"
CONTRACT_PATH="$CONTRACT_DIR/target/ink/don_fiapo_contract.contract"

if [ ! -f "$CONTRACT_PATH" ]; then
    echo -e "${YELLOW}Contract not built. Building now...${NC}"
    cd $CONTRACT_DIR
    cargo contract build --release
    cd ..
fi

if [ -f "$CONTRACT_PATH" ]; then
    echo -e "${GREEN}✓ Contract artifacts found${NC}"
    ls -lh $CONTRACT_DIR/target/ink/don_fiapo_contract.*
else
    echo -e "${RED}✗ Contract artifacts not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Deploy Configuration${NC}"
echo "=============================================="
echo -e "Network:        ${BLUE}$LUNES_RPC${NC}"
echo -e "Team Wallet:    ${BLUE}$TEAM_WALLET${NC}"
echo -e "Contract File:  ${BLUE}$CONTRACT_PATH${NC}"
echo ""

echo -e "${YELLOW}Step 3: Ready to Deploy${NC}"
echo "=============================================="
echo ""
echo -e "${RED}⚠️  WARNING: This will deploy a NEW contract!${NC}"
echo ""

read -p "Do you want to proceed with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 4: Uploading contract code...${NC}"

cd $CONTRACT_DIR

# Upload the contract code
UPLOAD_RESULT=$(cargo contract upload \
    --url "$LUNES_RPC" \
    --suri "$DEPLOYER_SEED" \
    --skip-confirm \
    target/ink/don_fiapo_contract.contract 2>&1)

echo "$UPLOAD_RESULT"

# Extract code hash from output
CODE_HASH=$(echo "$UPLOAD_RESULT" | grep -oP 'Code hash: \K[0-9a-fA-Fx]+' || echo "")

if [ -z "$CODE_HASH" ]; then
    echo -e "${YELLOW}Code might already be uploaded. Proceeding with instantiation...${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Instantiating contract...${NC}"

# Instantiate the contract
# The 'new' constructor takes admin account as argument
INSTANTIATE_RESULT=$(cargo contract instantiate \
    --url "$LUNES_RPC" \
    --suri "$DEPLOYER_SEED" \
    --constructor new \
    --args "$TEAM_WALLET" \
    --skip-confirm \
    target/ink/don_fiapo_contract.contract 2>&1)

echo "$INSTANTIATE_RESULT"

# Extract new contract address
NEW_CONTRACT=$(echo "$INSTANTIATE_RESULT" | grep -oP 'Contract: \K[0-9a-zA-Z]+' || echo "")

if [ -n "$NEW_CONTRACT" ]; then
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}   Deploy Successful!                 ${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    echo -e "New Contract Address: ${GREEN}$NEW_CONTRACT${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Update oracle-service/.env:"
    echo "   CONTRACT_ADDRESS=$NEW_CONTRACT"
    echo ""
    echo "2. Restart oracle service:"
    echo "   cd oracle-service && npm run start"
    echo ""
    echo "3. Test all contract functions"
    
    # Save deployment info
    cd ..
    cat > "scripts/last_deploy_$(date +%Y%m%d_%H%M%S).json" << EOF
{
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contract_address": "$NEW_CONTRACT",
  "code_hash": "$CODE_HASH",
  "network": "Lunes Mainnet",
  "rpc": "$LUNES_RPC",
  "admin": "$TEAM_WALLET",
  "version": "1.1.0 - APY corrected"
}
EOF
    echo -e "${GREEN}✓ Deployment info saved${NC}"
else
    echo -e "${RED}Could not extract contract address from output${NC}"
    echo "Please check the output above for errors"
fi
