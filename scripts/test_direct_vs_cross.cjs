const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🧪 Testing Direct Staking ping() call...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    const stakingAddress = deployInfo.staking;

    console.log(`Staking Address: ${stakingAddress}`);

    const stakingAbiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_staking/fiapo_staking.json');
    const stakingAbi = JSON.parse(fs.readFileSync(stakingAbiPath, 'utf8'));
    const contract = new ContractPromise(api, stakingAbi, stakingAddress);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 10_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    // Test 1: Direct ping() call on Staking
    console.log('\n1. Testing direct Staking.ping()...');
    try {
        const { result, output } = await contract.query.ping(alice.address, { gasLimit, storageDepositLimit });
        if (result.isOk) {
            console.log('✅ Staking.ping() works:', output.toHuman());
        } else {
            console.log('❌ Staking.ping() failed:', result.asErr.toHuman());
        }
    } catch (e) {
        console.log('❌ Exception:', e.message);
    }

    // Test 2: Direct getUserPositions() call on Staking
    console.log('\n2. Testing direct Staking.getUserPositions(Alice)...');
    try {
        const { result, output } = await contract.query.getUserPositions(
            alice.address,
            { gasLimit, storageDepositLimit },
            alice.address
        );
        if (result.isOk) {
            console.log('✅ Staking.getUserPositions() works:', output.toHuman());
        } else {
            console.log('❌ Staking.getUserPositions() failed:', result.asErr.toHuman());
        }
    } catch (e) {
        console.log('❌ Exception:', e.message);
    }

    // Now test the Governance cross-contract call
    console.log('\n3. Testing Governance.testPing() (cross-contract)...');
    const govAddress = deployInfo.governance;
    const govAbiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.json');
    const govAbi = JSON.parse(fs.readFileSync(govAbiPath, 'utf8'));
    const govContract = new ContractPromise(api, govAbi, govAddress);

    try {
        const { result, output, gasRequired } = await govContract.query.testPing(
            alice.address,
            { gasLimit, storageDepositLimit }
        );
        console.log('Gas Required:', gasRequired.toHuman());
        if (result.isOk) {
            console.log('✅ Governance.testPing() works:', output.toHuman());
        } else {
            console.log('❌ Governance.testPing() failed:', result.asErr.toHuman());
        }
    } catch (e) {
        console.log('❌ Exception:', e.message);
    }

    await api.disconnect();
}

main().catch(console.error);
