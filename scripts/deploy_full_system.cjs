/**
 * Deploy Don Fiapo Full System (Core + Staking) to Local Testnet
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise, ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED || '//Alice';

// Team wallet for constructor args
const TEAM_WALLET = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Alice

async function deployContract(api, deployer, contractName, wasmPath, contractScalePath, constructorName, args) {
    console.log(`\n📦 Deploying ${contractName}...`);

    if (!fs.existsSync(contractScalePath)) {
        throw new Error(`Contract artifact not found: ${contractScalePath}`);
    }

    const contractJson = JSON.parse(fs.readFileSync(contractScalePath, 'utf8'));
    const code = new CodePromise(api, contractJson, contractJson.source.wasm);

    // Gas limit
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });

    const storageDepositLimit = null;

    console.log('   Instantiating...');

    // Find the constructor
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

async function authorizeMinter(api, deployer, coreAddress, coreAbi, minterAddress) {
    console.log(`\n🔐 Authorizing Staking contract as minter on Core...`);

    const contract = new ContractPromise(api, coreAbi, coreAddress);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    const tx = contract.tx.authorizeMinter(
        { gasLimit, storageDepositLimit },
        minterAddress
    );

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, ({ status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    console.error('❌ Authorization failed');
                    reject(new Error('Authorization failed'));
                    return;
                }
                console.log('✅ Authorization successful');
                resolve();
            }
        }).catch(reject);
    });
}

async function main() {
    console.log('🚀 Deploying Don Fiapo Full System...\n');
    console.log(`RPC: ${RPC_URL}`);
    console.log(`Deployer: ${DEPLOYER_SEED}\n`);

    // Connect to node
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });

    console.log(`✅ Connected to ${(await api.rpc.system.chain()).toString()}`);

    // Setup deployer account
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);
    console.log(`   Deployer: ${deployer.address}`);

    // Paths
    const coreArtifactPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_core/fiapo_core.contract');
    const stakingArtifactPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_staking/fiapo_staking.contract');

    // 1. Deploy Core
    const INITIAL_SUPPLY = '30000000000000000000'; // 300 billion * 10^8 (19 zeros)
    const coreDeploy = await deployContract(
        api,
        deployer,
        'Core',
        null,
        coreArtifactPath,
        'new',
        [
            'Don Fiapo', 'FIAPO', INITIAL_SUPPLY,
            TEAM_WALLET, TEAM_WALLET, TEAM_WALLET, TEAM_WALLET
        ]
    );
    const coreAddress = coreDeploy.address;

    // 2. Deploy Staking
    const stakingDeploy = await deployContract(
        api,
        deployer,
        'Staking',
        null,
        stakingArtifactPath,
        'new',
        [coreAddress]
    );
    const stakingAddress = stakingDeploy.address;

    // 3. Authorize Staking as Minter in Core
    await authorizeMinter(api, deployer, coreAddress, coreDeploy.abi, stakingAddress);

    console.log('\n═══════════════════════════════════════════');
    console.log(`CORE_ADDRESS=${coreAddress}`);
    console.log(`STAKING_ADDRESS=${stakingAddress}`);
    console.log('═══════════════════════════════════════════\n');

    // Save to file
    const info = {
        date: new Date().toISOString(),
        core_address: coreAddress,
        staking_address: stakingAddress,
        network: 'Local Testnet'
    };
    fs.writeFileSync(path.join(__dirname, 'last_deploy_local.json'), JSON.stringify(info, null, 2));
    console.log('✅ Deployment info saved to scripts/last_deploy_local.json');

    await api.disconnect();
}

main().catch(console.error);
