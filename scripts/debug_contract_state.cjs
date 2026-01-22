const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

async function main() {
    // Load addresses
    const deployPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    if (!fs.existsSync(deployPath)) {
        console.error('Deploy file not found');
        return;
    }
    const addresses = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
    const icoAddress = addresses.ico;

    // Load ABI
    const icoPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json');
    const icoAbi = JSON.parse(fs.readFileSync(icoPath, 'utf8'));

    // Init API
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });

    // Signer
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    console.log('--- Debugging Contract State ---');
    console.log(`ICO Address: ${icoAddress}`);

    const contract = new ContractPromise(api, icoAbi, icoAddress);
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 10000000000,
        proofSize: 10000000,
    });

    // Query 1: get_ico_nft_configs
    console.log('\nScanning NFT Configs...');
    const { result, output } = await contract.query.getIcoNftConfigs(alice.address, { gasLimit });

    if (result.isOk && output) {
        const data = output.toHuman();
        console.log('Raw Config Data:', JSON.stringify(data, null, 2));

        const items = data.Ok || data;
        if (Array.isArray(items)) {
            items.forEach((item, idx) => {
                console.log(`Tier ${idx + 1}: Minted=${item.minted}, Evolution=${item.mintedEvolution || item.minted_evolution}`);
            });
        }
    } else {
        console.error('Failed to query configs');
    }

    // Query 2: get_user_nfts for Alice
    console.log('\nScanning User NFTs (Alice)...');
    const { result: r2, output: o2 } = await contract.query.getUserNfts(alice.address, { gasLimit }, alice.address);
    if (r2.isOk && o2) {
        console.log('User NFTs:', JSON.stringify(o2.toHuman(), null, 2));
    }

    process.exit(0);
}

main().catch(console.error);
