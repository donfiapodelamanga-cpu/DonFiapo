const { ApiPromise, WsProvider } = require('@polkadot/api');

async function main() {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });

    console.log('Connected to Local Node');

    if (api.call.contractsApi && api.call.contractsApi.call) {
        console.log('\n--- ContractsApi.call Meta ---');
        const meta = api.call.contractsApi.call.meta;

        // Let's print the plain keys and the meta structure
        console.log('Keys:', Object.keys(meta));

        // In some versions it's 'method' and 'section'
        // Let's try to stringify the whole thing or individual parts
        try {
            console.log('Section:', meta.section.toString());
            console.log('Method:', meta.method.toString());

            // Try to find arguments in different places
            if (meta.params) {
                console.log('Params found:');
                meta.params.forEach(p => console.log(`  ${p.name}: ${p.type}`));
            } else if (meta.args) {
                console.log('Args found (raw):', meta.args.toString());
            }
        } catch (e) {
            console.log('Error inspecting meta details:', e.message);
        }

    } else {
        console.log('ContractsApi.call not found in JS API definitions.');
    }

    await api.disconnect();
}

main().catch(console.error);
