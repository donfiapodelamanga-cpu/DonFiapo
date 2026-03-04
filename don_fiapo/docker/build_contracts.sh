#!/bin/bash
set -e

echo "============================================"
echo "  Don Fiapo - ink! Contract Builder"
echo "  Toolchain: $(rustc --version)"
echo "  cargo-contract: $(cargo-contract --version)"
echo "============================================"

# Lista de contratos para compilar (sem spin_game - agora off-chain)
CONTRACTS=(
    "contracts/core"
    "contracts/staking"
    "contracts/governance"
    "contracts/ico"
    "contracts/oracle_multisig"
    "contracts/rewards"
    "contracts/lottery"
    "contracts/airdrop"
    "contracts/affiliate"
    "contracts/noble_affiliate"
    "contracts/marketplace"
    "contracts/nft_collections"
    "contracts/security"
    "contracts/timelock"
    "contracts/upgrade"
)

# Diretório de output
OUTPUT_DIR="/workspace/artifacts"
mkdir -p "$OUTPUT_DIR"

echo ""
echo ">> Passo 1: Verificando compilação do workspace..."
cargo check --workspace 2>&1
echo ">> cargo check OK!"

echo ""
echo ">> Passo 2: Executando testes unitários..."
cargo test --workspace 2>&1
echo ">> Testes OK!"

echo ""
echo ">> Passo 3: Compilando contratos WASM..."

FAILED=0
SUCCEEDED=0

for contract in "${CONTRACTS[@]}"; do
    name=$(basename "$contract")
    echo ""
    echo "--- Compilando: $name ---"
    
    if cargo contract build --manifest-path "$contract/Cargo.toml" --release 2>&1; then
        echo ">> $name: OK"
        
        # Copiar artefatos para output
        # cargo-contract coloca em target/ink/
        TARGET_DIR="target/ink"
        if [ -d "$contract/target/ink" ]; then
            TARGET_DIR="$contract/target/ink"
        fi
        
        # Procurar .contract e .json
        find "$TARGET_DIR" -name "*.contract" -exec cp {} "$OUTPUT_DIR/" \; 2>/dev/null || true
        find "$TARGET_DIR" -name "*.json" -not -name "*.contract" -exec cp {} "$OUTPUT_DIR/" \; 2>/dev/null || true
        find "$TARGET_DIR" -name "*.wasm" -exec cp {} "$OUTPUT_DIR/" \; 2>/dev/null || true
        
        SUCCEEDED=$((SUCCEEDED + 1))
    else
        echo ">> $name: FALHOU"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "============================================"
echo "  Resultado: $SUCCEEDED OK, $FAILED FALHAS"
echo "  Artefatos em: $OUTPUT_DIR"
echo "============================================"

if [ -d "$OUTPUT_DIR" ]; then
    echo ""
    echo "Artefatos gerados:"
    ls -la "$OUTPUT_DIR/"
fi

exit $FAILED
