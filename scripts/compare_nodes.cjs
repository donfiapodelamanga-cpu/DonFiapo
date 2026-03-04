const { ApiPromise, WsProvider } = require('@polkadot/api');

async function main() {
    // Check Mainnet
    const mainnetProvider = new WsProvider('wss://ws.lunes.io');
    const mainnetApi = await ApiPromise.create({ provider: mainnetProvider });

    console.log('--- Lunes Mainnet ---');
    const systemName = await mainnetApi.rpc.system.name();
    const systemVersion = await mainnetApi.rpc.system.version();
    const runtimeVersion = mainnetApi.runtimeVersion;

    console.log(`System Name: ${systemName}`);
    console.log(`System Version: ${systemVersion}`);
    console.log(`Runtime Version: ${runtimeVersion.specVersion}`);
    console.log(`Impl Version: ${runtimeVersion.implVersion}`);
    console.log(`Spec Name: ${runtimeVersion.specName}`);

    await mainnetApi.disconnect();

    // Check Local
    const localProvider = new WsProvider('ws://127.0.0.1:9944');
    const localApi = await ApiPromise.create({ provider: localProvider });

    console.log('\n--- Local Node ---');
    console.log(`System Version: ${await localApi.rpc.system.version()}`);
    console.log(`Runtime Version: ${localApi.runtimeVersion.specVersion}`);

    await localApi.disconnect();
}

main().catch(console.error);
