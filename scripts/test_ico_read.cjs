const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const ICO_ADDRESS = process.env.NEXT_PUBLIC_ICO_CONTRACT || '5CK6VcMWE2x4uE77wSN3jFa4fBBwH64XEQKT6Lyi7ygay6CY'; // New Contract
const USER_ADDRESS = '5Hb7quTKJ9WmKDJQcHC8SMriuzBMwgEDJR2YPHnMXwkTAAyQ';
const ABI_PATH = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json');

async function main() {
    console.log(`Connecting to ${RPC_URL}`);
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });

    // Create caller
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    if (!fs.existsSync(ABI_PATH)) {
        console.error("ABI not found at", ABI_PATH);
        process.exit(1);
    }
    const abi = JSON.parse(fs.readFileSync(ABI_PATH, 'utf8'));

    console.log(`Contract: ${ICO_ADDRESS}`);
    const contract = new ContractPromise(api, abi, ICO_ADDRESS);

    // Call get_evolution_stats
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });

    console.log("\nCalling get_evolution_stats...");
    try {
        const { result, output } = await contract.query.getEvolutionStats(
            alice.address,
            { gasLimit, storageDepositLimit: null }
        );

        if (result.isOk) {
            console.log("Result OK");
            if (output) {
                console.log("Output:", output.toHuman());
            } else {
                console.log("Output is null");
            }
        } else {
            console.error("Result Error:", result.asErr.toString());
        }
    } catch (e) {
        console.error("Exception calling get_evolution_stats:", e);
    }

    console.log("\nCalling get_ico_nft_configs...");
    try {
        const { result, output } = await contract.query.getIcoNftConfigs(
            alice.address,
            { gasLimit, storageDepositLimit: null }
        );
        if (result.isOk && output) {
            console.log("Configs Output:", output.toHuman());
        } else {
            console.log("Configs Error");
        }
    } catch (e) { console.error(e); }

    console.log(`\nCalling get_user_evolutions for ${USER_ADDRESS}...`);
    try {
        const { result, output } = await contract.query.getUserEvolutions(
            alice.address,
            { gasLimit, storageDepositLimit: null },
            USER_ADDRESS
        );
        if (result.isOk && output) {
            console.log("User Evolutions:", output.toHuman());
        } else {
            console.log("User Evolutions Error/Null");
        }
    } catch (e) {
        console.error("Exception calling get_user_evolutions:", e);
    }

    await api.disconnect();
}

main();
