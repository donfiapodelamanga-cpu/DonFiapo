const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('🧪 Running Governance Security Tests...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });

    // Alice is the governor/deployer
    const alice = keyring.addFromUri('//Alice');
    // Bob has no staking
    const bob = keyring.addFromUri('//Bob');

    // Load deployment info
    const deployInfoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    const govAddress = deployInfo.governance;

    if (!govAddress) {
        throw new Error('Governance address not found in last_deploy_ecosystem.json');
    }

    const govAbiPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.json');
    const govAbi = JSON.parse(fs.readFileSync(govAbiPath, 'utf8'));
    const contract = new ContractPromise(api, govAbi, govAddress);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 10_000_000_000n,
        proofSize: 1_000_000n,
    });
    const storageDepositLimit = null;

    // --- TEST 1: Create Proposal without Staking (Bob) ---
    console.log('Test 1: Create Proposal without Staking (Bob)');
    try {
        const { result, output } = await contract.query.createProposal(
            bob.address,
            { gasLimit, storageDepositLimit },
            'Marketing',
            'Test Proposal',
            'random_tx_hash'
        );

        if (result.isOk) {
            const error = output.asErr;
            if (error && error.isStakingRequired) {
                console.log('✅ Correctly rejected: StakingRequired');
            } else if (error) {
                console.log('❌ Unexpected error outcome:', error.toHuman());
            } else {
                console.log('❌ Call succeeded but should have failed for Bob');
            }
        } else {
            console.log('❌ Dispatch Error:', result.asErr.toHuman());
        }
    } catch (e) {
        console.log('❌ Test failed with exception:', e.message);
    }

    // --- TEST 2: Vote without Staking (Bob) ---
    console.log('\nTest 2: Vote without Staking (Bob)');
    try {
        const { result, output } = await contract.query.vote(
            bob.address,
            { gasLimit, storageDepositLimit },
            0, // proposal_id
            'For',
            'random_tx_hash'
        );

        if (result.isOk) {
            const error = output.asErr;
            if (error && error.isStakingRequired) {
                console.log('✅ Correctly rejected: StakingRequired');
            } else if (error) {
                console.log('❌ Unexpected error outcome:', error.toHuman());
            } else {
                console.log('❌ Call succeeded but should have failed for Bob');
            }
        } else {
            console.log('❌ Dispatch Error:', result.asErr.toHuman());
        }
    } catch (e) {
        console.log('❌ Test failed with exception:', e.message);
    }

    // --- TEST 3: Staking Verification for Alice ---
    console.log('\nTest 3: Checking if Alice passes Staking check');
    // We can't call internal functions, but we can see if she gets past Staking check 
    // and fails at the next step (Oracle verification).
    try {
        const { result, output } = await contract.query.createProposal(
            alice.address,
            { gasLimit, storageDepositLimit },
            'Marketing',
            'Test Proposal',
            'random_tx_hash'
        );

        if (result.isOk) {
            const error = output.asErr;
            // If Alice gets past Staking check, she should fail at Oracle payment check
            if (error && error.isOraclePaymentNotConfirmed) {
                console.log('✅ Alice passed Staking Check but failed Oracle verification as expected.');
            } else if (error && error.isStakingRequired) {
                console.log('⚠️ Alice does not have active staking yet in this test session.');
            } else if (error) {
                console.log('❌ Unexpected error for Alice:', error.toHuman());
            } else {
                console.log('❌ Proposal creation succeeded unexpectedly without real USDT payment hash.');
            }
        } else {
            console.log('❌ Dispatch Error:', result.asErr.toHuman());
        }
    } catch (e) {
        console.log('❌ Test failed with exception:', e.message);
    }

    console.log('\n--- End of Tests ---');
    await api.disconnect();
}

main().catch(console.error);
