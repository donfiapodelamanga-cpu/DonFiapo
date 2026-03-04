const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const WS_URL = 'ws://127.0.0.1:9944';

async function main() {
    const provider = new WsProvider(WS_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');
    const bob = keyring.addFromUri('//Bob');

    console.log('🧪 Testing Marketplace Cross-Contract Calls...');

    // Load artifacts
    // We assume ecosystem is already deployed by deploy_ecosystem.cjs and addresses are in last_deploy_ecosystem.json
    const ecoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    if (!fs.existsSync(ecoPath)) {
        console.error('❌ Ecosystem not found. Run deploy_ecosystem.cjs first.');
        process.exit(1);
    }
    const ecosystem = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));

    // Check addresses
    const marketAddr = ecosystem.marketplace;
    const icoAddr = ecosystem.ico;
    const coreAddr = ecosystem.core;

    if (!marketAddr || !icoAddr || !coreAddr) {
        console.error('❌ Missing contract addresses.');
        process.exit(1);
    }

    console.log(`Marketplace: ${marketAddr}`);
    console.log(`ICO: ${icoAddr}`);
    console.log(`Core: ${coreAddr}`);

    // Load Abis
    const marketAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_marketplace/fiapo_marketplace.json'), 'utf8'));
    const icoAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json'), 'utf8'));
    const coreAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_core/fiapo_core.json'), 'utf8'));

    const market = new ContractPromise(api, marketAbi, marketAddr);
    const ico = new ContractPromise(api, icoAbi, icoAddr);
    const core = new ContractPromise(api, coreAbi, coreAddr);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 50_000_000_000n,
        proofSize: 1_000_000n,
    });
    // explicit storage deposit limit (not null)
    const storageDepositLimit = undefined;

    try {
        // 1. Setup: Alice needs an NFT (Free Mint)
        console.log('\n📝 1. Alice mints Free NFT...');
        // ensure ICO active
        await signAndSend(ico.tx.unpauseIco({ gasLimit, storageDepositLimit }), alice);

        // mint
        await signAndSend(ico.tx.mintFree({ gasLimit, storageDepositLimit }), alice);

        // check NFT ID 1 owner - using CORRECTED method name
        const { output: nftOutput } = await ico.query.getUserNfts(alice.address, { gasLimit });
        console.log(`   Alice NFTs: ${nftOutput.toHuman()}`);
        const nftId = 1; // Assuming first mint is ID 1

        // 2. Alice lists NFT on Marketplace
        console.log(`\n📝 2. Alice lists NFT ${nftId} for 100 tokens...`);
        // Approve Marketplace to transfer NFT? 
        // Logic check: Marketplace.list_nft just creates listing. 
        // Marketplace.buy_nft calls call_ico_transfer_nft.
        // ICO.transfer_nft checks: is_nft_owner || is_contract_owner || is_marketplace.
        // We need to set Marketplace contract in ICO!

        console.log('   Setting Marketplace in ICO (if not set)...');
        // Alice is owner of ICO (deployed by Alice in deploy script usually)
        await signAndSend(ico.tx.setMarketplaceContract({ gasLimit, storageDepositLimit }, marketAddr), alice);

        // List it
        const price = 100n;
        await signAndSend(market.tx.listNft({ gasLimit, storageDepositLimit }, nftId, price), alice);
        console.log('   Listed.');

        // 3. Bob buys NFT
        console.log('\n📝 3. Bob buys NFT...');
        // Bob needs Tokens. Alice sends tokens to Bob.
        console.log('   Funding Bob...');
        await signAndSend(core.tx.transfer({ gasLimit, storageDepositLimit }, bob.address, 1000n), alice);

        // Bob needs to Approve Marketplace to spend tokens?
        // Marketplace.buy_nft calls call_core_transfer_from(buyer, seller, amount).
        // Core (PSP22) transfer_from requires allowance!
        console.log('   Bob approves Marketplace...');
        await signAndSend(core.tx.approve({ gasLimit, storageDepositLimit }, marketAddr, 1000n), bob);

        // Buy!
        console.log('   Executing Buy (Cross-Contract Call)...');
        await signAndSend(market.tx.buyNft({ gasLimit, storageDepositLimit }, nftId), bob);

        console.log('✅✅✅ Marketplace Buy (Cross-Contract) SUCCEEDED!');

    } catch (e) {
        console.error('❌ Cross-Contract Call FAILED:', e);
    } finally {
        await api.disconnect();
    }
}

async function signAndSend(tx, signer) {
    return new Promise((resolve, reject) => {
        tx.signAndSend(signer, ({ status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    if (dispatchError.isModule) {
                        // for module errors, we have the section indexed, lookup
                        // We can't lookup easily without api instance here, but it prints enough usually.
                        const decoded = dispatchError.asModule;
                        reject(new Error(`Dispatch Error: Check logs. Index: ${decoded.index}, Error: ${decoded.error}`));
                    } else {
                        reject(new Error(dispatchError.toString()));
                    }
                } else {
                    resolve();
                }
            }
        }).catch(reject);
    });
}

main().catch(console.error);
