const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

async function main() {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });

    const ecoPath = path.join(__dirname, 'last_deploy_ecosystem.json');
    const ecosystem = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
    const icoAddr = ecosystem.ico;
    const icoAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../don_fiapo/target/ink/fiapo_ico/fiapo_ico.json'), 'utf8'));

    const ico = new ContractPromise(api, icoAbi, icoAddr);
    console.log('Available ICO Query Methods:');
    console.log(Object.keys(ico.query));

    await api.disconnect();
}
main().catch(console.error);
