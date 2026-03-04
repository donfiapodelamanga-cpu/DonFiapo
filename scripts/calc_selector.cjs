const { blake2AsU8a } = require('@polkadot/util-crypto');
const { u8aToHex } = require('@polkadot/util');

const selector = u8aToHex(blake2AsU8a('ping', 256).slice(0, 4));
console.log(`ping selector: ${selector}`);

const selectorGet = u8aToHex(blake2AsU8a('get_user_positions', 256).slice(0, 4));
console.log(`get_user_positions selector: ${selectorGet}`);
