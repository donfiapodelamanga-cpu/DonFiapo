const { ApiPromise, WsProvider } = require('@polkadot/api');

async function main() {
    const wsProvider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider: wsProvider });
    console.log('Connected to node');

    const contractAddress = '5CRNuJbuTeQPcwJdEoDWRXZnNdkTSnArEfHEXrt5gZqszF5i';

    // Check if contract exists
    const contractInfo = await api.query.contracts.contractInfoOf(contractAddress);
    console.log('Contract exists:', !contractInfo.isEmpty);
    if (!contractInfo.isEmpty) {
        console.log('Contract info:', JSON.stringify(contractInfo.toHuman(), null, 2));
    } else {
        console.log('CONTRACT NOT DEPLOYED AT THIS ADDRESS!');
    }

    await api.disconnect();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
