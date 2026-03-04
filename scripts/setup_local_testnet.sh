#!/bin/bash
set -e

# ═══════════════════════════════════════════
#  Don Fiapo — Setup Local Testnet
# ═══════════════════════════════════════════
# 
# Este script automatiza todo o processo:
# 1. Inicia nó local (substrate-contracts-node ou ag-kit)
# 2. Build dos contratos
# 3. Deploy do ecossistema
# 4. Executa testes E2E
#
# Uso: ./setup_local_testnet.sh [--skip-build] [--skip-node] [--test-only]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACT_DIR="$PROJECT_DIR/don_fiapo"

export LUNES_RPC_URL="${LUNES_RPC_URL:-ws://127.0.0.1:9944}"
export DEPLOYER_SEED="${DEPLOYER_SEED:-//Alice}"

SKIP_BUILD=false
SKIP_NODE=false
TEST_ONLY=false

for arg in "$@"; do
    case $arg in
        --skip-build) SKIP_BUILD=true ;;
        --skip-node) SKIP_NODE=true ;;
        --test-only) TEST_ONLY=true; SKIP_BUILD=true; SKIP_NODE=true ;;
    esac
done

echo "╔═══════════════════════════════════════════════╗"
echo "║  Don Fiapo — Local Testnet Setup              ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║  RPC:       $LUNES_RPC_URL"
echo "║  Deployer:  $DEPLOYER_SEED"
echo "║  Skip Build: $SKIP_BUILD"
echo "║  Skip Node:  $SKIP_NODE"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════
# STEP 0: Check prerequisites
# ═══════════════════════════════════════════
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node.js 18+"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo not found. Install Rust"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js $NODE_VERSION found, need 18+"
    exit 1
fi

echo "  ✅ Node.js $(node -v)"
echo "  ✅ Cargo $(cargo --version | cut -d' ' -f2)"

if command -v cargo-contract &> /dev/null; then
    echo "  ✅ cargo-contract $(cargo contract --version 2>/dev/null | head -1)"
else
    echo "  ⚠️  cargo-contract not found (needed for building .contract artifacts)"
    echo "     Install: cargo install cargo-contract"
    if [ "$SKIP_BUILD" = false ]; then
        echo "❌ Cannot continue without cargo-contract"
        exit 1
    fi
fi

# Check if @polkadot/api is installed
if [ ! -d "$SCRIPT_DIR/node_modules/@polkadot" ]; then
    echo ""
    echo "📦 Installing script dependencies..."
    cd "$SCRIPT_DIR"
    npm install
    cd "$SCRIPT_DIR"
fi

echo ""

# ═══════════════════════════════════════════
# STEP 1: Start local node
# ═══════════════════════════════════════════
if [ "$SKIP_NODE" = false ]; then
    echo "═══ STEP 1: Starting Local Substrate Node ═══"
    echo ""

    # Check if a node is already running on port 9944
    if lsof -i :9944 &> /dev/null; then
        echo "  ⚠️  Port 9944 already in use — assuming node is running"
    else
        echo "  Starting node in background..."
        echo "  Option A: npx @vudovn/ag-kit init"
        echo "  Option B: substrate-contracts-node --dev"
        echo ""

        if command -v substrate-contracts-node &> /dev/null; then
            substrate-contracts-node --dev --ws-port 9944 &
            NODE_PID=$!
            echo "  ✅ Node started (PID: $NODE_PID)"
        else
            echo "  Trying ag-kit..."
            npx @vudovn/ag-kit init &
            NODE_PID=$!
            echo "  ✅ ag-kit started (PID: $NODE_PID)"
        fi

        # Wait for node to be ready
        echo "  Waiting for node to be ready..."
        for i in {1..30}; do
            if lsof -i :9944 &> /dev/null; then
                echo "  ✅ Node is ready!"
                break
            fi
            sleep 2
            if [ $i -eq 30 ]; then
                echo "  ❌ Node failed to start within 60 seconds"
                exit 1
            fi
        done
    fi
    echo ""
fi

# ═══════════════════════════════════════════
# STEP 2: Build contracts
# ═══════════════════════════════════════════
if [ "$SKIP_BUILD" = false ]; then
    echo "═══ STEP 2: Building Contracts ═══"
    echo ""

    cd "$CONTRACT_DIR"

    # First run cargo test to verify code is correct
    echo "  Running cargo test..."
    cargo test 2>&1 | tail -5
    echo ""

    # Build contract artifacts
    echo "  Building .contract artifacts..."
    bash build_all.sh
    echo ""
fi

# ═══════════════════════════════════════════
# STEP 3: Deploy ecosystem
# ═══════════════════════════════════════════
if [ "$TEST_ONLY" = false ]; then
    echo "═══ STEP 3: Deploying Ecosystem ═══"
    echo ""

    cd "$SCRIPT_DIR"
    node deploy_ecosystem.cjs

    echo ""
    echo "  ✅ Ecosystem deployed!"
    echo "  📄 Addresses: scripts/last_deploy_ecosystem.json"
    echo ""
fi

# ═══════════════════════════════════════════
# STEP 4: Run E2E Tests
# ═══════════════════════════════════════════
echo "═══ STEP 4: Running E2E Tests ═══"
echo ""

cd "$SCRIPT_DIR"
node test_local_e2e.cjs

echo ""

# ═══════════════════════════════════════════
# STEP 5: Run Volume Tests (optional)
# ═══════════════════════════════════════════
echo ""
read -p "🔄 Run volume tests? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "═══ STEP 5: Running Volume Tests ═══"
    echo ""
    node test_volume.cjs
fi

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║  ✅ Local Testnet Setup Complete              ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "Useful commands:"
echo "  • Re-run E2E:     cd scripts && node test_local_e2e.cjs"
echo "  • Re-run Volume:  cd scripts && node test_volume.cjs"
echo "  • Re-deploy:      cd scripts && node deploy_ecosystem.cjs"
echo "  • Contracts UI:   https://contracts-ui.substrate.io/?rpc=ws://127.0.0.1:9944"
echo ""
