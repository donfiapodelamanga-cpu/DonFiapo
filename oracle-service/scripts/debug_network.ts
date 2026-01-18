
import { ApiPromise, WsProvider } from '@polkadot/api';

const RPC_URL = 'wss://ws.lunes.io';
const TARGET_ADDRESS = '5Hb7quTKJ9WmKDJQcHC8SMriuzBMwgEDJR2YPHnMXwkTAAyQ';

async function main() {
    console.log(`Connecting to ${RPC_URL}...`);
    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });

    console.log('Connected!');

    // 1. Decode Error Module 24, Error 2
    // Note: indices can shift, so we rely on what the api sees now.
    console.log('\n--- Decoding Error ---');
    try {
        // List all modules to find index 24
        let module24: any = null;
        let found = false;

        // api.runtimeMetadata.asV14.pallets...
        // The structure depends on metadata version, usually V14.
        // We can iterate via api.registry.metadata.pallets

        for (const pallet of api.registry.metadata.pallets) {
            if (pallet.index.toNumber() === 24) {
                console.log(`Found Module 24: ${pallet.name.toString()}`);
                module24 = pallet;
                found = true;

                // Try to find error 2
                if (pallet.errors.isSome) {
                    const errors = pallet.errors.unwrap();
                    // Errors are usually an Enum in V14, but we need type definition
                    // The easiest way is to use registry to find error meta
                    // But let's look at the type def if possible or just print we found module
                }
            }
        }

        if (found) {
            // Try to verify what Error 2 is
            const metadata = api.runtimeMetadata.asLatest;
            const pallet = metadata.pallets.find((p) => p.index.eq(24));
            if (pallet && pallet.errors.isSome) {
                const errorVariant = api.registry.lookup.getSiType(pallet.errors.unwrap().type).def.asVariant;
                const error2 = errorVariant.variants.find((v) => v.index.eq(2));
                if (error2) {
                    console.log(`Error 2 in Module 24 is: ${error2.name.toString()}`);
                    console.log(`Docs: ${error2.docs.join(' ')}`);
                } else {
                    console.log('Error index 2 not found in module variants.');
                }
            }

        } else {
            console.log('Module 24 not found in metadata.');
        }

    } catch (e) {
        console.error('Error decoding:', e);
    }

    // 2. Check Native Balance
    console.log('\n--- Native Balance (LUNES) ---');
    try {
        const { data: { free, reserved, frozen } } = await api.query.system.account(TARGET_ADDRESS) as any;
        console.log(`Address: ${TARGET_ADDRESS}`);
        console.log(`Free: ${free.toString()}`);
        console.log(`Reserved: ${reserved.toString()}`);
        console.log(`Frozen: ${frozen?.toString() || '0'}`);
    } catch (e) {
        console.error('Failed to query balance:', e);
    }

    process.exit(0);
}

main().catch(console.error);
