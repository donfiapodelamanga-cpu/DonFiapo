const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED || '//Alice';

// Staking address from failed run output
const STAKING_ADDRESS = '5G69b7ccHWAnjJEnKJubWRWRKxzn4Gq8mdFcojZHWSMcgMpz';

async function callContract(api, deployer, contractAddress, abi, method, args, label) {
    console.log(`\n⚙️  Configuring ${label || method}...`);
    const contract = new ContractPromise(api, abi, contractAddress);

    // Check available methods
    const methodNames = Object.keys(contract.tx);
    console.log(`Available methods: ${methodNames.join(', ')}`);

    // Try to find the correct method name (snake_case or camelCase)
    let finalMethod = method;
    if (!contract.tx[method]) {
        // Try camelCase
        const camel = method.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        if (contract.tx[camel]) {
            console.log(`Using camelCase method: ${camel}`);
            finalMethod = camel;
        } else {
            console.error(`Method ${method} not found!`);
            // List similar
            const similar = methodNames.filter(m => m.toLowerCase().includes('affiliate'));
            console.log(`Did you mean? ${similar.join(', ')}`);
            throw new Error(`Method ${method} not found`);
        }
    }

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    const tx = contract.tx[finalMethod](
        { gasLimit, storageDepositLimit },
        ...args
    );

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, ({ status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    console.error(`❌ ${method} failed`);
                    reject(new Error(`${method} failed`));
                    return;
                }
                console.log(`✅ ${method} successful`);
                resolve();
            }
        }).catch(reject);
    });
}

async function main() {
    console.log('🚀 Fixing Staking Config...\n');
    console.log(`RPC: ${RPC_URL}`);

    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    if (!fs.existsSync(deployInfoPath)) {
        throw new Error('last_deploy_ecosystem.json not found.');
    }
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));

    const coreAddress = deployInfo.core;
    const affiliateAddress = deployInfo.affiliate; // 5G7gs...
    const oracleAddress = deployInfo.oracle;
    const marketplaceAddress = deployInfo.marketplace;

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);

    console.log(`✅ Connected as ${deployer.address}\n`);

    try {
        const stakingArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_staking/fiapo_staking.contract'), 'utf8'));

        // 1. Set Affiliate
        await callContract(api, deployer, STAKING_ADDRESS, stakingArtifact, 'set_affiliate_contract',
            [affiliateAddress], 'Staking -> Set Affiliate');

        // 2. Set Oracle
        if (oracleAddress) {
            await callContract(api, deployer, STAKING_ADDRESS, stakingArtifact, 'set_oracle_contract',
                [oracleAddress], 'Staking -> Set Oracle');
        }

        // 3. Core: Authorize Staking
        const coreArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_core/fiapo_core.contract'), 'utf8'));
        // Try both casings for core too
        await callContract(api, deployer, coreAddress, coreArtifact, 'authorize_minter',
            [STAKING_ADDRESS], 'Core -> Authorize Staking');

        // 4. Update JSON
        deployInfo.staking = STAKING_ADDRESS;
        deployInfo.date = new Date().toISOString();
        fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
        console.log('\n✅ Deployment info updated.');
        console.log(`NEW STAKING ADDRESS: ${STAKING_ADDRESS}`);

    } catch (error) {
        console.error('Failed to fix staking:', error);
    } finally {
        await api.disconnect();
    }
}

main().catch(console.error);
