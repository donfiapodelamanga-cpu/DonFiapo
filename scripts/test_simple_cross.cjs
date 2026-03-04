
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise, ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🧪 Testing Simple Cross-Contract (test_cross -> simple_target)...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    // 1. Deploy simple_target
    console.log('Deploying simple_target...');
    const SimpleTargetArtifact = path.join(__dirname, '../don_fiapo/target/ink/simple_target/simple_target.contract');
    const simpleTargetJson = JSON.parse(fs.readFileSync(SimpleTargetArtifact, 'utf8'));
    const simpleTargetCode = new CodePromise(api, simpleTargetJson, simpleTargetJson.source.wasm);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 50_000_000_000n,
        proofSize: 10_000_000n,
    });

    const tx1 = simpleTargetCode.tx.new(
        { gasLimit, storageDepositLimit: null }
    );

    const simpleTarget = await new Promise((resolve, reject) => {
        tx1.signAndSend(alice, async ({ contract, status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) reject(new Error('SimpleTarget deploy failed'));
                if (contract) resolve(contract);
            }
        }).catch(reject);
    });

    console.log(`simple_target deployed at: ${simpleTarget.address}`);

    // 2. Deploy test_cross pointing to simple_target
    console.log('Deploying test_cross...');
    const TestCrossArtifact = path.join(__dirname, '../don_fiapo/target/ink/test_cross/test_cross.contract');
    const testCrossJson = JSON.parse(fs.readFileSync(TestCrossArtifact, 'utf8'));
    const testCrossCode = new CodePromise(api, testCrossJson, testCrossJson.source.wasm);

    const tx2 = testCrossCode.tx.new(
        { gasLimit, storageDepositLimit: null },
        simpleTarget.address
    );

    const testCross = await new Promise((resolve, reject) => {
        tx2.signAndSend(alice, async ({ contract, status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) reject(new Error('TestCross deploy failed'));
                if (contract) resolve(contract);
            }
        }).catch(reject);
    });

    console.log(`test_cross deployed at: ${testCross.address}`);

    // 3. Call ping (Wrapper)
    console.log('\nCalling ping() [Wrapper]...');
    const { result, output } = await testCross.query.ping(
        alice.address,
        { gasLimit, storageDepositLimit: null }
    );
    console.log(`Result: ${JSON.stringify(result.toHuman(), null, 2)}`);
    // Note: Wrapper expects StakingRef type return? No, test_cross.ping() returns u32.
    // If simple_target returns u32 correctly matching selector, it should work.

    // 4. Call ping_manual_addr (Manual)
    console.log('\nCalling ping_manual_addr() [Manual]...');
    const { result: res2, output: out2 } = await testCross.query.pingManualAddr(
        alice.address,
        { gasLimit, storageDepositLimit: null },
        simpleTarget.address
    );
    console.log(`Manual Result: ${JSON.stringify(res2.toHuman(), null, 2)}`);

    await api.disconnect();
}

main().catch(console.error);
