const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise, ContractPromise } = require('@polkadot/api-contract');
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

async function callContract(api, deployer, contractAddress, abi, method, args, label) {
    console.log(`\n⚙️  Configuring ${label || method}...`);
    const contract = new ContractPromise(api, abi, contractAddress);
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    const tx = contract.tx[method](
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
    console.log('🚀 Updating Staking Contract (with Affiliate Integration)...\n');
    console.log(`RPC: ${RPC_URL}`);

    // Load previous deployment info
    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    if (!fs.existsSync(deployInfoPath)) {
        throw new Error('last_deploy_ecosystem.json not found. Run full deploy first.');
    }
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));

    const coreAddress = deployInfo.core;
    const affiliateAddress = deployInfo.affiliate;
    const oracleAddress = deployInfo.oracle;
    const marketplaceAddress = deployInfo.marketplace;

    if (!coreAddress || !affiliateAddress) {
        throw new Error('Core or Affiliate address not found in deployment info.');
    }

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);

    console.log(`✅ Connected as ${deployer.address}\n`);

    try {
        // --- DEPLOY STAKING ---
        const stakingPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_staking/fiapo_staking.contract');

        const staking = await deployContract(api, deployer, 'fiapo_staking', stakingPath, 'new',
            [coreAddress], 'Staking (Updated)');

        // --- CONFIGURE STAKING ---
        // Set Affiliate Contract
        await callContract(api, deployer, staking.address, staking.abi, 'set_affiliate_contract',
            [affiliateAddress], 'Staking -> Set Affiliate');

        // Set Oracle Contract (if available)
        if (oracleAddress) {
            await callContract(api, deployer, staking.address, staking.abi, 'set_oracle_contract',
                [oracleAddress], 'Staking -> Set Oracle');
        }

        // --- UPDATE DEPENDENCIES ---

        // Core: Authorize new Staking as Minter
        // Load Core ABI
        const coreArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_core/fiapo_core.contract'), 'utf8'));
        await callContract(api, deployer, coreAddress, coreArtifact, 'authorize_minter', // check if snake_case or camelCase? usually camelCase in ts wrapper but snake_case in ABI. ContractPromise uses ABI method names.
            [staking.address], 'Core -> Authorize Staking');

        // Marketplace: Update Staking
        if (marketplaceAddress) {
            const marketArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_marketplace/fiapo_marketplace.contract'), 'utf8'));
            await callContract(api, deployer, marketplaceAddress, marketArtifact, 'set_staking_contract',
                [staking.address], 'Marketplace -> Update Staking');
        }

        // Oracle: Update Staking
        if (oracleAddress) {
            const oracleArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_oracle_multisig/fiapo_oracle_multisig.contract'), 'utf8'));
            // Oracle setContractAddress takes (name: String, address: AccountId)
            await callContract(api, deployer, oracleAddress, oracleArtifact, 'set_contract_address',
                ['staking', staking.address], 'Oracle -> Update Staking');
        }

        // Update deployment info
        deployInfo.staking = staking.address;
        deployInfo.date = new Date().toISOString();

        fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
        console.log('\n✅ Deployment info updated in scripts/last_deploy_ecosystem.json');
        console.log(`NEW STAKING ADDRESS: ${staking.address}`);
        console.log(`\n⚠️  REMEMBER TO UPDATE .env AND .env.local WITH THIS NEW ADDRESS!`);

    } catch (error) {
        console.error('Failed to update staking:', error);
    } finally {
        await api.disconnect();
    }
}

main().catch(console.error);
