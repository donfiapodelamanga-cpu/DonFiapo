
import os
import sys
import time
import random
from substrateinterface import SubstrateInterface, Keypair
from substrateinterface.contracts import ContractCode, ContractInstance
from substrateinterface.exceptions import SubstrateRequestException

# Configuration
NODE_URL = "ws://127.0.0.1:9944"
ALICE_URI = "//Alice"

# Paths to artifacts (relative to script location)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "target/ink")

CONTRACTS = {
    "core": {
        "path": os.path.join(ARTIFACTS_DIR, "fiapo_core/fiapo_core.contract"),
        "name": "Fiapo Core"
    },
    "staking": {
        "path": os.path.join(ARTIFACTS_DIR, "fiapo_staking/fiapo_staking.contract"),
        "name": "Fiapo Staking"
    },
    "test_cross": {
        "path": os.path.join(ARTIFACTS_DIR, "test_cross/test_cross.contract"),
        "name": "Test Cross"
    }
}

def connect():
    try:
        substrate = SubstrateInterface(url=NODE_URL)
        print(f"✅ Connected to {NODE_URL}")
        return substrate
    except Exception as e:
        print(f"❌ Failed to connect to node: {e}")
        sys.exit(1)

def deploy_contract(substrate, keypair, contract_key, args):
    print(f"\n🚀 Deploying {CONTRACTS[contract_key]['name']}...")
    
    contract_path = CONTRACTS[contract_key]['path']
    if not os.path.exists(contract_path):
        print(f"❌ Contract file not found: {contract_path}")
        sys.exit(1)
        
    try:
        # Load contract code
        from substrateinterface.contracts import ContractCode, ContractInstance
        import time
        import random
        
        code = ContractCode.create_from_contract_files(
            metadata_file=contract_path.replace(".contract", ".json"),
            wasm_file=contract_path.replace(".contract", ".wasm"),
            substrate=substrate
        )
        
        # Deploy
        print(f"   Submitting instantiate extrinsic for {contract_key}...")
        # Use random salt to avoid DuplicateContract
        salt = str(random.randint(0, 1000000000))
        
        contract = code.deploy(
            keypair=keypair,
            constructor="new",
            args=args,
            gas_limit={'ref_time': 100_000_000_000, 'proof_size': 3_000_000},
            upload_code=True,
            deployment_salt=salt
        )
        
        print(f"✅ {CONTRACTS[contract_key]['name']} deployed at: {contract.contract_address}")
        return contract
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        sys.exit(1)

def call_contract(substrate, keypair, contract, method, args=None):
    if args is None:
        args = {}
    
    print(f"\n📞 Calling {method} on {contract.contract_address}...")
    
    try:
        # Estimate gas? Or just read?
        # For ping we essentially want to read, but let's try dry-run first
        
        result = contract.read(keypair, method, args)
        
        # Check if result property exists or try to interpret dictionary
        if hasattr(result, 'is_success'):
             success = result.is_success
        else:
             # Fallback for different versions or raw dicts
             success = 'Ok' in result.contract_result_data if hasattr(result, 'contract_result_data') else False

        if success:
            print(f"✅ Call Successful! Result: {result.contract_result_data}")
            return result
        else:
            print(f"❌ Call Failed!")
            if hasattr(result, 'error_message'):
                print(f"   Error: {result.error_message}")
            if hasattr(result, 'contract_result_data'):
                print(f"   Data: {result.contract_result_data}")
            # Print full object for debug
            # print(f"DEBUG Result: {result}")
            return result

    except Exception as e:
        print(f"❌ Exception during call: {e}")
        return None

def main():
    substrate = connect()
    keypair = Keypair.create_from_uri(ALICE_URI)
    
    # 1. Deploy Core
    # Constructor: name, symbol, initial_supply, burn_wallet, team_wallet, staking_wallet, rewards_wallet
    print(f"   Constructor args for Core: name='Don Fiapo', symbol='DFIA', supply=1e18, wallets=Alice")
    
    core_contract = deploy_contract(substrate, keypair, "core", {
        "name": "Don Fiapo", 
        "symbol": "DFIA", 
        "initial_supply": 1_000_000_000 * 10**8, # 8 decimals
        "burn_wallet": keypair.ss58_address,
        "team_wallet": keypair.ss58_address,
        "staking_wallet": keypair.ss58_address,
        "rewards_wallet": keypair.ss58_address
    })
    
    # 2. Deploy Staking (needs Core address)
    staking_contract = deploy_contract(substrate, keypair, "staking", {
        "core_contract": core_contract.contract_address
    })
    
    # 3. Deploy Test Cross (needs Staking address)
    # Skipped due to compilation error in TestCross
    # test_cross_contract = deploy_contract(substrate, keypair, "test_cross", {
    #     "staking_addr": staking_contract.contract_address
    # })
    
    # Fund the contract to ensure it can pay for cross-contract calls
    # print(f"\n💰 Funding TestCross contract with 10 Units...")
    # call = substrate.compose_call(
    #     call_module='Balances',
    #     call_function='transfer',
    #     call_params={
    #         'dest': test_cross_contract.contract_address,
    #         'value': 10 * 10**12 # Assuming 12 decimals for native token or ample amount
    #     }
    # )
    # extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    # substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    # print("   Funding complete.")

    # 5. Deploy Simple Target
    CONTRACTS["simple_target"] = {
        "path": os.path.join(ARTIFACTS_DIR, "simple_target/simple_target.contract"),
        "name": "Simple Target"
    }
    simple_target = deploy_contract(substrate, keypair, "simple_target", {})
    
    # 6. Deploy TestCross pointing to Simple Target
    # print(f"\n🚀 Deploying TestCross (Simple Wrapper)...")
    # # Use random salt
    # salt_simple = str(random.randint(0, 1000000000))
    # from substrateinterface.contracts import ContractCode
    # code = ContractCode.create_from_contract_files(
    #     metadata_file=CONTRACTS["test_cross"]["path"].replace(".contract", ".json"),
    #     wasm_file=CONTRACTS["test_cross"]["path"].replace(".contract", ".wasm"),
    #     substrate=substrate
    # )
    # test_cross_simple = code.deploy(
    #     keypair=keypair,
    #     constructor="new",
    #     args={"staking_addr": simple_target.contract_address},
    #     gas_limit={'ref_time': 100_000_000_000, 'proof_size': 3_000_000},
    #     upload_code=True,
    #     deployment_salt=salt_simple
    # )
    # print(f"✅ TestCross (Simple) deployed at: {test_cross_simple.contract_address}")
    
    # # Fund Simple Wrapper
    # print(f"💰 Funding TestCross (Simple) with 10 Units...")
    # call = substrate.compose_call(
    #     call_module='Balances',
    #     call_function='transfer',
    #     call_params={
    #         'dest': test_cross_simple.contract_address,
    #         'value': 10 * 10**12
    #     }
    # )
    # extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    # substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    # print("   Funding complete.")

    # 7. Deploy TestPure
    CONTRACTS["test_pure"] = {
        "path": os.path.join(ARTIFACTS_DIR, "test_pure/test_pure.contract"),
        "name": "Test Pure"
    }
    print(f"\n🚀 Deploying TestPure (Pure Ink Wrapper)...")
    salt_pure = str(random.randint(0, 1000000000))
    code_pure = ContractCode.create_from_contract_files(
        metadata_file=CONTRACTS["test_pure"]["path"].replace(".contract", ".json"),
        wasm_file=CONTRACTS["test_pure"]["path"].replace(".contract", ".wasm"),
        substrate=substrate
    )
    test_pure = code_pure.deploy(
        keypair=keypair,
        constructor="new",
        args={"target": simple_target.contract_address},
        gas_limit={'ref_time': 100_000_000_000, 'proof_size': 3_000_000},
        upload_code=True,
        deployment_salt=salt_pure
    )
    print(f"✅ TestPure deployed at: {test_pure.contract_address}")
    
    # Fund TestPure
    print(f"💰 Funding TestPure with 10 Units...")
    call = substrate.compose_call(
        call_module='Balances',
        call_function='transfer',
        call_params={
            'dest': test_pure.contract_address,
            'value': 10 * 10**12
        }
    )
    extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
    substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)
    print("   Funding complete.")

    # 8. Debugging
    print(f"\n🔍 Debugging Cross-Contract Calls...")
    
    # Check Staking Ping directly first
    print("\n--- Direct Check: Staking::ping ---")
    call_contract(substrate, keypair, staking_contract, "Staking::ping")
    
    # Check Wrapper Ping
    # print("\n--- Cross Check: TestCross -> Staking (ping) ---")
    # call_contract(substrate, keypair, test_cross_contract, "ping")
    
    # Check Simple Wrapper Ping (The Truth Test)
    # print("\n--- Cross Check: TestCross -> SimpleTarget (ping) ---")
    # call_contract(substrate, keypair, test_cross_simple, "ping")
    
    # Check Pure Wrapper Ping
    print("\n--- Cross Check: TestPure -> SimpleTarget (ping_ref) ---")
    call_contract(substrate, keypair, test_pure, "ping_ref")

    print("\n--- Cross Check: TestPure -> SimpleTarget (ping_builder) ---")
    call_contract(substrate, keypair, test_pure, "ping_builder")
    
    # Check Manual Address Ping
    # print("\n--- Cross Check: TestCross::ping_manual_addr (Manual) ---")
    # call_contract(substrate, keypair, test_cross_contract, "ping_manual_addr", {
    #     "target": staking_contract.contract_address
    # })

if __name__ == "__main__":
    main()
