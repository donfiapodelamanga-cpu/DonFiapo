/**
 * Deploy remaining contracts (Governance, Timelock, Upgrade)
 * and save complete ecosystem JSON
 */
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';
const TEAM_WALLET = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

// Already deployed from previous run (command 2187)
const deployed = {
    core: '5DTAHYWsLz45Mbi9eWiF3UYFubW8tUyqHwPdPy7bSTTFYb5t',
    staking: '5F8vW4fJvN1X6dSq8LgznEYEd4Uatt5iPLp2XWycfTkMLL49',
    oracle: '5FgpndqKWktACn35rSKcFNmtfc2Hr7ksAZHGR82eA6mwS8P5',
    security: '5Dwqomf6GySbqcVBY2juF4PfAqFHmb8CPvi1d7YrBBvCH6vw',
    ico: '5H6vPyvUa1X6WyfeGo8ELDLXSaHDzJDbjLLdSkLKwSpZRcVm',
    lottery: '5GAUkmVwMXqkWY78pBzgW6Z1biAnvFS53oQy29r5WrnjB9wh',
    spin_game: '5CFG6q5YgbE7fnxrKt9A8ZGYiS4eLgYFzrj8FogD8wkYucCL',
    marketplace: '5Fqw1mbiTZd2EavZYNAjGP9RhdA1AXPeFYJzY1uHC5Nvoeor',
    airdrop: '5GxSf6Z9MGjEeLtaL5u2UzrcqVeM94gQKK62c3GoZGQowpH2',
    rewards: '5DMFkQ1j96HFSUmgHbixdLm7GvbjVqw7mMUADPTtVmeRj1rK',
    affiliate: '5Ei4UZX5osRUJESJ8Xz21EKJeVKQ4qAGr3YpypEgMNtxxApK',
    noble_affiliate: '5GYbg7bad16SLQRaCBZhVpR175eCyPmvVbtiAfMzwot9WgZV',
    nft_collections: '5Fvh9qBKPCLMBxCZHWQbKGstoiVg4t6eUi79Xvs2U4pqowXk',
};

async function deployOne(api, deployer, artifactPath, args, label) {
    console.log(`\n📦 Deploying ${label}...`);
    const contractJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const code = new CodePromise(api, contractJson, contractJson.source.wasm);
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n, proofSize: 1_000_000n,
    });
    const tx = code.tx.new({ gasLimit, storageDepositLimit: null }, ...args);

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, ({ contract, status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    let msg = 'Unknown';
                    if (dispatchError.isModule) {
                        const d = api.registry.findMetaError(dispatchError.asModule);
                        msg = `${d.section}.${d.name}`;
                    }
                    reject(new Error(msg));
                } else if (contract) {
                    console.log(`✅ ${label} deployed at: ${contract.address.toString()}`);
                    resolve(contract.address.toString());
                }
            }
        }).catch(reject);
    });
}

async function main() {
    console.log('🚀 Deploying remaining contracts...\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri('//Alice');
    console.log(`✅ Connected as ${deployer.address}\n`);

    const base = path.join(__dirname, '../don_fiapo/target/ink');

    // Deploy Governance (1 arg: core_contract)
    deployed.governance = await deployOne(api, deployer,
        `${base}/fiapo_governance/fiapo_governance.contract`,
        [deployed.core], 'Governance');

    // Deploy Timelock (1 arg: initial_admins Vec)
    deployed.timelock = await deployOne(api, deployer,
        `${base}/fiapo_timelock/fiapo_timelock.contract`,
        [[deployer.address]], 'Timelock');

    // Deploy Upgrade (2 args: initial_approvers Vec, min_approvals u32)
    deployed.upgrade = await deployOne(api, deployer,
        `${base}/fiapo_upgrade/fiapo_upgrade.contract`,
        [[deployer.address], 1], 'Upgrade');

    // Save complete JSON
    const info = {
        date: new Date().toISOString(),
        ...deployed,
        network: 'Local Testnet'
    };
    fs.writeFileSync(path.join(__dirname, 'last_deploy_ecosystem.json'), JSON.stringify(info, null, 2));
    console.log('\n✅ All addresses saved to last_deploy_ecosystem.json');

    // Print summary
    console.log('\n═══════════════════════════════════════════');
    for (const [k, v] of Object.entries(deployed)) {
        console.log(`${k.toUpperCase()}: ${v}`);
    }
    console.log('═══════════════════════════════════════════');

    await api.disconnect();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
