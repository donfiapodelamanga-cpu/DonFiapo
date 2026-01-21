const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Deploying Fiapo Core Contract...');
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  console.log('✅ Connected to ' + (await api.rpc.system.chain()).toString());
  
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri('//Alice');
  console.log('   Deployer: ' + deployer.address);
  
  const balance = await api.query.system.account(deployer.address);
  console.log('   Balance: ' + balance.data.free.toString());
  
  const contractPath = path.join(__dirname, '../don_fiapo/target/ink/fiapo_core/fiapo_core.contract');
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  console.log('✅ Contract loaded (fiapo_core)');
  
  const code = new CodePromise(api, contractJson, contractJson.source.wasm);
  
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: 500000000000n,
    proofSize: 5000000n,
  });
  
  console.log('📝 Instantiating...');
  
  const INITIAL_SUPPLY = '30000000000000000000'; // 300 billion * 10^8 decimals
  const TEAM_WALLET = deployer.address;
  
  // fiapo_core: new(name, symbol, initial_supply, burn_wallet, team_wallet, staking_wallet, rewards_wallet)
  const tx = code.tx.new(
    { gasLimit, storageDepositLimit: null },
    'Don Fiapo',      // name
    'FIAPO',          // symbol
    INITIAL_SUPPLY,   // initial_supply
    TEAM_WALLET,      // burn_wallet
    TEAM_WALLET,      // team_wallet
    TEAM_WALLET,      // staking_wallet
    TEAM_WALLET       // rewards_wallet
  );
  
  await new Promise((resolve, reject) => {
    tx.signAndSend(deployer, ({ contract, status, dispatchError, events }) => {
      console.log('Status: ' + status.type);
      
      if (status.isInBlock || status.isFinalized) {
        if (dispatchError) {
          let errorMsg = dispatchError.toString();
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMsg = decoded.section + '.' + decoded.name;
          }
          console.error('❌ Error: ' + errorMsg);
          reject(new Error(errorMsg));
          return;
        }
        if (contract) {
          console.log('');
          console.log('════════════════════════════════════════════');
          console.log('✅ CONTRACT DEPLOYED!');
          console.log('CONTRACT_ADDRESS=' + contract.address.toString());
          console.log('════════════════════════════════════════════');
          resolve();
        }
      }
    }).catch(reject);
  });
  
  await api.disconnect();
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
