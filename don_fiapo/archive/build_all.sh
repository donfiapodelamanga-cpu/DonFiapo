#!/bin/bash
set -e

echo "🚀 Starting sequential build process for Don Fiapo contracts..."

# Function to build a contract
build_contract() {
    local contract_dir=$1
    local name=$2
    
    echo "--------------------------------------------------"
    echo "📦 Building $name ($contract_dir)..."
    echo "--------------------------------------------------"
    
    cd "contracts/$contract_dir"
    
    # Check if cargo-contract is installed, otherwise use cargo check
    if command -v cargo-contract &> /dev/null; then
        cargo contract build --release
    else
        echo "⚠️ cargo-contract not found, running 'cargo check' instead..."
        cargo check --release
    fi
    
    cd ../..
    echo "✅ $name built successfully."
    echo ""
}

# 1. Build Traits (Dependency for all)
build_contract "traits" "Fiapo Traits"

# 2. Build Core (Dependency for many)
build_contract "core" "Fiapo Core"

# 3. Build other contracts
build_contract "ico" "Fiapo ICO"
build_contract "staking" "Fiapo Staking"
build_contract "governance" "Fiapo Governance"
build_contract "lottery" "Fiapo Lottery"
build_contract "airdrop" "Fiapo Airdrop"
build_contract "rewards" "Fiapo Rewards"
build_contract "marketplace" "Fiapo Marketplace"
build_contract "bridge" "Fiapo Bridge"
build_contract "affiliate" "Fiapo Affiliate"

# Check spin_game only if it has content
if [ -f "contracts/spin_game/Cargo.toml" ]; then
    build_contract "spin_game" "Spin Game"
fi

echo "🎉 All contracts built successfully!"
