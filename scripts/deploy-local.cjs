/**
 * Deploy Don Fiapo Contract to Local Testnet
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED || '//Alice';

// Team wallet for constructor args
const TEAM_WALLET = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Alice

async function main() {
  console.log('🚀 Deploying Don Fiapo Contract...\n');
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Deployer: ${DEPLOYER_SEED}\n`);

  // Connect to node
  const provider = new WsProvider(RPC_URL);
  const api = await ApiPromise.create({ provider });

  console.log(`✅ Connected to ${(await api.rpc.system.chain()).toString()}`);
  console.log(`   Block: #${(await api.rpc.chain.getHeader()).number.toNumber()}\n`);

  // Load contract
  const contractPath = path.join(__dirname, '../don_fiapo/target/ink/don_fiapo_contract.contract');
  
  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract not found: ${contractPath}`);
  }

  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  console.log('✅ Contract loaded');

  // Setup deployer account
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(DEPLOYER_SEED);
  console.log(`   Deployer: ${deployer.address}`);

  // Check balance
  const { data: balance } = await api.query.system.account(deployer.address);
  console.log(`   Balance: ${balance.free.toString()}\n`);

  if (balance.free.toBigInt() === 0n) {
    throw new Error('Deployer has no balance. Fund the account first.');
  }

  // Create code instance
  const code = new CodePromise(api, contractJson, contractJson.source.wasm);

  // Constructor args for 'new':
  // name, symbol, initial_supply, burn_wallet, team_wallet, staking_wallet, rewards_wallet, initial_oracles
  const INITIAL_SUPPLY = '300000000000000000000'; // 300 billion * 10^8
  
  console.log('📝 Instantiating contract...');
  console.log(`   Name: Don Fiapo`);
  console.log(`   Symbol: FIAPO`);
  console.log(`   Supply: ${INITIAL_SUPPLY}`);
  console.log(`   Team Wallet: ${TEAM_WALLET}\n`);

  // Gas limit
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: 100_000_000_000n,
    proofSize: 1_000_000n,
  });

  const storageDepositLimit = null;

  // Deploy
  const tx = code.tx.new(
    { gasLimit, storageDepositLimit },
    'Don Fiapo',      // name
    'FIAPO',          // symbol  
    INITIAL_SUPPLY,   // initial_supply
    TEAM_WALLET,      // burn_wallet
    TEAM_WALLET,      // team_wallet
    TEAM_WALLET,      // staking_wallet
    TEAM_WALLET,      // rewards_wallet
    [TEAM_WALLET]     // initial_oracles
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(deployer, ({ contract, status, dispatchError }) => {
      if (status.isInBlock || status.isFinalized) {
        if (dispatchError) {
          let errorMsg = 'Unknown error';
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
          }
          console.error('❌ Deploy failed:', errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        if (contract) {
          console.log('\n✅ Contract deployed successfully!');
          console.log('═══════════════════════════════════════════');
          console.log(`CONTRACT_ADDRESS=${contract.address.toString()}`);
          console.log('═══════════════════════════════════════════\n');
          
          console.log('Next steps:');
          console.log('1. Update your .env with the new CONTRACT_ADDRESS');
          console.log('2. Restart oracle-service');
          
          resolve(contract.address.toString());
        }
      }
    }).catch(reject);
  }).finally(() => {
    api.disconnect();
  });
}

main().catch(console.error);
