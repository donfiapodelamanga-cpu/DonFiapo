
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise, ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🧪 Testing Minimal Cross-Contract (test_cross)...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    // Load Staking Address
    const deployInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'last_deploy_ecosystem.json'), 'utf8'));
    const stakingAddress = deployInfo.staking;

    console.log(`Staking To Call: ${stakingAddress}`);

    // Deploy test_cross
    const artifactPath = path.join(__dirname, '../don_fiapo/target/ink/test_cross/test_cross.contract');
    const contractJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const code = new CodePromise(api, contractJson, contractJson.source.wasm);

    console.log('Deploying test_cross...');

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 50_000_000_000n,
        proofSize: 10_000_000n,
    });

    const tx = code.tx.new(
        { gasLimit, storageDepositLimit: null },
        stakingAddress
    );

    const contract = await new Promise((resolve, reject) => {
        tx.signAndSend(alice, async ({ contract, status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    reject(new Error('Deploy failed'));
                }
                if (contract) resolve(contract);
            }
        }).catch(reject);
    });

    console.log(`test_cross deployed at: ${contract.address}`);

    // Call ping
    console.log('Calling ping()...');
    const { result, output } = await contract.query.ping(
        alice.address,
        { gasLimit, storageDepositLimit: null }
    );

    console.log(`Result: ${JSON.stringify(result.toHuman(), null, 2)}`);
    console.log(`Output: ${JSON.stringify(output ? output.toHuman() : null, null, 2)}`);

    console.log('\nCalling ping_manual_addr()...');
    const { result: res2, output: out2 } = await contract.query.pingManualAddr(
        alice.address,
        { gasLimit, storageDepositLimit: null },
        stakingAddress
    );
    console.log(`Manual Result: ${JSON.stringify(res2.toHuman(), null, 2)}`);
    console.log(`Manual Output: ${JSON.stringify(out2 ? out2.toHuman() : null, null, 2)}`);

    await api.disconnect();
}

main().catch(console.error);
