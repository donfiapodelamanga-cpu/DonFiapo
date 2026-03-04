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

function findMethod(abi, name) {
    return name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

async function callContract(api, deployer, contractAddress, abi, method, args, label) {
    console.log(`\n⚙️  Configuring ${label || method}...`);
    const contract = new ContractPromise(api, abi, contractAddress);
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    let methodToCall = findMethod(abi, method);
    if (!contract.tx[methodToCall]) {
        methodToCall = method;
    }

    if (!contract.tx[methodToCall]) {
        throw new Error(`Method ${method} not found in ABI`);
    }

    const tx = contract.tx[methodToCall](
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
    console.log('🚀 Updating Staking Contract (V2 - Fee Distribution)...\n');
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
    const rewardsAddress = deployInfo.rewards;
    const marketplaceAddress = deployInfo.marketplace;
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);

    const burnAddress = deployInfo.burn_wallet || deployer.address; // Use core's burn wallet if possible

    console.log(`✅ Connected as ${deployer.address}\n`);

    try {
        // --- DEPLOY STAKING V2 ---
        const stakingPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_staking/fiapo_staking.contract');

        const staking = await deployContract(api, deployer, 'fiapo_staking', stakingPath, 'new',
            [coreAddress], 'Staking V2 (Fees & Dist)');

        // --- CONFIGURE STAKING ---
        // set_linked_contracts(oracle, affiliate, rewards, team, burn)
        await callContract(api, deployer, staking.address, staking.abi, 'set_linked_contracts',
            [
                oracleAddress || null,
                affiliateAddress || null,
                rewardsAddress,
                deployer.address, // team wallet: deployer for now
                deployInfo.core_burn_wallet || deployer.address // should use core's burn wallet
            ], 'Staking -> Set Linked Contracts');

        // --- UPDATE DEPENDENCIES ---

        // Core: Authorize new Staking as Minter
        const coreArtifactPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_core/fiapo_core.contract');
        if (fs.existsSync(coreArtifactPath)) {
            const coreArtifact = JSON.parse(fs.readFileSync(coreArtifactPath, 'utf8'));
            await callContract(api, deployer, coreAddress, coreArtifact, 'authorize_minter',
                [staking.address], 'Core -> Authorize Staking');
        } else {
            console.warn('⚠️  Skipping Core -> Authorize Staking: Artifact not found');
        }

        // Marketplace: Update Staking
        if (marketplaceAddress) {
            const marketArtifactPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_marketplace/fiapo_marketplace.contract');
            if (fs.existsSync(marketArtifactPath)) {
                const marketArtifact = JSON.parse(fs.readFileSync(marketArtifactPath, 'utf8'));
                await callContract(api, deployer, marketplaceAddress, marketArtifact, 'set_staking_contract',
                    [staking.address], 'Marketplace -> Update Staking');
            } else {
                console.warn('⚠️  Skipping Marketplace -> Update Staking: Artifact not found');
            }
        }

        // Oracle: Update Staking
        if (oracleAddress) {
            const oracleArtifactPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_oracle_multisig/fiapo_oracle_multisig.contract');
            if (fs.existsSync(oracleArtifactPath)) {
                const oracleArtifact = JSON.parse(fs.readFileSync(oracleArtifactPath, 'utf8'));
                await callContract(api, deployer, oracleAddress, oracleArtifact, 'set_contract_address',
                    ['staking', staking.address], 'Oracle -> Update Staking');
            } else {
                console.warn('⚠️  Skipping Oracle -> Update Staking: Artifact not found');
            }
        }

        // Update deployment info
        deployInfo.staking = staking.address;
        deployInfo.date = new Date().toISOString();

        fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
        console.log('\n✅ Deployment info updated in scripts/last_deploy_ecosystem.json');
        console.log(`NEW STAKING ADDRESS: ${staking.address}`);
        console.log(`\n⚠️  REMEMBER TO UPDATE .env AND .env.local!`);

    } catch (error) {
        console.error('Failed to update staking:', error);
    } finally {
        await api.disconnect();
    }
}

main().catch(console.error);
