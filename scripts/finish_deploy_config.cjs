/**
 * Finish Deploy Config Script
 * 
 * Completes the ecosystem configuration that failed during deploy_ecosystem.cjs.
 * Addresses are taken from the last successful deploy run.
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED || '//Alice';

// Addresses from the last deploy run (2026-01-22)
const ADDRESSES = {
    core: '5HH71bSgjfVSit1C4QaaEBmn4requbMYGSBQ4M4jYrLrTanY',
    staking: '5FfYbPzeQa33rZYKtVwBB7XuQP9bqaNCa3Jpfmp1VmiyLgne',
    oracle: '5Gw81pyfVZZPEd5wXE7KjfCb3EhRi6X128sghxgk2nK3QtaX',
    ico: '5EBqS1P78MZizwBdz9Azkv6V4RwZ2brudwpEheuCUb4n8TfL',
    marketplace: '5FHxbkEk22He5qVhapradzjqC6eZ4XaNbrWK2yX9ZH4HKkVR',
    lottery: '5Fa47LvqxJPzJopXEy4NcTsyJtPdfDvyYuTimjZ1j3YssN2j',
    spin_game: '5DRAFn9axzHPNJra5ZwzhA8vxEq36iSxiio6FMgg8mFKAC5q',
    airdrop: '5CuWUyCAD7homWnTfZCMFGuLwYWCsaH2PfkGeAR61TuRSL43',
    rewards: '5FkzDbbc9UoAGFCyf4RieYWVvAg5wBv58Jr1tAMyhsRW4TvM',
    affiliate: '5D8cVv8VLMvaTeffvf8anWfoyg9cU9rtrxejoB4L9b3V61JM',
    governance: '5CrN7rHAsgbR9iChHVyqZAKSTUetKBwWt8ZmzThVgAfJf2kJ',
    security: '5HciDk59TpAUZneUxzyj5rSTr8yvF5bCNMZgXEHVYWnt5nCX',
    timelock: '5CcLctQkgwbvNiAtukXkwXfdwBCu1AskSmSVFQnryers1Q9L',
    upgrade: '5D54SBdizxJCaWJ3hWX1rGSe8hoj81AJetwuNexkbrCTCrmh',
};

async function callContract(api, deployer, contractAddress, abi, method, args, label) {
    console.log(`\n⚙️  Configuring ${label || method}...`);
    const contract = new ContractPromise(api, abi, contractAddress);
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    // Handle PSP22 trait methods (e.g., psp22::transfer -> PSP22::transfer in camelCase)
    let txMethod = contract.tx[method];
    if (!txMethod) {
        // Try camelCase conversion
        const camelMethod = method.replace(/::/g, '');
        txMethod = contract.tx[camelMethod];
    }
    if (!txMethod) {
        // Try snake_case with module prefix (e.g., psp22Transfer)
        const snakeMethod = method.replace(/::/g, '_');
        txMethod = contract.tx[snakeMethod];
    }
    if (!txMethod) {
        console.error(`❌ Method ${method} not found in contract ABI`);
        console.log('Available methods:', Object.keys(contract.tx));
        throw new Error(`Method ${method} not found`);
    }

    const tx = txMethod(
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
    console.log('🔧 Finishing Ecosystem Configuration...\n');
    console.log(`RPC: ${RPC_URL}`);

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);

    console.log(`✅ Connected as ${deployer.address}\n`);

    // Load ABIs
    const coreAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_core/fiapo_core.contract'), 'utf8'));
    const oracleAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_oracle_multisig/fiapo_oracle_multisig.contract'), 'utf8'));
    const icoAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.contract'), 'utf8'));
    const marketplaceAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_marketplace/fiapo_marketplace.contract'), 'utf8'));
    const lotteryAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_lottery/fiapo_lottery.contract'), 'utf8'));

    console.log('💰 Seeding Treasuries (Fixed Supply Distribution)...');

    // PSP22 uses 'transfer' method directly (not psp22::transfer in tx namespace)
    // The ABI should have it as 'transfer' after generation
    const STAKING_SEED = '24000000000000000000'; // 240B Paws
    const ICO_SEED = '600000000000000000';   // 6B Paws
    const AIRDROP_SEED = '2100000000000000000';  // 21B Paws
    const REWARDS_SEED = '100000000000000000';   // 1B Paws

    try {
        // Use exact method name from ABI introspection
        await callContract(api, deployer, ADDRESSES.core, coreAbi, 'ipsp22::transfer', [ADDRESSES.staking, STAKING_SEED, []], 'Seeding: Staking Treasury');
    } catch (e) {
        console.warn('Staking seed failed:', e.message);
    }

    try {
        await callContract(api, deployer, ADDRESSES.core, coreAbi, 'ipsp22::transfer', [ADDRESSES.ico, ICO_SEED, []], 'Seeding: ICO Treasury');
    } catch (e) {
        console.warn('ICO seed failed:', e.message);
    }

    try {
        await callContract(api, deployer, ADDRESSES.core, coreAbi, 'ipsp22::transfer', [ADDRESSES.airdrop, AIRDROP_SEED, []], 'Seeding: Airdrop Treasury');
    } catch (e) {
        console.warn('Airdrop seed failed:', e.message);
    }

    try {
        await callContract(api, deployer, ADDRESSES.core, coreAbi, 'ipsp22::transfer', [ADDRESSES.rewards, REWARDS_SEED, []], 'Seeding: Rewards Treasury');
    } catch (e) {
        console.warn('Rewards seed failed:', e.message);
    }

    console.log('\n🔗 Configuring Contract Links...');

    // Oracle: Set Contracts
    await callContract(api, deployer, ADDRESSES.oracle, oracleAbi, 'setContractAddress', ['ico', ADDRESSES.ico], 'Oracle -> ICO');
    await callContract(api, deployer, ADDRESSES.oracle, oracleAbi, 'setContractAddress', ['staking', ADDRESSES.staking], 'Oracle -> Staking');
    await callContract(api, deployer, ADDRESSES.oracle, oracleAbi, 'setContractAddress', ['lottery', ADDRESSES.lottery], 'Oracle -> Lottery');
    await callContract(api, deployer, ADDRESSES.oracle, oracleAbi, 'setContractAddress', ['spin_game', ADDRESSES.spin_game], 'Oracle -> Spin Game');
    await callContract(api, deployer, ADDRESSES.oracle, oracleAbi, 'setContractAddress', ['governance', ADDRESSES.governance], 'Oracle -> Governance');

    // ICO: Set Dependencies
    await callContract(api, deployer, ADDRESSES.ico, icoAbi, 'setOracleContract', [ADDRESSES.oracle], 'ICO -> Oracle');
    await callContract(api, deployer, ADDRESSES.ico, icoAbi, 'setMarketplaceContract', [ADDRESSES.marketplace], 'ICO -> Marketplace');

    // Marketplace: Set Staking
    await callContract(api, deployer, ADDRESSES.marketplace, marketplaceAbi, 'setStakingContract', [ADDRESSES.staking], 'Marketplace -> Staking');

    // Lottery: Set Oracle
    await callContract(api, deployer, ADDRESSES.lottery, lotteryAbi, 'setOracleContract', [ADDRESSES.oracle], 'Lottery -> Oracle');

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Configuration Complete!');
    console.log('═══════════════════════════════════════════\n');

    // Save updated addresses to JSON
    const info = {
        date: new Date().toISOString(),
        ...ADDRESSES,
        network: 'Local Testnet'
    };
    fs.writeFileSync(path.join(__dirname, 'last_deploy_ecosystem.json'), JSON.stringify(info, null, 2));
    console.log('✅ Deployment info saved to scripts/last_deploy_ecosystem.json');

    await api.disconnect();
}

main().catch(console.error);
