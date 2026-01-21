
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

// Contract Address - Updated from .env.local
const CONTRACT_ADDRESS = "5GLoAoKhwNphpFNueNFcVtcXr4NhUsueYJSJhy9rv3gGZ1HG";
const LUNES_RPC = "ws://127.0.0.1:9944";

async function main() {
    console.log("🔍 Verifying Evolution Data on Contract...");

    const provider = new WsProvider(LUNES_RPC);
    const api = await ApiPromise.create({ provider });

    // Load ABI
    const abiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json');
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);

    // 1. Fetch Configs using the new method
    console.log(`\n📡 Calling get_ico_nft_configs() on ${CONTRACT_ADDRESS}...`);

    // Read-only call
    const { output, result } = await contract.query.getIcoNftConfigs(
        api.registry.createType('AccountId', "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"), // Alice
        { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) }
    );

    if (result.isOk && output) {
        // Output is Result<Vec<TierConfig>, Error>
        // But Ink return structure might be complex depending on decoding
        const data = output.toHuman();

        console.log("\n📊 Contract Returned Data:");
        // console.log(JSON.stringify(data, null, 2));

        if (Array.isArray(data.Ok)) {
            data.Ok.forEach((tier, index) => {
                console.log(`\n--- Tier ${index} ---`);
                console.log(`Max Supply: ${tier.maxSupply} (Raw: ${tier.max_supply})`);
                console.log(`Sales Minted: ${tier.minted} (Should trigger Sales Bonus if <= 100)`);
                console.log(`Evolutions: ${tier.mintedEvolution} (Raw: ${tier.minted_evolution}) (Should trigger Evolution Bonus if <= 100)`);

                // Logic Check
                const salesBonus = parseInt(tier.minted.replace(/,/g, '')) < 100;
                const evoBonus = parseInt(tier.mintedEvolution.replace(/,/g, '')) < 100;

                console.log(`✅ Sales Bonus Active? ${salesBonus ? "YES" : "NO"}`);
                console.log(`✅ Evolution Bonus Active? ${evoBonus ? "YES" : "NO"}`);
            });
        } else {
            console.error("❌ Unexpected data format:", data);
        }

    } else {
        console.error("❌ Failed to call contract:", result.toHuman());
    }

    await api.disconnect();
}

main().catch(console.error);
