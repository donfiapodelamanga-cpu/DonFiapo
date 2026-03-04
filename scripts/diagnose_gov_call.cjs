const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🧪 Diagnosing Governance cross-contract call...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    const govAddress = deployInfo.governance;

    console.log(`Governance Address: ${govAddress}`);

    const govAbiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.json');
    const govAbi = JSON.parse(fs.readFileSync(govAbiPath, 'utf8'));
    const contract = new ContractPromise(api, govAbi, govAddress);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 10_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    console.log('\nCalling testPing()...');
    try {
        const { result: resPing, output: outPing } = await contract.query.testPing(
            alice.address,
            { gasLimit, storageDepositLimit }
        );
        if (resPing.isOk) {
            console.log('✅ Ping completed!');
            console.log('Output:', outPing.toHuman());
        } else {
            console.log('❌ Ping failed:', resPing.asErr.toHuman());
        }
    } catch (e) {
        console.log('❌ Ping exception:', e.message);
    }

    console.log('\nCalling testStakingCall(Alice)...');
    try {
        const { result, output } = await contract.query.testStakingCall(
            alice.address,
            { gasLimit, storageDepositLimit },
            alice.address
        );

        if (result.isOk) {
            console.log('✅ Call completed without Trapping!');
            console.log('Output:', output.toHuman());
        } else {
            console.log('❌ Call failed with Dispatch Error:', result.asErr.toHuman());
        }
    } catch (e) {
        console.log('❌ Exception during call:', e.message);
    }

    await api.disconnect();
}

main().catch(console.error);
