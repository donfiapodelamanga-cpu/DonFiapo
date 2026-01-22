/**
 * Seed Treasury Script - Fixed Supply Distribution
 * 
 * Distribui tokens FIAPO do Core para os contratos do ecossistema
 * usando o método PSP22 correto (IPSP22::transfer)
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

// Treasury allocations (Fixed Supply of 300 Billion)
const ALLOCATIONS = {
    staking: 240_000_000_000n * 100_000_000n,   // 240B (8 decimals)
    airdrop: 21_000_000_000n * 100_000_000n,    // 21B
    ico: 6_000_000_000n * 100_000_000n,         // 6B
    rewards: 1_000_000_000n * 100_000_000n,     // 1B
};

async function main() {
    console.log('🌱 Seeding Treasuries (Fixed Supply Distribution)...\n');

    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    console.log(`   Deployer: ${alice.address}`);

    // Load addresses
    const deployData = JSON.parse(fs.readFileSync(
        path.join(__dirname, 'last_deploy_ecosystem.json'), 'utf8'
    ));

    // Load Core ABI
    const coreAbi = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../don-fiapo-web/src/lib/contracts/fiapo_core.json'), 'utf8'
    ));

    const coreContract = new ContractPromise(api, coreAbi, deployData.core);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 10_000_000n,
    });

    for (const [name, amount] of Object.entries(ALLOCATIONS)) {
        const destination = deployData[name];
        if (!destination) {
            console.log(`⚠️  Skipping ${name}: address not found`);
            continue;
        }

        const amountFormatted = (Number(amount) / 1e8).toLocaleString();
        console.log(`\n📤 Transferring ${amountFormatted} $FIAPO to ${name.toUpperCase()}...`);
        console.log(`   Destination: ${destination}`);

        try {
            // Use the correct PSP22 namespaced method
            const tx = coreContract.tx['ipsp22::transfer'](
                { gasLimit, storageDepositLimit: null },
                destination,
                amount.toString()
            );

            await new Promise((resolve, reject) => {
                tx.signAndSend(alice, ({ status, dispatchError }) => {
                    if (status.isInBlock || status.isFinalized) {
                        if (dispatchError) {
                            console.error(`   ❌ Transfer to ${name} failed:`, dispatchError.toString());
                            reject(new Error(`Transfer to ${name} failed`));
                            return;
                        }
                        console.log(`   ✅ ${name} treasury seeded successfully!`);
                        resolve();
                    }
                }).catch(reject);
            });
        } catch (error) {
            console.error(`   ❌ Error seeding ${name}:`, error.message);
        }
    }

    console.log('\n🎉 Treasury seeding completed!');
    await api.disconnect();
}

main().catch(console.error);
