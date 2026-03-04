const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED || '//Alice';

async function deployContract(api, deployer, contractName, artifactPath, constructorName, args, label) {
    console.log(`\n📦 Deploying ${label || contractName}...`);

    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Contract artifact not found: ${artifactPath}`);
    }

    const contractJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const code = new CodePromise(api, contractJson, contractJson.source.wasm);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    console.log('   Instantiating...');

    const tx = code.tx[constructorName](
        { gasLimit, storageDepositLimit },
        ...args
    );

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, async ({ contract, status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    let errorMsg = 'Unknown error';
                    if (dispatchError.isModule) {
                        const decoded = api.registry.findMetaError(dispatchError.asModule);
                        errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                    }
                    console.error(`❌ ${contractName} deploy failed:`, errorMsg);
                    reject(new Error(errorMsg));
                    return;
                }

                if (contract) {
                    console.log(`✅ ${contractName} deployed at: ${contract.address.toString()}`);
                    resolve({ address: contract.address.toString(), abi: contractJson });
                }
            }
        }).catch(reject);
    });
}

async function main() {
    console.log('🚀 Deploying Rewards (V2 - Unified Errors)...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);

    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    const coreAddress = deployInfo.core;

    try {
        const rewardsPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_rewards/fiapo_rewards.contract');
        const rewards = await deployContract(api, deployer, 'fiapo_rewards', rewardsPath, 'new',
            [coreAddress], 'Rewards (V2)');

        deployInfo.rewards = rewards.address;
        fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
        console.log('\n✅ Rewards updated in last_deploy_ecosystem.json');

    } catch (error) {
        console.error('Deployment failed:', error);
    } finally {
        await api.disconnect();
    }
}

main().catch(console.error);
