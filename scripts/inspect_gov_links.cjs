const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🧪 Inspecting Governance Linked Contracts...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    const govAddress = deployInfo.governance;

    console.log(`Governance Address: ${govAddress}`);
    console.log(`Expected Staking: ${deployInfo.staking}`);

    const govAbiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.json');
    const govAbi = JSON.parse(fs.readFileSync(govAbiPath, 'utf8'));
    const contract = new ContractPromise(api, govAbi, govAddress);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 10_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    const stakingRes = await contract.query.stakingContract(alice.address, { gasLimit, storageDepositLimit });
    const rewardsRes = await contract.query.rewardsContract(alice.address, { gasLimit, storageDepositLimit });
    const oracleRes = await contract.query.oracleContract(alice.address, { gasLimit, storageDepositLimit });

    console.log('Staking saved in Gov:', stakingRes.output?.toHuman());
    console.log('Rewards saved in Gov:', rewardsRes.output?.toHuman());
    console.log('Oracle saved in Gov:', oracleRes.output?.toHuman());

    await api.disconnect();
}

main().catch(console.error);
