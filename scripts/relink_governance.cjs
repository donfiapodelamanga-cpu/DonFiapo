/**
 * Quick script to re-link Governance to new Staking address
 */
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🔗 Re-linking Governance to new Staking...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri('//Alice');

    const deployInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'last_deploy_ecosystem.json'), 'utf8'));
    const govAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.json'), 'utf8'));

    const governance = new ContractPromise(api, govAbi, deployInfo.governance);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 50_000_000_000n,
        proofSize: 1_000_000n,
    });

    console.log(`Governance: ${deployInfo.governance}`);
    console.log(`New Staking: ${deployInfo.staking}`);
    console.log(`Rewards: ${deployInfo.rewards}`);
    console.log(`Oracle: ${deployInfo.oracle}`);

    const tx = governance.tx.setLinkedContracts(
        { gasLimit, storageDepositLimit: null },
        deployInfo.staking,
        deployInfo.rewards,
        deployInfo.oracle,
        deployer.address // team wallet
    );

    await new Promise((resolve, reject) => {
        tx.signAndSend(deployer, ({ status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    console.log('❌ Failed to re-link');
                    reject(new Error('Re-link failed'));
                    return;
                }
                console.log('✅ Governance re-linked successfully');
                resolve();
            }
        }).catch(reject);
    });

    await api.disconnect();
}

main().catch(console.error);
