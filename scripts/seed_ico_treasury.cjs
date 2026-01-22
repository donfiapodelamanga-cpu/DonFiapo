const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');

async function main() {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    // Load addresses
    const deployData = JSON.parse(fs.readFileSync('scripts/last_deploy_ecosystem.json', 'utf8'));
    const coreAddress = deployData.core;
    const icoAddress = deployData.ico;

    console.log('📡 Seeding ICO Treasury...');
    console.log(`   Core: ${coreAddress}`);
    console.log(`   ICO:  ${icoAddress}`);

    // Load Core ABI
    const coreAbi = JSON.parse(fs.readFileSync('don-fiapo-web/src/lib/contracts/fiapo_core.json', 'utf8'));
    const coreContract = new ContractPromise(api, coreAbi, coreAddress);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000,
        proofSize: 10_000_000
    });

    // 6 Billion FIAPO (8 decimals)
    const ICO_TREASURY = 6_000_000_000n * 100_000_000n;

    // Transfer to ICO (skipping balance check, Alice has dev funds)
    console.log(`   Transferring ${(Number(ICO_TREASURY) / 1e8).toLocaleString()} $FIAPO to ICO...`);

    const tx = coreContract.tx.transfer(
        { gasLimit, storageDepositLimit: null },
        icoAddress,
        ICO_TREASURY.toString()
    );

    await new Promise((resolve, reject) => {
        tx.signAndSend(alice, ({ status, dispatchError }) => {
            if (dispatchError) {
                console.error('❌ Transfer failed:', dispatchError.toString());
                reject(dispatchError);
            }
            if (status.isFinalized) {
                console.log('✅ ICO Treasury seeded successfully!');
                resolve();
            }
        });
    });

    console.log('Done.');
    await api.disconnect();
}

main().catch(console.error);
