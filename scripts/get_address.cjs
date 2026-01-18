const { Keyring } = require('@polkadot/keyring');
const { cryptoWaitReady } = require('@polkadot/util-crypto');

async function main() {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 }); // 42 is generic Substrate, Lunes might use a specific prefix but 42 is usually safe for generic format check or I should check Lunes prefix. 
    // Lunes prefix is usually 42 or specific. Let's assume generic first or check config.
    // Actually, checking previous config.ts might reveal ss58 or prefix.

    const mnemonic = "soon warrior disorder inner sight lemon rival one pulse bronze melody wagon";
    const pair = keyring.addFromUri(mnemonic);

    console.log('Address (SS58: 42):', pair.address);

    // Also print with other prefixes if needed
    keyring.setSS58Format(42);
    console.log('Address (Generic Substrate):', pair.address);
}

main().catch(console.error);
