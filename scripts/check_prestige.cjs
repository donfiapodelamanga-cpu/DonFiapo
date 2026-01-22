
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

// Address from last deploy
const CONTRACT_ADDRESS = "5CKNUYhN5ce1dQrfEtYX7ZqpVgMN4qoRytku3hwCqAfB3EDq";
const LUNES_RPC = "ws://127.0.0.1:9944";
// Default Alice
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

async function main() {
    console.log("🔍 Checking Prestige Bonus & Stats...");

    const provider = new WsProvider(LUNES_RPC);
    const api = await ApiPromise.create({ provider });

    // Load ABI
    const abiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json');
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);

    // 1. Check Stats (to see total minted)
    console.log("1️⃣  Getting ICO Stats...");
    const { output: statsOutput } = await contract.query.getStats(
        api.registry.createType('AccountId', ALICE),
        { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) }
    );

    if (statsOutput && statsOutput.isSome) {
        console.log("📊 Stats:", JSON.stringify(statsOutput.toHuman(), null, 2));
    } else {
        console.error("❌ Failed to get stats");
    }

    // 2. Check Next NFT ID
    console.log("\n2️⃣  Checking Total NFTs...");
    const { output: totalOutput } = await contract.query.totalNfts(
        api.registry.createType('AccountId', ALICE),
        { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) }
    );
    let totalNfts = 0;
    if (totalOutput && totalOutput.isOk) {
        // Output is Result<u64, LangError> usually, or just u64 if not Result return
        // get_stats return ICOStats directly. total_nfts returns u64.
        // It wraps in Ok usually.
        const raw = totalOutput.toPrimitive(); // This might be the number directly? 
        // Actually usually output is a Codec.
        totalNfts = Number(totalOutput.toString().replace(/,/g, ''));
        console.log(`🔢 Total NFTs: ${totalNfts}`);
    }

    // 3. Scan NFTs
    console.log("\n3️⃣  Scanning NFTs...");
    // Check first 5 IDs
    for (let i = 1; i <= Math.min(totalNfts + 2, 5); i++) {
        const nftId = i;
        console.log(`\n🔎 Inspecting NFT #${nftId}...`);

        // Get NFT Data
        const { output: nftOutput } = await contract.query.getNft(
            api.registry.createType('AccountId', ALICE),
            { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) },
            nftId
        );

        if (nftOutput && nftOutput.isSome) {
            const nftData = nftOutput.toHuman();
            console.log("🎨 NFT Data:", JSON.stringify(nftData, null, 2));

            // Get Prestige Info
            const { output: prestigeOutput } = await contract.query.getPrestigeInfo(
                api.registry.createType('AccountId', ALICE),
                { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) },
                nftId
            );

            if (prestigeOutput && prestigeOutput.isSome) {
                console.log("🌟 Prestige Info (Raw):", JSON.stringify(prestigeOutput.toHuman(), null, 2));
            } else {
                console.log("⚪️ No Prestige Info (None)");
            }

        } else {
            console.log("❌ NFT Not Found (None)");
        }
    }

    await api.disconnect();
}

main().catch(console.error);
