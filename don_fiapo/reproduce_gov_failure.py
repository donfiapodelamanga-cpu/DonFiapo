
import os
import sys
import time
import random
from substrateinterface import SubstrateInterface, Keypair
from substrateinterface.contracts import ContractCode

# Configuration
NODE_URL = "ws://127.0.0.1:9944"
ALICE_URI = "//Alice"

# Base path to artifacts
ARTIFACTS_DIR = "/Users/cliente/Documents/Projetos_DEV/DonFiapo/don_fiapo/target/ink"

def connect():
    try:
        substrate = SubstrateInterface(url=NODE_URL)
        print(f"✅ Connected to {NODE_URL}")
        return substrate
    except Exception as e:
        print(f"❌ Failed to connect to node: {e}")
        sys.exit(1)

def deploy(substrate, keypair, name, args):
    print(f"\n🚀 Deploying {name}...")
    path = os.path.join(ARTIFACTS_DIR, f"{name}/{name}.contract")
    if not os.path.exists(path):
        print(f"❌ File not found: {path}")
        sys.exit(1)

    code = ContractCode.create_from_contract_files(
        metadata_file=path.replace(".contract", ".json"),
        wasm_file=path.replace(".contract", ".wasm"),
        substrate=substrate
    )
    
    salt = str(random.randint(0, 1000000000))
    contract = code.deploy(
        keypair=keypair,
        constructor="new",
        args=args,
        gas_limit={'ref_time': 100_000_000_000, 'proof_size': 3_000_000},
        upload_code=True,
        deployment_salt=salt
    )
    print(f"✅ {name} deployed at: {contract.contract_address}")
    return contract

def main():
    substrate = connect()
    alice = Keypair.create_from_uri(ALICE_URI)
    
    # 1. Core
    core = deploy(substrate, alice, "fiapo_core", {
        "name": "Don Fiapo", "symbol": "DFIA", "initial_supply": 1000000 * 10**8,
        "burn_wallet": alice.ss58_address, "team_wallet": alice.ss58_address,
        "staking_wallet": alice.ss58_address, "rewards_wallet": alice.ss58_address
    })
    
    # 2. Staking
    staking = deploy(substrate, alice, "fiapo_staking", {"core_contract": core.contract_address})
    
    # 3. Governance
    gov = deploy(substrate, alice, "fiapo_governance", {"core_contract": core.contract_address})
    
    # 4. Link Staking to Gov
    print("\n🔗 Linking Staking to Governance...")
    call = gov.exec(alice, "set_linked_contracts", args={
        "staking": staking.contract_address,
        "rewards": None, "oracle": None, "team": None
    })
    if call.is_success:
        print("✅ Linked successfully")
    else:
        print(f"❌ Link failed: {call.error_message}")
        sys.exit(1)
        
    # 5. Test Ping
    print("\n🧪 Testing Governance.test_ping()...")
    result = gov.read(alice, "test_ping")
    
    print(f"Result Data: {result.contract_result_data}")
    if hasattr(result, 'error_message') and result.error_message:
         print(f"Error Message: {result.error_message}")

    # Check for trapped
    if 'Ok' in str(result.contract_result_data):
        print("✅ Ping successful (returned Ok)")
    else:
        print("❌ Ping failed or trapped")

if __name__ == "__main__":
    main()
