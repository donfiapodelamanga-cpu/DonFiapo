/**
 * Deploy Don Fiapo Ecosystem (All Contracts)
 * 
 * Order of Operation:
 * 1. Deploy Core (Base)
 * 2. Deploy Staking (Depends on Core)
 * 3. Deploy Oracle Multisig (Independent Service)
 * 4. Deploy Security (Independent Service)
 * 5. Deploy ICO (Depends on Core)
 * 6. Deploy Lottery (Depends on Core)
 * 7. Deploy Spin Game (Depends on Oracle)
 * 8. Deploy Marketplace (Depends on Core, ICO)
 * 9. Deploy Airdrop (Depends on Core)
 * 10. Deploy Rewards (Depends on Core)
 * 11. Deploy Affiliate (Depends on Core)
 * 12. Deploy Governance (Depends on Core)
 * 13. Deploy Timelock (Service)
 * 14. Deploy Upgrade (Service)
 * 
 * Post-Deployment Configuration:
 * - Authorize Minters on Core (Staking, ICO, Airdrop, Rewards)
 * - Configure Oracle known contracts
 * - Configure ICO dependencies (Oracle, Marketplace)
 * - Configure Marketplace dependencies (Staking)
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise, ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED || '//Alice';
const TEAM_WALLET = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Alice

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

function getArtifactPath(contractName) {
    // Standard path structure: don_fiapo/target/ink/fiapo_{name}/fiapo_{name}.contract
    // Exception: spin_game -> royal_wheel? No, usually folder name matches.
    // Let's assume standard snake_case "fiapo_" prefix.
    const snakeName = contractName.replace(/-/g, '_');
    const folderName = `fiapo_${snakeName}`;
    const fileName = `fiapo_${snakeName}.contract`;

    // Check exceptions if file not found
    let p = path.join(__dirname, `../don_fiapo/target/ink/${folderName}/${fileName}`);
    if (fs.existsSync(p)) return p;

    // Maybe without fiapo_ prefix?
    p = path.join(__dirname, `../don_fiapo/target/ink/${snakeName}/${snakeName}.contract`);
    if (fs.existsSync(p)) return p;

    // Maybe royal_wheel for spin_game
    if (contractName === 'spin_game') {
        p = path.join(__dirname, `../don_fiapo/target/ink/spin_game/spin_game.contract`);
        if (fs.existsSync(p)) return p;
        p = path.join(__dirname, `../don_fiapo/target/ink/royal_wheel/royal_wheel.contract`);
        if (fs.existsSync(p)) return p;
        // Or fiapo_spin_game?
    }

    return p;
}

// Special check for artifacts names
function resolveArtifacts() {
    const map = {
        core: "fiapo_core",
        staking: "fiapo_staking",
        oracle_multisig: "fiapo_oracle_multisig",
        security: "fiapo_security",
        ico: "fiapo_ico",
        lottery: "fiapo_lottery",
        spin_game: "royal_wheel", // Check this?
        marketplace: "fiapo_marketplace",
        airdrop: "fiapo_airdrop",
        rewards: "fiapo_rewards",
        affiliate: "fiapo_affiliate",
        governance: "fiapo_governance",
        timelock: "fiapo_timelock",
        upgrade: "fiapo_upgrade"
    };
    return map;
}

async function main() {
    console.log('🚀 Deploying Don Fiapo Ecosystem...\n');
    console.log(`RPC: ${RPC_URL}`);

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOYER_SEED);

    console.log(`✅ Connected as ${deployer.address}\n`);

    // --- 1. CORE ---
    const INITIAL_SUPPLY = '30000000000000000000'; // 300 billion * 10^8
    const corePath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_core/fiapo_core.contract');
    const core = await deployContract(api, deployer, 'fiapo_core', corePath, 'new',
        ['Don Fiapo', 'FIAPO', INITIAL_SUPPLY, TEAM_WALLET, TEAM_WALLET, TEAM_WALLET, TEAM_WALLET], 'Core');

    // --- 2. STAKING ---
    const stakingPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_staking/fiapo_staking.contract');
    const staking = await deployContract(api, deployer, 'fiapo_staking', stakingPath, 'new',
        [core.address], 'Staking');

    // --- 3. ORACLE ---
    const oraclePath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_oracle_multisig/fiapo_oracle_multisig.contract');
    const oracle = await deployContract(api, deployer, 'fiapo_oracle_multisig', oraclePath, 'new',
        [[deployer.address], 1], 'Oracle Multisig'); // 1 confirmation (Alice)

    // --- 4. SECURITY ---
    const securityPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_security/fiapo_security.contract');
    const security = await deployContract(api, deployer, 'fiapo_security', securityPath, 'new',
        [], 'Security');

    // --- 5. ICO ---
    const icoPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.contract');
    const ico = await deployContract(api, deployer, 'fiapo_ico', icoPath, 'new',
        [core.address], 'ICO');

    // --- 6. LOTTERY ---
    const lotteryPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_lottery/fiapo_lottery.contract');
    const lottery = await deployContract(api, deployer, 'fiapo_lottery', lotteryPath, 'new',
        [core.address], 'Lottery');

    // --- 7. SPIN GAME ---
    // Artifact path logic handles 'spin_game' -> 'spin_game/spin_game.contract'
    let spinGame;
    try {
        spinGame = await deployContract(api, deployer, 'spin_game', getArtifactPath('spin_game'), 'new',
            [oracle.address], 'Spin Game');
    } catch (e) {
        // Fallback if name is different
        console.warn("Retrying Spin Game deployment...", e);
        const spinPath2 = path.join(__dirname, '../don_fiapo/target/ink/fiapo_spin_game/fiapo_spin_game.contract');
        spinGame = await deployContract(api, deployer, 'fiapo_spin_game', spinPath2, 'new',
            [oracle.address], 'Spin Game (Alt Name)');
    }

    // --- 8. MARKETPLACE ---
    const marketPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_marketplace/fiapo_marketplace.contract');
    const marketplace = await deployContract(api, deployer, 'fiapo_marketplace', marketPath, 'new',
        [core.address, ico.address], 'Marketplace');

    // --- 9. AIRDROP ---
    const airdropPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_airdrop/fiapo_airdrop.contract');
    const airdrop = await deployContract(api, deployer, 'fiapo_airdrop', airdropPath, 'new',
        [core.address], 'Airdrop');

    // --- 10. REWARDS ---
    const rewardsPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_rewards/fiapo_rewards.contract');
    const rewards = await deployContract(api, deployer, 'fiapo_rewards', rewardsPath, 'new',
        [core.address], 'Rewards');

    // --- 11. AFFILIATE ---
    const affiliatePath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_affiliate/fiapo_affiliate.contract');
    const affiliate = await deployContract(api, deployer, 'fiapo_affiliate', affiliatePath, 'new',
        [core.address], 'Affiliate');

    // --- 12. GOVERNANCE ---
    const governPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_governance/fiapo_governance.contract');
    const governance = await deployContract(api, deployer, 'fiapo_governance', governPath, 'new',
        [core.address, [deployer.address]], 'Governance');

    // --- 13. TIMELOCK ---
    const timelockPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_timelock/fiapo_timelock.contract');
    const timelock = await deployContract(api, deployer, 'fiapo_timelock', timelockPath, 'new',
        [[deployer.address]], 'Timelock');

    // --- 14. UPGRADE ---
    const upgradePath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_upgrade/fiapo_upgrade.contract');
    const upgrade = await deployContract(api, deployer, 'fiapo_upgrade', upgradePath, 'new',
        [[deployer.address], 1], 'Upgrade');


    console.log('\n🔗 Configuring Ecosystem Links...\n');

    // Core: Authorize Minters
    await callContract(api, deployer, core.address, core.abi, 'authorizeMinter', [staking.address], 'Core -> Staking (Minter)');
    await callContract(api, deployer, core.address, core.abi, 'authorizeMinter', [ico.address], 'Core -> ICO (Minter)');
    await callContract(api, deployer, core.address, core.abi, 'authorizeMinter', [airdrop.address], 'Core -> Airdrop (Minter)');
    await callContract(api, deployer, core.address, core.abi, 'authorizeMinter', [rewards.address], 'Core -> Rewards (Minter)');
    await callContract(api, deployer, core.address, core.abi, 'authorizeMinter', [affiliate.address], 'Core -> Affiliate (Minter)');

    // Oracle: Set Contracts
    await callContract(api, deployer, oracle.address, oracle.abi, 'setContractAddress', ['ico', ico.address], 'Oracle -> ICO');
    await callContract(api, deployer, oracle.address, oracle.abi, 'setContractAddress', ['staking', staking.address], 'Oracle -> Staking');
    await callContract(api, deployer, oracle.address, oracle.abi, 'setContractAddress', ['lottery', lottery.address], 'Oracle -> Lottery');
    await callContract(api, deployer, oracle.address, oracle.abi, 'setContractAddress', ['spin_game', spinGame.address], 'Oracle -> Spin Game');
    await callContract(api, deployer, oracle.address, oracle.abi, 'setContractAddress', ['governance', governance.address], 'Oracle -> Governance');

    // ICO: Set Dependencies
    await callContract(api, deployer, ico.address, ico.abi, 'setOracleContract', [oracle.address], 'ICO -> Oracle');
    await callContract(api, deployer, ico.address, ico.abi, 'setMarketplaceContract', [marketplace.address], 'ICO -> Marketplace');

    // Marketplace: Set Staking
    await callContract(api, deployer, marketplace.address, marketplace.abi, 'setStakingContract', [staking.address], 'Marketplace -> Staking');

    // Lottery: Set Oracle
    await callContract(api, deployer, lottery.address, lottery.abi, 'setOracleContract', [oracle.address], 'Lottery -> Oracle');

    console.log('\n═══════════════════════════════════════════');
    console.log(`CORE_ADDRESS=${core.address}`);
    console.log(`STAKING_ADDRESS=${staking.address}`);
    console.log(`ORACLE_ADDRESS=${oracle.address}`);
    console.log(`ICO_ADDRESS=${ico.address}`);
    console.log(`MARKETPLACE_ADDRESS=${marketplace.address}`);
    console.log(`LOTTERY_ADDRESS=${lottery.address}`);
    console.log(`SPIN_GAME_ADDRESS=${spinGame.address}`);
    console.log(`AIRDROP_ADDRESS=${airdrop.address}`);
    console.log(`REWARDS_ADDRESS=${rewards.address}`);
    console.log(`AFFILIATE_ADDRESS=${affiliate.address}`);
    console.log(`GOVERNANCE_ADDRESS=${governance.address}`);
    console.log(`SECURITY_ADDRESS=${security.address}`);
    console.log(`TIMELOCK_ADDRESS=${timelock.address}`);
    console.log(`UPGRADE_ADDRESS=${upgrade.address}`);
    console.log('═══════════════════════════════════════════\n');

    // Save to file
    const info = {
        date: new Date().toISOString(),
        core: core.address,
        staking: staking.address,
        oracle: oracle.address,
        ico: ico.address,
        marketplace: marketplace.address,
        lottery: lottery.address,
        spin_game: spinGame.address,
        airdrop: airdrop.address,
        rewards: rewards.address,
        affiliate: affiliate.address,
        governance: governance.address,
        security: security.address,
        timelock: timelock.address,
        upgrade: upgrade.address,
        network: 'Local Testnet'
    };
    fs.writeFileSync(path.join(__dirname, 'last_deploy_ecosystem.json'), JSON.stringify(info, null, 2));
    console.log('✅ Deployment info saved to scripts/last_deploy_ecosystem.json');

    await api.disconnect();
}

main().catch(console.error);
