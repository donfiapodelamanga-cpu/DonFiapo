/**
 * Test Free Mint Script
 * 
 * Tries to call mint_free on the ICO contract using Alice.
 * Decodes any error returned.
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🧪 Testing Free Mint...\n');

    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    // Load deployment data
    const deployData = JSON.parse(fs.readFileSync(
        path.join(__dirname, 'last_deploy_ecosystem.json'), 'utf8'
    ));

    const icoAddress = deployData.ico;
    console.log(`   ICO Contract: ${icoAddress}`);
    console.log(`   User: ${alice.address}`);

    // Load ICO ABI (Artifacts path might vary, trying standard)
    const artifactPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at ${artifactPath}`);
    }
    const icoAbi = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    const contract = new ContractPromise(api, icoAbi, icoAddress);

    // High Gas Limit
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 10_000_000n,
    });

    try {
        const { gasRequired, storageDeposit, result, output } = await contract.query.mintFree(
            alice.address,
            { gasLimit, storageDepositLimit: null }
        );

        // Check for success in dry-run
        if (result.isErr) {
            console.error('❌ Dry-run failed:', result.asErr.toString());
            // Try to decode Module error if present
            if (result.asErr.isModule) {
                const dispatchError = result.asErr;
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                console.error(`   Decoded: ${decoded.section}.${decoded.method}: ${decoded.docs.join(' ')}`);
            }
            return;
        }

        if (result.isOk && output) {
            const decodedOutput = output.toHuman();
            console.log('   Dry-run output:', decodedOutput);

            // Check if custom contract error
            if (decodedOutput && decodedOutput.Err) {
                console.error('❌ Contract Logic Error:', decodedOutput.Err);
                return;
            }
        }

        console.log('✅ Dry-run successful. Sending tx...');

        const tx = contract.tx.mintFree(
            { gasLimit, storageDepositLimit: null }
        );

        await new Promise((resolve, reject) => {
            tx.signAndSend(alice, ({ status, dispatchError }) => {
                if (status.isInBlock || status.isFinalized) {
                    if (dispatchError) {
                        if (dispatchError.isModule) {
                            const decoded = api.registry.findMetaError(dispatchError.asModule);
                            console.error(`❌ Transaction Failed: ${decoded.section}.${decoded.method}: ${decoded.docs.join(' ')}`);
                            console.error(`   Index: ${dispatchError.asModule.index}, Error: ${dispatchError.asModule.error}`);
                        } else {
                            console.error('❌ Transaction Failed:', dispatchError.toString());
                        }
                        resolve(); // Resolve to close connection
                    } else {
                        console.log('✅ Mint successful!');
                        resolve();
                    }
                }
            }).catch(reject);
        });

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }

    await api.disconnect();
}

main().catch(console.error);
