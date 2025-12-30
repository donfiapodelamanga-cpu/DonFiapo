#!/bin/bash

# =============================================================================
# Don Fiapo Contract Upgrade Script
# =============================================================================
# This script compiles the updated contract and prepares the upgrade
# 
# Prerequisites:
# - cargo contract installed
# - Polkadot.js CLI or subxt for contract interaction
# 
# Usage: ./scripts/upgrade_contract.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   Don Fiapo Contract Upgrade Tool   ${NC}"
echo -e "${BLUE}======================================${NC}"

# Configuration
CONTRACT_DIR="don_fiapo"
CURRENT_CONTRACT="5EDW1V9sPCkmFGLUJ3e4B31NrLsQhEb9BAprtpgUZcW6sBvr"
LUNES_RPC="wss://ws.lunes.io"

echo ""
echo -e "${YELLOW}Step 1: Compiling contract...${NC}"
cd $CONTRACT_DIR

# Clean previous build
cargo clean 2>/dev/null || true

# Build release version
echo "Building release version..."
cargo contract build --release

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Contract compiled successfully${NC}"
else
    echo -e "${RED}✗ Compilation failed${NC}"
    exit 1
fi

# Get the code hash
echo ""
echo -e "${YELLOW}Step 2: Extracting code hash...${NC}"

# The .wasm file is in target/ink/
WASM_PATH="target/ink/don_fiapo.wasm"
CONTRACT_PATH="target/ink/don_fiapo.contract"

if [ -f "$WASM_PATH" ]; then
    # Calculate hash using sha256
    CODE_HASH=$(sha256sum "$WASM_PATH" | awk '{print $1}')
    echo -e "${GREEN}✓ Code hash: 0x$CODE_HASH${NC}"
else
    echo -e "${RED}✗ WASM file not found at $WASM_PATH${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Upgrade Information${NC}"
echo "=============================================="
echo -e "Current Contract: ${BLUE}$CURRENT_CONTRACT${NC}"
echo -e "New Code Hash:    ${GREEN}0x$CODE_HASH${NC}"
echo -e "Network:          ${BLUE}$LUNES_RPC${NC}"
echo ""

echo -e "${YELLOW}Step 4: Upgrade Instructions${NC}"
echo "=============================================="
echo ""
echo "Option A: Using Polkadot.js Apps"
echo "--------------------------------"
echo "1. Go to https://polkadot.js.org/apps/?rpc=$LUNES_RPC"
echo "2. Navigate to Developer > Contracts"
echo "3. Click on contract: $CURRENT_CONTRACT"
echo "4. Call 'propose_upgrade' with:"
echo "   - new_code_hash: 0x$CODE_HASH"
echo "   - description: 'APY correction: 300% max for Don Burn'"
echo "   - version: '1.1.0'"
echo ""
echo "Option B: Using cargo-contract CLI"
echo "-----------------------------------"
echo "cargo contract call \\"
echo "  --contract $CURRENT_CONTRACT \\"
echo "  --message propose_upgrade \\"
echo "  --args '0x$CODE_HASH' 'APY correction update' '1.1.0' \\"
echo "  --suri '\$DEPLOYER_SEED' \\"
echo "  --url $LUNES_RPC"
echo ""

echo -e "${RED}IMPORTANT REMINDERS:${NC}"
echo "• Timelock: 7 days after proposal before execution"
echo "• After 7 days, call 'execute_upgrade' to apply"
echo "• Keep the .wasm and .contract files safe"
echo ""

# Save upgrade info
cd ..
UPGRADE_INFO="scripts/last_upgrade_$(date +%Y%m%d_%H%M%S).json"
cat > "$UPGRADE_INFO" << EOF
{
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "current_contract": "$CURRENT_CONTRACT",
  "new_code_hash": "0x$CODE_HASH",
  "version": "1.1.0",
  "description": "APY correction: 300% max for Don Burn, fixed NFT mining rates, updated token distribution",
  "changes": [
    "APY: Don Burn 10-300% (was incorrect in deployed version)",
    "APY: Don Lunes 6-37%",
    "APY: Don Fiapo 7-70%",
    "Token Distribution: 80% Staking, 7% Airdrop, 5% Marketing, 5% Charity, 2% IEO, 1% Team",
    "NFT Mining: 5/50/150/300/500/1200/2500 FIAPO per day"
  ],
  "timelock_expires": "$(date -u -d '+7 days' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -v+7d -u +%Y-%m-%dT%H:%M:%SZ)",
  "network": "Lunes Mainnet",
  "rpc": "$LUNES_RPC"
}
EOF

echo -e "${GREEN}✓ Upgrade info saved to: $UPGRADE_INFO${NC}"
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   Upgrade preparation complete!     ${NC}"
echo -e "${GREEN}======================================${NC}"
