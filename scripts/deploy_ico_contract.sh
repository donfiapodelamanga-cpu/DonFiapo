#!/bin/bash
set -e

# Configuration
LUNES_RPC="ws://127.0.0.1:9944"
# Contracts directory relative to where script is run (assuming run from project root)
CONTRACT_DIR="don_fiapo/contracts/ico"
# Output paths
CONTRACT_PATH="don_fiapo/target/ink/fiapo_ico/fiapo_ico.contract"

# Secrets - Using the one from .env logic or hardcoded for local dev as found in .env
DEPLOYER_SEED="cupboard pink element depend foil program toe salt wagon fuel spider settle"

# Core Contract Address (Must match the deployed Token contract)
# Extracted from .env: NEXT_PUBLIC_CORE_CONTRACT
CORE_CONTRACT="5FJC4DtYiu6rPo9qvSdUJrybe26exSGhPoRvx1fB5QPBwdVS"

echo "Deploying ICO Contract..."
echo "RPC: $LUNES_RPC"
echo "Core Contract: $CORE_CONTRACT"
echo "Artifact: $CONTRACT_PATH"

if [ ! -f "$CONTRACT_PATH" ]; then
    echo "Error: Contract artifact not found at $CONTRACT_PATH"
    echo "Please run 'cargo contract build --release' in $CONTRACT_DIR first."
    exit 1
fi

# Instantiate
echo "Instantiating..."
INSTANTIATE_RESULT=$(cargo contract instantiate \
    --url "$LUNES_RPC" \
    --suri "$DEPLOYER_SEED" \
    --constructor new \
    --args "$CORE_CONTRACT" \
    --skip-confirm \
    --execute \
    "$CONTRACT_PATH" 2>&1)

echo "$INSTANTIATE_RESULT"

# Extract address
NEW_CONTRACT=$(echo "$INSTANTIATE_RESULT" | grep -oP 'Contract: \K[0-9a-zA-Z]+' || echo "")

if [ -n "$NEW_CONTRACT" ]; then
    echo ""
    echo "Success! New ICO Contract Address: $NEW_CONTRACT"
    
    # Update .env (optional, but good)
    # This is a bit risky to automate with sed if file format varies, so just printing it for now
    echo "Please update .env NEXT_PUBLIC_ICO_CONTRACT with this new address."
else
    echo "Error: Could not extract new contract address."
    exit 1
fi
