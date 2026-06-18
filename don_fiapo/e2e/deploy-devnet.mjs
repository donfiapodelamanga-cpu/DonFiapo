// Deploy reutilizável do conjunto de contratos DonFiapo no devnet Lunes local.
// Sempre usa o devnet local (ws://127.0.0.1:9944). Sem Python.
// Requer artefatos buildados em target/ink/<crate>/. Uso:
//   node e2e/deploy-devnet.mjs   (resolve @polkadot via e2e/node_modules)
// Saída: don_fiapo/deployed_addresses.env + e2e/deployed-env-patch.txt (linhas NEXT_PUBLIC_*).
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { CodePromise, ContractPromise } from '@polkadot/api-contract'
import { readFileSync, writeFileSync } from 'node:fs'

const WS = 'ws://127.0.0.1:9944'
const INK = new URL('../target/ink/', import.meta.url).pathname
const OUT = new URL('../deployed_addresses.env', import.meta.url).pathname
const PATCH = new URL('./deployed-env-patch.txt', import.meta.url).pathname
const GAS = (api) => api.registry.createType('WeightV2', { refTime: 1_000_000_000_000n, proofSize: 3_000_000n })

const load = (name) => ({
  abi: JSON.parse(readFileSync(`${INK}${name}/${name}.json`, 'utf8')),
  wasm: readFileSync(`${INK}${name}/${name}.wasm`),
})

function instantiate(api, signer, name, ...args) {
  const { abi, wasm } = load(name)
  const code = new CodePromise(api, abi, wasm)
  const salt = '0x' + Array.from({ length: 8 }, (_, i) => ((Date.now() + i) & 0xff).toString(16).padStart(2, '0')).join('')
  const tx = code.tx.new({ gasLimit: GAS(api), storageDepositLimit: null, salt }, ...args)
  return new Promise((resolve, reject) => {
    let done = false
    tx.signAndSend(signer, ({ status, events, dispatchError }) => {
      if (dispatchError) { done = true; return reject(new Error(`${name}: ${dispatchError.toString()}`)) }
      if ((status.isInBlock || status.isFinalized) && !done) {
        const ev = events.find((e) => e.event.method === 'Instantiated')
        if (ev) { done = true; resolve(ev.event.data[1].toString()) }
        else if (status.isFinalized) { done = true; reject(new Error(`${name}: no Instantiated event`)) }
      }
    }).catch(reject)
  })
}

function call(api, signer, contract, method, ...args) {
  const tx = contract.tx[method]({ gasLimit: GAS(api), storageDepositLimit: null }, ...args)
  return new Promise((resolve) => {
    tx.signAndSend(signer, ({ status, dispatchError }) => {
      if (dispatchError) resolve({ ok: false, error: dispatchError.toString() })
      else if (status.isInBlock || status.isFinalized) resolve({ ok: true })
    }).catch((e) => resolve({ ok: false, error: String(e) }))
  })
}

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider(WS) })
  const alice = new Keyring({ type: 'sr25519' }).addFromUri('//Alice')
  const A = alice.address
  console.log('Deployer (Alice):', A)

  const addr = {}
  const dep = async (key, crate, ...args) => { addr[key] = await instantiate(api, alice, crate, ...args); console.log(`${key.padEnd(10)} = ${addr[key]}`) }

  // Ordem: core primeiro; depois dependentes (recebem core); oracle; governance.
  await dep('CORE', 'fiapo_core', 'Don Fiapo', 'FIAPO', '1000000000000000000', A, A, A, A)
  await dep('REWARDS', 'fiapo_rewards', addr.CORE)
  await dep('AFFILIATE', 'fiapo_affiliate', addr.CORE)
  await dep('NOBLE', 'noble_affiliate', addr.CORE)
  await dep('ORACLE', 'fiapo_oracle_multisig', [A], 1)
  await dep('ICO', 'fiapo_ico', addr.CORE)
  await dep('STAKING', 'fiapo_staking', addr.CORE)
  await dep('LOTTERY', 'fiapo_lottery', addr.CORE)
  await dep('GOVERNANCE', 'fiapo_governance', addr.CORE)

  // --- Fiação (linked contracts) ---
  console.log('\nWiring...')
  const ico = new ContractPromise(api, load('fiapo_ico').abi, addr.ICO)
  const lottery = new ContractPromise(api, load('fiapo_lottery').abi, addr.LOTTERY)
  const staking = new ContractPromise(api, load('fiapo_staking').abi, addr.STAKING)
  const oracle = new ContractPromise(api, load('fiapo_oracle_multisig').abi, addr.ORACLE)
  const governance = new ContractPromise(api, load('fiapo_governance').abi, addr.GOVERNANCE)

  const wire = async (label, p) => { const r = await p; console.log(`  ${label}: ${r.ok ? 'ok' : 'FALHOU ' + (r.error || '').slice(0, 80)}`) }
  await wire('ico.setOracleContract', call(api, alice, ico, 'setOracleContract', addr.ORACLE))
  await wire('lottery.setOracleContract', call(api, alice, lottery, 'setOracleContract', addr.ORACLE))
  await wire('staking.setLinkedContracts', call(api, alice, staking, 'setLinkedContracts', addr.ORACLE, addr.AFFILIATE, addr.REWARDS, addr.NOBLE, null, null))
  await wire('oracle.setContractAddress(ico)', call(api, alice, oracle, 'setContractAddress', 'ico', addr.ICO))
  await wire('oracle.setContractAddress(staking)', call(api, alice, oracle, 'setContractAddress', 'staking', addr.STAKING))
  await wire('oracle.setContractAddress(lottery)', call(api, alice, oracle, 'setContractAddress', 'lottery', addr.LOTTERY))
  await wire('oracle.setContractAddress(governance)', call(api, alice, oracle, 'setContractAddress', 'governance', addr.GOVERNANCE))
  await wire('governance.setLinkedContracts', call(api, alice, governance, 'setLinkedContracts', addr.STAKING, addr.REWARDS, addr.ORACLE, addr.NOBLE, null, null))

  // --- Persistir endereços ---
  const envLines = Object.entries(addr).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'
  writeFileSync(OUT, envLines)
  const NP = {
    NEXT_PUBLIC_CORE_CONTRACT: addr.CORE, NEXT_PUBLIC_ICO_CONTRACT: addr.ICO,
    NEXT_PUBLIC_STAKING_CONTRACT: addr.STAKING, NEXT_PUBLIC_LOTTERY_CONTRACT: addr.LOTTERY,
    NEXT_PUBLIC_ORACLE_MULTISIG_CONTRACT: addr.ORACLE, NEXT_PUBLIC_GOVERNANCE_CONTRACT: addr.GOVERNANCE,
    NEXT_PUBLIC_REWARDS_CONTRACT: addr.REWARDS, NEXT_PUBLIC_AFFILIATE_CONTRACT: addr.AFFILIATE,
  }
  writeFileSync(PATCH, JSON.stringify(NP, null, 2) + '\n')
  console.log(`\nEscrito: ${OUT}\n         ${PATCH}`)
  await api.disconnect()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
