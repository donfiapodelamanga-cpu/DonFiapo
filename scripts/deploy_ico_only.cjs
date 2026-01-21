const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise, ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');

async function main() {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    // Read contract
    const contractFile = 'don_fiapo/target/ink/fiapo_ico/fiapo_ico.contract';
    const wasm = JSON.parse(fs.readFileSync(contractFile, 'utf8'));

    // Core contract address
    const coreContract = '5FJC4DtYiu6rPo9qvSdUJrybe26exSGhPoRvx1fB5QPBwdVS';

    console.log('Deploying ICO contract...');
    
    const code = new CodePromise(api, wasm, wasm.source.wasm);
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 100_000_000_000,
        proofSize: 10_000_000
    });
    
    const tx = code.tx.new({ gasLimit, storageDepositLimit: null }, coreContract);
    
    const address = await new Promise((resolve, reject) => {
        tx.signAndSend(alice, ({ status, contract, dispatchError }) => {
            if (dispatchError) {
                console.error('Error:', dispatchError.toString());
                reject(dispatchError);
            }
            if (status.isInBlock && contract) {
                console.log('ICO Contract deployed!');
                console.log('Address:', contract.address.toString());
                resolve(contract.address.toString());
            }
        });
    });

    // Update last_deploy_ecosystem.json
    const deployFile = 'scripts/last_deploy_ecosystem.json';
    const deployData = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    deployData.ico = address;
    deployData.date = new Date().toISOString();
    fs.writeFileSync(deployFile, JSON.stringify(deployData, null, 2));

    console.log('Updated last_deploy_ecosystem.json');
    
    await api.disconnect();
}

main().catch(console.error);
