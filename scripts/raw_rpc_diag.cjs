const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, hexToU8a, compactToU8a } = require('@polkadot/util');
const { decodeAddress } = require('@polkadot/util-crypto');

function clean(hex) {
    return hex.startsWith('0x') ? hex.slice(2) : hex;
}

async function main() {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });

    console.log('Connected to Local Node');

    const stakingAddr = '5FyNKb2mDrB9eTMa2SMasaaQprkeporkXC3nCL5yUsCzTbru';
    const AliceAddr = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

    const originHex = clean(u8aToHex(decodeAddress(AliceAddr)));
    const destHex = clean(u8aToHex(decodeAddress(stakingAddr)));
    const value = clean(u8aToHex(new Uint8Array(16))); // 128-bit LE zero

    // WeightV2 Option: 01 (Some) + compact(refTime) + compact(proofSize)
    const gasLimitHex = '01' + clean(u8aToHex(new Uint8Array([
        ...compactToU8a(50000000000n), // refTime
        ...compactToU8a(2000000n)      // proofSize
    ])));

    const storageDepositLimit = '00'; // None

    // Vec<u8> selector: compact(len) + hex
    const selector = 'f706af5c';
    const inputData = clean(u8aToHex(new Uint8Array([
        ...compactToU8a(4),
        ...hexToU8a('0x' + selector)
    ])));

    const callData = '0x' + originHex + destHex + value + gasLimitHex + storageDepositLimit + inputData;

    console.log(`\n📦 CLEAN CALL DATA: ${callData}`);

    try {
        console.log('Sending rpc.state.call("ContractsApi_call", ...)');
        const rawResult = await api.rpc.state.call('ContractsApi_call', callData);

        const rawHex = rawResult.toHex();
        console.log('\n✅ RPC RESPONSE RECEIVED!');
        console.log('Raw Hex:', rawHex);

        // Analyze bytes manually
        const bytes = rawResult.toU8a();
        console.log(`Byte Length: ${bytes.length}`);

        try {
            // In Lunes, if it's an older node, ContractExecResult might be different.
            const res = api.createType('ContractExecResult', rawResult);
            console.log('\nDecoded Result:', JSON.stringify(res.toHuman(), null, 2));
        } catch (de) {
            console.log('\n❌ Automatic Decode Error:', de.message);
        }

    } catch (e) {
        console.error('\n❌ RPC Call Failed:', e.message);
    }

    await api.disconnect();
}

main().catch(console.error);
