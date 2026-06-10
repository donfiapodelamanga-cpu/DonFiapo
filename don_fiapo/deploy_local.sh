#!/usr/bin/env bash
set -e

URL="ws://localhost:9944"
SURI="//Alice"
ALICE="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
BOB="5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
CHARLIE="5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"

TARGET="target/ink"

extract_address() {
  grep -oP 'Contract [\w\d]+' | awk '{print $2}' | head -1
}

echo "============================================"
echo " Deploying Don Fiapo contracts to local testnet"
echo "============================================"

# 1. Deploy fiapo-core (PSP22 token)
echo ""
echo "[1/9] Deploying fiapo-core..."
CORE_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/core/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args '"Don Fiapo"' '"FIAPO"' '1000000000000000000u128' "$ALICE" "$ALICE" "$ALICE" "$ALICE" \
  --execute \
  --skip-confirm 2>&1)
echo "$CORE_OUTPUT"
CORE=$(echo "$CORE_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ fiapo-core: $CORE"

# 2. Deploy fiapo-affiliate
echo ""
echo "[2/9] Deploying fiapo-affiliate..."
AFFILIATE_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/affiliate/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args "$CORE" \
  --execute \
  --skip-confirm 2>&1)
echo "$AFFILIATE_OUTPUT"
AFFILIATE=$(echo "$AFFILIATE_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ fiapo-affiliate: $AFFILIATE"

# 3. Deploy fiapo-rewards
echo ""
echo "[3/9] Deploying fiapo-rewards..."
REWARDS_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/rewards/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args "$CORE" \
  --execute \
  --skip-confirm 2>&1)
echo "$REWARDS_OUTPUT"
REWARDS=$(echo "$REWARDS_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ fiapo-rewards: $REWARDS"

# 4. Deploy noble-affiliate
echo ""
echo "[4/9] Deploying noble-affiliate..."
NOBLE_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/noble_affiliate/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args "$CORE" \
  --execute \
  --skip-confirm 2>&1)
echo "$NOBLE_OUTPUT"
NOBLE=$(echo "$NOBLE_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ noble-affiliate: $NOBLE"

# 5. Deploy oracle-multisig (Alice + Bob as initial oracles, 2 required)
echo ""
echo "[5/9] Deploying oracle-multisig..."
ORACLE_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/oracle_multisig/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args "[$ALICE,$BOB]" '2u32' \
  --execute \
  --skip-confirm 2>&1)
echo "$ORACLE_OUTPUT"
ORACLE=$(echo "$ORACLE_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ oracle-multisig: $ORACLE"

# 6. Deploy fiapo-staking
echo ""
echo "[6/9] Deploying fiapo-staking..."
STAKING_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/staking/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args "$CORE" \
  --execute \
  --skip-confirm 2>&1)
echo "$STAKING_OUTPUT"
STAKING=$(echo "$STAKING_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ fiapo-staking: $STAKING"

# 7. Deploy fiapo-ico
echo ""
echo "[7/9] Deploying fiapo-ico..."
ICO_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/ico/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args "$CORE" \
  --execute \
  --skip-confirm 2>&1)
echo "$ICO_OUTPUT"
ICO=$(echo "$ICO_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ fiapo-ico: $ICO"

# 8. Deploy fiapo-governance
echo ""
echo "[8/9] Deploying fiapo-governance..."
GOVERNANCE_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/governance/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args "$CORE" \
  --execute \
  --skip-confirm 2>&1)
echo "$GOVERNANCE_OUTPUT"
GOVERNANCE=$(echo "$GOVERNANCE_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ fiapo-governance: $GOVERNANCE"

# 9. Deploy fiapo-lottery
echo ""
echo "[9/9] Deploying fiapo-lottery..."
LOTTERY_OUTPUT=$(cargo contract instantiate \
  --manifest-path contracts/lottery/Cargo.toml \
  --suri "$SURI" \
  --url "$URL" \
  --args "$CORE" \
  --execute \
  --skip-confirm 2>&1)
echo "$LOTTERY_OUTPUT"
LOTTERY=$(echo "$LOTTERY_OUTPUT" | grep -oP 'Contract \K[A-Za-z0-9]+' | head -1)
echo "✅ fiapo-lottery: $LOTTERY"

echo ""
echo "============================================"
echo " DEPLOYMENT COMPLETE"
echo "============================================"
echo "CORE=$CORE"
echo "AFFILIATE=$AFFILIATE"
echo "REWARDS=$REWARDS"
echo "NOBLE=$NOBLE"
echo "ORACLE=$ORACLE"
echo "STAKING=$STAKING"
echo "ICO=$ICO"
echo "GOVERNANCE=$GOVERNANCE"
echo "LOTTERY=$LOTTERY"

# Save to file
cat > deployed_addresses.env <<EOF
CORE=$CORE
AFFILIATE=$AFFILIATE
REWARDS=$REWARDS
NOBLE=$NOBLE
ORACLE=$ORACLE
STAKING=$STAKING
ICO=$ICO
GOVERNANCE=$GOVERNANCE
LOTTERY=$LOTTERY
EOF
echo ""
echo "Addresses saved to deployed_addresses.env"
