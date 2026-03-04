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

    // constructorName is usually 'new'
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
    // Try both snake_case (original) and camelCase (polkadot generated)
    // Actually, contract.tx[name] usually works with camelCase in newer APIs, 
    // but we can check the messages in ABI to be safe if manual lookup fails.
    // For now we assume standard camelCase for methods.

    // In Ink! ABIs, messages are snake_case. PolkadotJS maps them to camelCase.
    // We will try camelCase first.
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

    // Fallback or explicit check
    if (!contract.tx[methodToCall]) {
        console.log(`   Method ${methodToCall} not found, trying ${method}...`);
        methodToCall = method;
    }

    if (!contract.tx[methodToCall]) {
        throw new Error(`Method ${method} (or ${methodToCall}) not found in ABI`);
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
    console.log('🚀 Updating Governance & Rewards Contracts...\n');
    console.log(`RPC: ${RPC_URL}`);

    // Load deployment info
    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    if (!fs.existsSync(deployInfoPath)) {
        throw new Error('last_deploy_ecosystem.json not found. Run previous deploys first.');
    }
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));

    const coreAddress = deployInfo.core;
    const stakingAddress = deployInfo.staking;

    // Default Team Wallet (from deployer or config)
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);

    const teamWallet = deployer.address; // For now

    if (!coreAddress || !stakingAddress) {
        throw new Error('Core or Staking address not found in deployment info.');
    }

    console.log(`✅ Connected as ${deployer.address}\n`);

    try {
        // --- DEPLOY REWARDS V2 ---
        const rewardsPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_rewards/fiapo_rewards.contract');
        const rewards = await deployContract(api, deployer, 'fiapo_rewards', rewardsPath, 'new',
            [coreAddress], 'Rewards (V2)');

        // --- DEPLOY GOVERNANCE V2 ---
        const govPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.contract');

        // constructor: new(core_contract, initial_governors)
        // initial_governors: Vec<AccountId>. We pass [deployer] as initial governor
        const gov = await deployContract(api, deployer, 'fiapo_governance', govPath, 'new',
            [coreAddress, [deployer.address]], 'Governance (V2)');

        // --- CONFIGURE GOVERNANCE ---
        // set_linked_contracts(staking, rewards, team)
        await callContract(api, deployer, gov.address, gov.abi, 'set_linked_contracts',
            [stakingAddress, rewards.address, teamWallet], 'Governance -> Link Contracts');

        // Optional: set_fees if default is not desired. Default is 100 FIAPO proposal, 0 Vote. We keep defaults.

        // --- UPDATE DEPENDENCIES ---
        // Rewards V2 is fresh, does it need anything?
        // Rewards V2 stores 'core_contract'. Done in constructor.

        // Core doesn't need to know about Governance usually (unless Gov is minter? No).
        // Core doesn't need to know about Rewards (unless Rewards is minter? No, Rewards distributes existing funds).
        // However, Core's 'authorize_minter' or similar might be relevant if they mint. 
        // But here we are dealing with Fees (circulation), not Minting.

        // Update deployment info
        deployInfo.rewards = rewards.address;
        deployInfo.governance = gov.address;
        deployInfo.date = new Date().toISOString();

        fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
        console.log('\n✅ Deployment info updated in scripts/last_deploy_ecosystem.json');
        console.log(`NEW REWARDS ADDRESS: ${rewards.address}`);
        console.log(`NEW GOVERNANCE ADDRESS: ${gov.address}`);
        console.log(`\n⚠️  REMEMBER TO UPDATE .env AND .env.local!`);

    } catch (error) {
        console.error('Failed to update contracts:', error);
    } finally {
        await api.disconnect();
    }
}

main().catch(console.error);
