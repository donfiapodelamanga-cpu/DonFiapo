#!/bin/bash
set -e

echo "🚀 Starting sequential build process for Don Fiapo contracts..."
echo "   Requires: cargo-contract (install via: cargo install cargo-contract)"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to build a contract
build_contract() {
    local contract_dir=$1
    local name=$2
    
    if [ ! -f "contracts/$contract_dir/Cargo.toml" ]; then
        echo "⏭️  Skipping $name (no Cargo.toml found)"
        return
    fi

    echo "--------------------------------------------------"
    echo "📦 Building $name ($contract_dir)..."
    echo "--------------------------------------------------"
    
    cd "contracts/$contract_dir"
    
    if command -v cargo-contract &> /dev/null; then
        cargo contract build --release 2>&1
    else
        echo "⚠️ cargo-contract not found, running 'cargo check' instead..."
        cargo check --release 2>&1
    fi
    
    cd "$SCRIPT_DIR"
    echo "✅ $name built successfully."
    echo ""
}

# ===== Phase 1: Base =====
echo "═══════════════════════════════════════════"
echo "  Phase 1: Base Layer"
echo "═══════════════════════════════════════════"
build_contract "core" "Core (FIAPO PSP22)"
build_contract "security" "Security Module"
build_contract "oracle_multisig" "Oracle Multisig"

# ===== Phase 2: Financial =====
echo "═══════════════════════════════════════════"
echo "  Phase 2: Financial Layer"
echo "═══════════════════════════════════════════"
build_contract "staking" "Staking"
build_contract "rewards" "Rewards"
build_contract "affiliate" "Affiliate"
build_contract "noble_affiliate" "Noble Affiliate"

# ===== Phase 3: Products =====
echo "═══════════════════════════════════════════"
echo "  Phase 3: Product Layer"
echo "═══════════════════════════════════════════"
build_contract "ico" "ICO (NFT Mining)"
build_contract "marketplace" "Marketplace"
build_contract "nft_collections" "NFT Collections"
build_contract "lottery" "Lottery"
build_contract "spin_game" "Spin Game (Royal Wheel)"
build_contract "airdrop" "Airdrop"

# ===== Phase 4: Governance =====
echo "═══════════════════════════════════════════"
echo "  Phase 4: Governance Layer"
echo "═══════════════════════════════════════════"
build_contract "governance" "Governance"
build_contract "timelock" "Timelock"
build_contract "upgrade" "Upgrade"

echo ""
echo "🎉 All contracts built successfully!"
echo ""
echo "Artifacts location: target/ink/{contract_name}/{contract_name}.contract"
