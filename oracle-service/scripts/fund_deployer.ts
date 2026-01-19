
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const RPC_URL = 'ws://127.0.0.1:9944';
const DEPLOYER_SEED = 'service slush crane heavy view hello also carpet bid spot whip puppy';
const AMOUNT = 1000 * (10 ** 8); // 1000 LUNES for many deploys

async function main() {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });

    const alice = keyring.addFromUri('//Alice');
    const deployer = keyring.addFromUri(DEPLOYER_SEED);
    const deployerAddress = deployer.address;

    console.log(`Deployer Address: ${deployerAddress}`);
    console.log(`Connecting to ${RPC_URL}...`);
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });

    console.log(`Funding ${deployerAddress} with ${AMOUNT / (10 ** 8)} LUNES...`);

    const transfer = api.tx.balances.transferKeepAlive(deployerAddress, AMOUNT);

    const hash = await transfer.signAndSend(alice);

    console.log(`Transfer successful with hash: ${hash.toHex()}`);

    // Wait 5 seconds for block inclusion
    await new Promise(resolve => setTimeout(resolve, 5000));

    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
