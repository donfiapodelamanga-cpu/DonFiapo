
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🧪 Testing Staking Direct Call (ping)...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    // Load deployment info
    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    const stakingAddress = deployInfo.staking;

    console.log(`Staking Address: ${stakingAddress}`);

    // Load Staking ABI
    const abiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_staking/fiapo_staking.json');
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    const contract = new ContractPromise(api, abi, stakingAddress);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 50_000_000_000n,
        proofSize: 3_000_000n,
    });

    // Call ping
    try {
        const { result, output } = await contract.query.ping(
            alice.address,
            { gasLimit, storageDepositLimit: null }
        );

        if (result.isOk) {
            console.log('Main Ping Result:', output.toHuman());
        } else {
            console.error('Main Ping Failed:', result.toHuman());
        }
    } catch (e) {
        console.error('Call Execption:', e);
    }

    await api.disconnect();
}

main().catch(console.error);
