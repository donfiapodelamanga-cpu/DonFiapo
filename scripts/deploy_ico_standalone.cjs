const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise, ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const DEPLOYER_SEED = '//Alice'; // Default for local-node
const CONTRACT_PATH = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.contract');

// Existing Addresses from .env (Manually updated based on last read)
const CORE_ADDRESS = '5FJC4DtYiu6rPo9qvSdUJrybe26exSGhPoRvx1fB5QPBwdVS';
const ORACLE_ADDRESS = '5DDJ1AvXVWCypLoCfSnDsq4f5cCdejmWEEUi8waRcpHhv5Rj';
const MARKETPLACE_ADDRESS = '5DwPSc8zcHRkXSRzV5Zu7AzBQCTLeBkVkWfYenyfUq9HM5Wt';

// ABIs (minimal or load from file if needed, but for linking we need ABI of Core/Oracle... actually for params we just need address)
// To call methods on Core/Oracle/ICO, we need their ABI.
// We can load them from the same artifact lookup logic if they exist.

function loadAbi(name) {
    const p = path.join(__dirname, `../don_fiapo/target/ink/fiapo_${name}/fiapo_${name}.contract`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    // Fallback or error
    console.warn(`Warning: ABI for ${name} not found at ${p}`);
    return null;
}

async function deployContract(api, deployer, contractName, artifactPath, args) {
    console.log(`\n📦 Deploying ${contractName}...`);
    const contractJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const code = new CodePromise(api, contractJson, contractJson.source.wasm);
    const gasLimit = api.registry.createType('WeightV2', { refTime: 100_000_000_000n, proofSize: 1_000_000n });

    const tx = code.tx.new({ gasLimit, storageDepositLimit: null }, ...args);

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, async ({ contract, status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    if (dispatchError.isModule) {
                        const decoded = api.registry.findMetaError(dispatchError.asModule);
                        reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
                    } else {
                        reject(new Error(dispatchError.toString()));
                    }
                } else if (contract) {
                    console.log(`✅ ${contractName} deployed at: ${contract.address.toString()}`);
                    resolve({ address: contract.address.toString(), abi: contractJson });
                }
            }
        }).catch(reject);
    });
}

async function callContract(api, deployer, address, abi, method, args, label) {
    console.log(`\n⚙️  ${label || method}...`);
    const contract = new ContractPromise(api, abi, address);
    const gasLimit = api.registry.createType('WeightV2', { refTime: 100_000_000_000n, proofSize: 1_000_000n });

    const tx = contract.tx[method]({ gasLimit, storageDepositLimit: null }, ...args);

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, ({ status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    console.error(`❌ ${method} failed`);
                    reject(new Error(`${method} failed`));
                } else {
                    console.log(`✅ ${method} successful`);
                    resolve();
                }
            }
        }).catch(reject);
    });
}

async function main() {
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);

    console.log(`Connected as ${deployer.address}`);

    try {
        // 1. Deploy ICO
        const ico = await deployContract(api, deployer, 'fiapo_ico', CONTRACT_PATH, [CORE_ADDRESS]);

        // 2. Configure ICO
        console.log('Configuring ICO dependencies...');
        await callContract(api, deployer, ico.address, ico.abi, 'setOracleContract', [ORACLE_ADDRESS], 'setOracleContract');
        await callContract(api, deployer, ico.address, ico.abi, 'setMarketplaceContract', [MARKETPLACE_ADDRESS], 'setMarketplaceContract');

        // 3. Update Core (Authorize Minter)
        // Need Core ABI
        const coreAbi = loadAbi('core');
        if (coreAbi) {
            await callContract(api, deployer, CORE_ADDRESS, coreAbi, 'authorizeMinter', [ico.address], 'Core: Authorize New ICO');
        } else {
            console.warn('Skipping Core authorization (ABI not found). Manual authorization required.');
        }

        // 4. Update Oracle (Set Contract Address)
        const oracleAbi = loadAbi('oracle_multisig');
        if (oracleAbi) {
            await callContract(api, deployer, ORACLE_ADDRESS, oracleAbi, 'setContractAddress', ['ico', ico.address], 'Oracle: Update ICO Address');
        }

        console.log('\n==================================================');
        console.log(`NEW ICO CONTRACT ADDRESS: ${ico.address}`);
        console.log('==================================================');
        console.log('Please update .env with this new address.');

    } catch (error) {
        console.error('Deployment failed:', error);
    } finally {
        await api.disconnect();
    }
}

main();
