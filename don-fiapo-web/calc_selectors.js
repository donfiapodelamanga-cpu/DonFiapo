
const { blake2AsHex } = require('@polkadot/util-crypto');

const methods = [
    'mint_nft',
    'get_user_nfts',
    'claim_tokens',
    'stake_tokens',
    'unstake_tokens',
    'claim_mined_tokens', // Assuming this name from contract.ts
    'get_claimable_tokens'
];

methods.forEach(method => {
    // Ink! selectors are 4 bytes of the blake2-256 hash of the method name
    console.log(`${method}: ${blake2AsHex(method, 256).substring(0, 10)}`);
});
