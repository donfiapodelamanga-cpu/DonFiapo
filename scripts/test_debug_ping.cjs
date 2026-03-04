
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🧪 Debugging Cross-Contract Ping (Wrapper vs Manual)\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    // Load info
    const deployInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'last_deploy_ecosystem.json'), 'utf8'));
    const govAddr = deployInfo.governance;
    const govAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.json'), 'utf8'));

    const governance = new ContractPromise(api, govAbi, govAddr);

    // Using HIGH gas and proof size
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 50_000_000_000n,
        proofSize: 5_000_000n,
    });
    const storageDepositLimit = null;

    console.log(`Governance: ${govAddr}`);
    console.log('--------------------------------------------------');

    // TEST 1: Wrapper Ping (test_ping using StakingRef)
    console.log('TEST 1: Wrapper Ping (test_ping)');
    try {
        const { result, output } = await governance.query.testPing(alice.address, { gasLimit, storageDepositLimit });
        console.log(`Result: ${JSON.stringify(result.toHuman(), null, 2)}`);
        if (output) console.log(`Output: ${JSON.stringify(output.toHuman(), null, 2)}`);
    } catch (e) {
        console.log(`Exception: ${e.message}`);
    }

    console.log('--------------------------------------------------');

    // TEST 2: Manual Ping (test_ping_manual using build_call)
    console.log('TEST 2: Manual Ping (test_ping_manual)');
    try {
        const { result, output } = await governance.query.testPingManual(alice.address, { gasLimit, storageDepositLimit });
        console.log(`Result: ${JSON.stringify(result.toHuman(), null, 2)}`);
        if (output) console.log(`Output: ${JSON.stringify(output.toHuman(), null, 2)}`);
    } catch (e) {
        console.log(`Exception: ${e.message}`);
    }

    console.log('--------------------------------------------------');
    await api.disconnect();
}

main().catch(console.error);
