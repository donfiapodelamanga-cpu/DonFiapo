#!/bin/bash
set -e

# Root of the don_fiapo workspace
ROOT_DIR="$(dirname "$0")/../don_fiapo"

# Function to build a contract
build_contract() {
    CONTRACT_NAME=$1
    MANIFEST_PATH="${ROOT_DIR}/contracts/${CONTRACT_NAME}/Cargo.toml"
    echo "================================================="
    echo "Building contract: ${CONTRACT_NAME}"
    echo "================================================="
    cargo contract build --manifest-path "${MANIFEST_PATH}"
}

# Build dependencies first (traits doesn't need building as it's a library)
# but we can check it to ensure it's valid
echo "Checking traits library..."
cargo check --manifest-path "${ROOT_DIR}/contracts/traits/Cargo.toml"

# Build other contracts
build_contract "spin_game"
build_contract "core"

echo "================================================="
echo "All contracts built successfully!"
echo "================================================="
