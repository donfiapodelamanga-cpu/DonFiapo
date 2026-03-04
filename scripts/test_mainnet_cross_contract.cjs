const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise, ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Lunes Mainnet endpoints
const MAINNET_ENDPOINTS = [
    'wss://ws.lunes.io',
    'wss://ws-lunes-main-01.lunes.io',
    'wss://ws-lunes-main-02.lunes.io'
];

// Use mnemonic from .env directly, prioritizing explicit DEPLOYER_SEED
const DEPLOYER_SEED = process.env.DEPLOYER_SEED || process.env.LUNES_MNEMONIC;

if (!DEPLOYER_SEED) {
    console.error('❌ LUNES_MNEMONIC or DEPLOYER_SEED environment variable is required');
    process.exit(1);
}

async function connectToMainnet() {
    for (const endpoint of MAINNET_ENDPOINTS) {
        try {
            console.log(`Trying endpoint: ${endpoint}...`);
            const provider = new WsProvider(endpoint, 10000);
            const api = await ApiPromise.create({ provider, timeout: 20000 });
            console.log(`✅ Connected to ${endpoint}`);
            return api;
        } catch (e) {
            console.log(`❌ Failed to connect to ${endpoint}: ${e.message}`);
        }
    }
    throw new Error('Failed to connect to any Lunes mainnet endpoint');
}

async function deployContract(api, deployer, label, contractPath, constructor, args) {
    console.log(`\n📦 Deploying ${label}...`);
    if (!fs.existsSync(contractPath)) {
        throw new Error(`Contract file not found at ${contractPath}`);
    }
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const code = new CodePromise(api, contractJson, contractJson.source.wasm);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    const tx = code.tx[constructor]({ gasLimit, storageDepositLimit }, ...args);

    return new Promise((resolve, reject) => {
        let address = null;
        tx.signAndSend(deployer, ({ status, contract, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    let errorMsg = 'Dispatch Error';
                    if (dispatchError.isModule) {
                        const decoded = api.registry.findMetaError(dispatchError.asModule);
                        errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                    } else {
                        errorMsg = dispatchError.toString();
                    }
                    console.error(`❌ ${label} deploy failed: ${errorMsg}`);
                    reject(new Error(`${label} deploy failed: ${errorMsg}`));
                    return;
                }

                if (contract) {
                    address = contract.address.toString();
                    console.log(`✅ ${label} deployed at: ${address}`);
                    resolve({ address, abi: contractJson, contract });
                }
            } else if (status.isDropped || status.isInvalid || status.isUsurped) {
                reject(new Error(`${label} deploy failed with status ${status.type}`));
            } else {
                console.log(`   ${label} status: ${status.type}`);
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

    // Try finding exact method or camelCase or lowercase match
    let methodToCall = method;
    if (!contract.tx[methodToCall]) {
        methodToCall = Object.keys(contract.tx).find(m => m.toLowerCase() === method.toLowerCase()) || method;
    }

    if (!contract.tx[methodToCall]) {
        console.error(`Method ${method} not found. Available:`, Object.keys(contract.tx));
        throw new Error(`Method ${method} not found in ABI`);
    } else {
        console.log(`   Found method: ${methodToCall}`);
    }

    const tx = contract.tx[methodToCall](
        { gasLimit, storageDepositLimit },
        ...args
    );

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, ({ status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    let errorMsg = 'Dispatch Error';
                    if (dispatchError.isModule) {
                        const decoded = api.registry.findMetaError(dispatchError.asModule);
                        errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                    } else {
                        errorMsg = dispatchError.toString();
                    }
                    console.error(`❌ ${method} failed: ${errorMsg}`);
                    reject(new Error(`${method} failed: ${errorMsg}`));
                    return;
                }
                console.log(`✅ ${method} successful`);
                resolve();
            }
        }).catch(reject);
    });
}

async function main() {
    console.log('🧪 Testing Cross-Contract Calls on Lunes MAINNET (Phase 3 - Fresh Deploy/Reuse)...\n');
    console.log('⚠️  WARNING: This will consume real LUNES tokens! User approved option 2.\n');

    const api = await connectToMainnet();
    const keyring = new Keyring({ type: 'sr25519' });

    // Check multiple accounts to find the one with funds
    const accountsToCheck = [
        { name: 'Default', uri: DEPLOYER_SEED },
        { name: 'Index 0', uri: `${DEPLOYER_SEED}//0` },
        { name: 'Index 1', uri: `${DEPLOYER_SEED}//1` },
        { name: 'Index 2', uri: `${DEPLOYER_SEED}//2` },
        { name: 'Index 3', uri: `${DEPLOYER_SEED}//3` },
        { name: 'Index 4', uri: `${DEPLOYER_SEED}//4` }
    ];

    let deployer = null;

    console.log('🔎 Searching for funds in derived accounts...');
    for (const acc of accountsToCheck) {
        try {
            const key = keyring.addFromUri(acc.uri);
            const { data: bal } = await api.query.system.account(key.address);
            const balanceStr = bal.free.toString();
            console.log(`   checking ${acc.name} (${key.address}) -> Balance: ${bal.free.toHuman()}`);

            if (balanceStr !== '0') {
                console.log(`✅ FOUND FUNDS on ${acc.name}! Using this account.`);
                deployer = key;
                break;
            }
        } catch (e) {
            console.log(`   error checking ${acc.name}: ${e.message}`);
        }
    }

    if (!deployer) {
        console.error('❌ No funds found on any derived account.');
        await api.disconnect();
        process.exit(1);
    }

    console.log(`\n🚀 Proceeding with deployer: ${deployer.address}`);

    // CONFIG: Set to null to force new deploy, or string address to reuse
    const FIXED_STAKING_ADDR = null;
    const FIXED_GOV_ADDR = null;

    // Paths
    const stakingPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_staking/fiapo_staking.contract');
    const govPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.contract');

    try {
        if (!fs.existsSync(stakingPath) || !fs.existsSync(govPath)) {
            throw new Error("Artifacts not found. Please build contracts first.");
        }

        const stakingJson = JSON.parse(fs.readFileSync(stakingPath, 'utf8'));
        const govJson = JSON.parse(fs.readFileSync(govPath, 'utf8'));

        let stakingAddr = FIXED_STAKING_ADDR;
        let govAddr = FIXED_GOV_ADDR;

        // 1. Deploy Staking (if needed)
        if (!stakingAddr) {
            const res = await deployContract(api, deployer, 'Staking V2', stakingPath, 'new', [deployer.address]);
            stakingAddr = res.address;
        } else {
            console.log(`Reusing Staking: ${stakingAddr}`);
        }

        // 2. Deploy Governance (if needed)
        if (!govAddr) {
            const res = await deployContract(api, deployer, 'Governance V2.1 (u32 return)', govPath, 'new', [deployer.address]);
            govAddr = res.address;
        } else {
            console.log(`Reusing Governance: ${govAddr}`);
        }

        // 3. Link Contracts

        // Staking: set_linked_contracts(oracle, affiliate, rewards, team, burn) -> 5 args
        await callContract(api, deployer, stakingAddr, stakingJson, 'setLinkedContracts',
            [null, null, deployer.address, deployer.address, deployer.address], 'Staking -> Set Linked');

        // Governance: set_linked_contracts(staking, rewards, oracle, team) -> 4 args
        await callContract(api, deployer, govAddr, govJson, 'setLinkedContracts',
            [stakingAddr, null, null, null], 'Governance -> Set Linked');

        // 4. Test Staking Ping Directly
        console.log('\n🧪 Testing Staking Ping directly (RPC)...');
        const stakingContract = new ContractPromise(api, stakingJson, stakingAddr);
        const origin = deployer.address;

        // Shared limits
        const hugeGas = api.registry.createType('WeightV2', {
            refTime: 50_000_000_000n,
            proofSize: 3_000_000n,
        });
        const hugeStorage = api.registry.createType('Balance', 100_000_000_000_000n);

        try {
            const { result: pingResult, output: pingOutput } = await stakingContract.query.ping(
                origin,
                { gasLimit: hugeGas, storageDepositLimit: hugeStorage }
            );

            console.log('Direct Ping Result:', JSON.stringify(pingResult.toHuman()));
            console.log('Direct Ping Output:', pingOutput ? pingOutput.toHuman() : 'null');
        } catch (e) {
            console.error('❌ Direct Ping Failed:', e);
        }

        // 5. Execute Cross-Contract Call (test_ping)
        console.log('\n🧪 Executing Cross-Contract Call (RPC query)...');
        const govContract = new ContractPromise(api, govJson, govAddr);

        const gasLimitQuery = api.registry.createType('WeightV2', {
            refTime: 20_000_000_000n,
            proofSize: 1_000_000n,
        });
        const storageDepositLimit = api.registry.createType('Balance', 50_000_000_000_000n); // 500 LUNES safe limit

        // Find query method
        let queryMethod = govContract.query.testPing;
        if (!queryMethod) {
            queryMethod = govContract.query.test_ping;
        }

        if (!queryMethod) {
            throw new Error("testPing Query method not found.");
        }

        const { result, output } = await queryMethod(deployer.address, { gasLimit: hugeGas, storageDepositLimit: hugeStorage });

        console.log(`\nResult: ${JSON.stringify(result.toHuman())}`);
        console.log(`Output: ${output ? output.toHuman() : 'null'}`);

        if (result.isOk && output) {
            const value = output.toJSON();
            console.log(`Decoded Output JSON: ${JSON.stringify(value)}`);

            // Expected output is 123 (u32)
            if (value === 123 || value === '123' || (value && value.ok === 123) || (typeof value === 'object' && value.ok && value.ok.ok === 123)) {
                console.log('✅✅✅ CROSS-CONTRACT CALL SUCCEEDED ON MAINNET! ✅✅✅');
            } else {
                console.log('❌ Unexpected output value.');
            }
        } else {
            console.error('❌ Call failed or trapped on Mainnet.');
            if (result.asErr) {
                console.error('Error:', result.asErr.toHuman());
            }
        }

    } catch (e) {
        console.error('❌ Mainnet Test Failed:', e);
    } finally {
        await api.disconnect();
    }
}

main().catch(console.error);
