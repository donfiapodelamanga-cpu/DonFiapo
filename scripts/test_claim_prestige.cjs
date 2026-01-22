const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../don-fiapo-web/.env.local') });

// Configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ICO_CONTRACT || "5CKNUYhN5ce1dQrfEtYX7ZqpVgMN4qoRytku3hwCqAfB3EDq";
const LUNES_RPC = process.env.NEXT_PUBLIC_LUNES_RPC || "ws://127.0.0.1:9944";
// FORCE ALICE for testing (guaranteed funds on dev chain)
const MNEMONIC = "//Alice";

async function main() {
    console.log("🛠  Starting Prestige Claim Test (Alice)...");

    // 1. Initialize API & Keyring
    const provider = new WsProvider(LUNES_RPC);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(MNEMONIC);

    console.log(`🔑 Signer Address: ${signer.address} (Alice)`);

    // 2. Load Contract
    const abiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json');
    if (!fs.existsSync(abiPath)) {
        console.error("❌ ABI file not found at " + abiPath);
        process.exit(1);
    }
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);

    // 3. Find an NFT owned by Signer
    console.log("🔎 Searching for an NFT owned by Alice...");

    // Get total NFTs
    const { output: totalOutput } = await contract.query.totalNfts(
        signer.address,
        { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) }
    );
    let totalNfts = 0;
    if (totalOutput && totalOutput.isOk) {
        totalNfts = Number(String(totalOutput.toHuman()?.Ok || totalOutput.toHuman()).replace(/,/g, ''));
    }
    console.log(`🔢 Total NFTs on chain: ${totalNfts}`);

    let targetNftId = null;
    for (let i = 1; i <= Math.min(totalNfts, 50); i++) {
        const { output: nftOutput } = await contract.query.getNft(
            signer.address,
            { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) },
            i
        );

        if (nftOutput && nftOutput.isSome) {
            const data = nftOutput.toHuman()?.Ok || nftOutput.toHuman();
            if (data && (data.owner === signer.address || data.Owner === signer.address)) {
                console.log(`✅ Found NFT #${i} owned by Alice!`);
                targetNftId = i;
                break;
            }
        }
    }

    // 4. MINT if not found
    if (!targetNftId) {
        console.log("⚠️  No NFTs found for Alice. Attempting to MINT FREE NFT...");

        try {
            const tx = contract.tx.mintFree({
                gasLimit: api.registry.createType('WeightV2', { refTime: 10000000000, proofSize: 1024 * 1024 })
            });

            await new Promise((resolve, reject) => {
                tx.signAndSend(signer, ({ status, dispatchError }) => {
                    if (status.isInBlock) console.log(`⏳ MintInBlock: ${status.asInBlock}`);
                    if (status.isFinalized) {
                        if (dispatchError) reject(new Error(dispatchError.toString()));
                        else {
                            console.log("✅ Mint Success!");
                            resolve();
                        }
                    }
                }).catch(reject);
            });

            // Assume the new ID is totalNfts + 1
            targetNftId = totalNfts + 1;
            console.log(`👉 Assuming new NFT ID is #${targetNftId}`);

        } catch (e) {
            console.error("❌ Mint Failed:", e);
            process.exit(1);
        }
    }

    // 5. Check Prestige Bonus Info
    console.log(`\nℹ️  checking Prestige Bonus for NFT #${targetNftId}...`);
    const { output: prestigeOutput } = await contract.query.getPrestigeInfo(
        signer.address,
        { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) },
        targetNftId
    );

    if (prestigeOutput && prestigeOutput.isSome) {
        console.log("🌟 Prestige Data (Before Claim):", JSON.stringify(prestigeOutput.toHuman(), null, 2));
    } else {
        console.log("⚪️ No Prestige data returned (None) or not eligible.");
    }

    // 6. Attempt Claim
    console.log(`\n🚀 Attempting to CLAIM Prestige Bonus for NFT #${targetNftId}...`);

    try {
        const tx = contract.tx.claimPrestigeBonus(
            { gasLimit: api.registry.createType('WeightV2', { refTime: 10000000000, proofSize: 1024 * 1024 }) },
            targetNftId
        );

        await tx.signAndSend(signer, ({ status, dispatchError }) => {
            if (status.isFinalized) {
                if (dispatchError) {
                    console.log(`❌ Claim Transaction Failed (DispatchError) - This might be expected if vesting not started.`);
                    // Checking error details usually requires Metadata matching, simplifying here
                } else {
                    console.log("🎉 Claim Prestige Transaction Success!");
                }
                process.exit(0);
            }
        });

    } catch (error) {
        console.error("❌ Failed to send transaction:", error);
    }
}

main().catch(console.error);
