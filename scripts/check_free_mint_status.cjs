
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const CONTRACT_ADDRESS = "5GLoAoKhwNphpFNueNFcVtcXr4NhUsueYJSJhy9rv3gGZ1HG";
const LUNES_RPC = "ws://127.0.0.1:9944";
// Default Alice in dev chain
const ALICE_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

async function main() {
    console.log("🔍 Checking Free Mint Status...");

    const provider = new WsProvider(LUNES_RPC);
    const api = await ApiPromise.create({ provider });

    // Load ABI
    const abiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json');
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);

    console.log(`📡 Checking has_free_mint for ${ALICE_ADDRESS}...`);

    const { output, result } = await contract.query.hasFreeMint(
        api.registry.createType('AccountId', ALICE_ADDRESS),
        { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) },
        ALICE_ADDRESS
    );

    if (result.isOk && output) {
        const hasUsed = output.toPrimitive();
        console.log(`✅ Free Mint Used by Alice? ${hasUsed ? "YES (True)" : "NO (False)"}`);

        if (hasUsed) {
            console.log("⚠️  This is why 'mint_free' fails! You can only mint once per account.");
        } else {
            console.log("ℹ️  Status is False. Mint should work.");
        }

    } else {
        console.error("❌ Failed to call contract:", result.toHuman());
    }

    await api.disconnect();
}

main().catch(console.error);
