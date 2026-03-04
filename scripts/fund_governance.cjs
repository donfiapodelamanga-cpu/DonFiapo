
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'ws://127.0.0.1:9944';

async function main() {
    console.log('💰 Funding Governance Contract...\n');
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    const deployInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'last_deploy_ecosystem.json'), 'utf8'));
    const govAddr = deployInfo.governance;

    console.log(`Sending 10,000 Units to: ${govAddr}`);

    const tx = api.tx.balances.transfer(govAddr, 10_000_000_000_000n);

    await new Promise((resolve, reject) => {
        tx.signAndSend(alice, ({ status, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
                if (dispatchError) {
                    console.error('❌ Transfer failed');
                    reject(new Error('Transfer failed'));
                    return;
                }
                console.log('✅ Transfer successful');
                resolve();
            }
        }).catch(reject);
    });

    await api.disconnect();
}

main().catch(console.error);
