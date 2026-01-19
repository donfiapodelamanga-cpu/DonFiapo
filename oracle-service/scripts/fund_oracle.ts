
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const RPC_URL = 'ws://127.0.0.1:9944';
const TARGET_ADDRESS = '5Hb7quTKJ9WmKDJQcHC8SMriuzBMwgEDJR2YPHnMXwkTAAyQ';
const AMOUNT = 100 * (10 ** 8); // 100 LUNES (assuming 8 decimals)

async function main() {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });

    // Alice is a well-known development account
    const alice = keyring.addFromUri('//Alice');

    console.log(`Connecting to ${RPC_URL}...`);
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });

    console.log(`Funding ${TARGET_ADDRESS} with ${AMOUNT / (10 ** 8)} LUNES...`);

    const transfer = api.tx.balances.transferKeepAlive(TARGET_ADDRESS, AMOUNT);

    const hash = await transfer.signAndSend(alice);

    console.log(`Transfer successful with hash: ${hash.toHex()}`);

    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
