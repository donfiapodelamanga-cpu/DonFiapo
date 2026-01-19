
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = 'ws://127.0.0.1:9944';
// Use address from .env if possible
const CONTRACT_ADDRESS = '5CRNuJbuTeQPcwJdEoDWRXZnNdkTSnArEfHEXrt5gZqszF5i';

async function main() {
    console.log(`Connecting to ${RPC_URL}...`);
    const provider = new WsProvider(RPC_URL, 5000);
    const api = await ApiPromise.create({ provider });
    console.log('Connected to Api!');

    const metadataPath = path.resolve(__dirname, '../../don_fiapo/target/ink/don_fiapo_contract.json');
    console.log('Loading metadata from:', metadataPath);
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    const contract = new ContractPromise(api, metadata, CONTRACT_ADDRESS);
    console.log('Contract instance created for:', CONTRACT_ADDRESS);

    console.log('\n--- Querying getIcoStats ---');
    try {
        const { result, output } = await contract.query.getIcoStats(
            CONTRACT_ADDRESS,
            {
                gasLimit: api.registry.createType('WeightV2', { refTime: 20000000000, proofSize: 2000000 }) as any,
                storageDepositLimit: null
            }
        );

        if (result.isOk && output) {
            const data = output.toHuman() as any;
            console.log('ICO Stats structure:', JSON.stringify(Object.keys(data.Ok || {}), null, 2));
            console.log('Full ICO Stats:', JSON.stringify(data, null, 2));
        } else {
            console.error('Query Result Error:', result.toHuman());
        }
    } catch (e) {
        console.error('Query execution failed:', e);
    }

    await api.disconnect();
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
