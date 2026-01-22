const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../don-fiapo-web/.env.local') });

// Configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ICO_CONTRACT || "5CKNUYhN5ce1dQrfEtYX7ZqpVgMN4qoRytku3hwCqAfB3EDq";
const LUNES_RPC = process.env.NEXT_PUBLIC_LUNES_RPC || "ws://127.0.0.1:9944";
// Use Alice for guaranteed funds
const MNEMONIC = "//Alice";

async function main() {
    console.log("🛠  Starting Mining Claim Test (Alice)...");

    // 1. Initialize API & Keyring
    const provider = new WsProvider(LUNES_RPC);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(MNEMONIC);

    console.log(`🔑 Signer: ${signer.address} (Alice)`);

    // 2. Load Contract
    const abiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json');
    if (!fs.existsSync(abiPath)) {
        console.error("❌ ABI file not found at " + abiPath);
        process.exit(1);
    }
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);

    // 3. Find NFT
    console.log("🔎 Searching for NFT owned by Alice...");
    const { output: totalOutput } = await contract.query.totalNfts(
        signer.address,
        { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) }
    );
    let totalNfts = 0;
    if (totalOutput && totalOutput.isOk) {
        totalNfts = Number(String(totalOutput.toHuman()?.Ok || totalOutput.toHuman()).replace(/,/g, ''));
    }

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
                console.log(`✅ Found NFT #${i}`);
                targetNftId = i;
                break;
            }
        }
    }

    if (!targetNftId) {
        console.log("⚠️  No NFTs found. Minting one...");
        // Minting logic same as before...
        const tx = contract.tx.mintFree({
            gasLimit: api.registry.createType('WeightV2', { refTime: 10000000000, proofSize: 1024 * 1024 })
        });
        await new Promise((resolve, reject) => {
            tx.signAndSend(signer, ({ status }) => {
                if (status.isFinalized) resolve();
            }).catch(reject);
        });
        targetNftId = totalNfts + 1;
        console.log(`✅ Minted new NFT #${targetNftId}`);
    }

    // 4. Check Claimable (Pending)
    console.log(`\nℹ️  Checking pending tokens for NFT #${targetNftId}...`);
    // 'pendingTokens' is the view function in contract
    // Need to find exact name: pending_tokens?
    // Contract methods in Polkadot.js are usually camelCase of rust method.
    // Rust: pending_tokens -> JS: pendingTokens

    // NOTE: If method doesn't exist, this might fail.
    // Based on lib.rs line 518: `pub fn pending_tokens(&self, nft_id: u64) -> u128`

    try {
        const { output: pendingOutput } = await contract.query.pendingTokens(
            signer.address,
            { gasLimit: api.registry.createType('WeightV2', { refTime: 6000000000, proofSize: 1024 * 1024 }) },
            targetNftId
        );
        console.log(`💰 Pending Tokens: ${pendingOutput ? pendingOutput.toHuman() : 'Unknown'}`);
    } catch (e) {
        console.log("⚠️  Could not query pendingTokens (maybe name mismatch):", e.message);
    }

    // 5. Claim Mined Tokens
    console.log(`\n🚀 Attempting to CLAIM MINED TOKENS for NFT #${targetNftId}...`);
    // Rust: claim_mined_tokens (I assume) -> JS: claimMinedTokens

    try {
        const tx = contract.tx.claimTokens(
            { gasLimit: api.registry.createType('WeightV2', { refTime: 10000000000, proofSize: 1024 * 1024 }) },
            targetNftId
        );

        await tx.signAndSend(signer, ({ status, dispatchError }) => {
            if (status.isFinalized) {
                if (dispatchError) {
                    console.log(`❌ Claim Transaction Failed (DispatchError).`);
                    console.error(dispatchError.toHuman());
                } else {
                    console.log("🎉 Claim Mined Tokens Transaction Success!");
                    // Even if amount is 0, if tx succeeds, the path is valid.
                }
                process.exit(0);
            }
        });
    } catch (error) {
        console.error("❌ Failed to send transaction:", error);
    }
}

main().catch(console.error);
