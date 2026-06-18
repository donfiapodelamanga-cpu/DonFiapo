// E2E: prova do bug cross-contract de pagamento (SPEC-A, críticas #1 e #2).
// Roda contra o devnet Lunes local (ws://127.0.0.1:9944). Sem Python.
// Deps: @polkadot/api + api-contract (resolvidos de don-fiapo-web/node_modules via NODE_PATH).
//
// Uso: NODE_PATH=../don-fiapo-web/node_modules node e2e/cross-contract-payment.mjs
//
// AC1: pagamento NFTPurchase confirmado -> ico.get_user_nfts(bob) não-vazio.
// AC4: tier inválido -> oracle propaga falha (submit_confirmation reverte), nada creditado.
// AC5: ico.mint_paid(...) por conta não-oracle deve FALHAR (crítico #1).
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { CodePromise, ContractPromise } from '@polkadot/api-contract'
import { readFileSync } from 'node:fs'

const WS = 'ws://127.0.0.1:9944'
const INK = new URL('../target/ink/', import.meta.url).pathname
const GAS = (api) => api.registry.createType('WeightV2', { refTime: 1_000_000_000_000n, proofSize: 3_000_000n })
const SDL = null // storageDepositLimit

const load = (name) => ({
  abi: JSON.parse(readFileSync(`${INK}${name}/${name}.json`, 'utf8')),
  wasm: readFileSync(`${INK}${name}/${name}.wasm`),
})

function instantiate(api, signer, name, ...args) {
  const { abi, wasm } = load(name)
  const code = new CodePromise(api, abi, wasm)
  const salt = '0x' + Array.from({ length: 8 }, (_, i) => ((Date.now() + i) & 0xff).toString(16).padStart(2, '0')).join('')
  const tx = code.tx.new({ gasLimit: GAS(api), storageDepositLimit: SDL, salt }, ...args)
  return new Promise((resolve, reject) => {
    let done = false
    tx.signAndSend(signer, ({ status, events, dispatchError }) => {
      if (dispatchError) { done = true; return reject(new Error(`${name} deploy dispatchError: ${dispatchError.toString()}`)) }
      if ((status.isInBlock || status.isFinalized) && !done) {
        const ev = events.find((e) => e.event.method === 'Instantiated')
        if (ev) { done = true; resolve(ev.event.data[1].toString()) }
        else if (status.isFinalized) { done = true; reject(new Error(`${name}: no Instantiated event`)) }
      }
    }).catch(reject)
  })
}

function callTx(api, signer, contract, method, ...args) {
  const tx = contract.tx[method]({ gasLimit: GAS(api), storageDepositLimit: SDL }, ...args)
  return new Promise((resolve) => {
    tx.signAndSend(signer, ({ status, dispatchError }) => {
      if (dispatchError) { resolve({ ok: false, error: dispatchError.toString() }) }
      else if (status.isInBlock || status.isFinalized) { resolve({ ok: true }) }
    }).catch((e) => resolve({ ok: false, error: String(e) }))
  })
}

async function query(api, contract, caller, method, ...args) {
  const { result, output } = await contract.query[method](caller, { gasLimit: GAS(api), storageDepositLimit: SDL }, ...args)
  if (result.isErr) return { ok: false }
  let v = output?.toJSON()
  // ink! envolve retorno em Result<T, LangError>: desembrulha {ok: T}
  if (v && typeof v === 'object' && !Array.isArray(v) && 'ok' in v) v = v.ok
  return { ok: true, value: v }
}
const arr = (v) => (Array.isArray(v) ? v : [])

const results = []
const check = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${id}: ${detail}`) }

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider(WS) })
  const keyring = new Keyring({ type: 'sr25519' })
  const alice = keyring.addFromUri('//Alice')
  const bob = keyring.addFromUri('//Bob')
  console.log('Connected. Alice =', alice.address, '| Bob =', bob.address)

  // Deploy core, ico, oracle (Alice = único oráculo, quorum=1)
  const coreAddr = await instantiate(api, alice, 'fiapo_core', 'Don Fiapo', 'FIAPO', '1000000000000000000', alice.address, alice.address, alice.address, alice.address)
  console.log('core    =', coreAddr)
  const icoAddr = await instantiate(api, alice, 'fiapo_ico', coreAddr)
  console.log('ico     =', icoAddr)
  const oracleAddr = await instantiate(api, alice, 'fiapo_oracle_multisig', [alice.address], 1)
  console.log('oracle  =', oracleAddr)

  const ico = new ContractPromise(api, load('fiapo_ico').abi, icoAddr)
  const oracle = new ContractPromise(api, load('fiapo_oracle_multisig').abi, oracleAddr)

  // Wire
  await callTx(api, alice, ico, 'setOracleContract', oracleAddr)
  await callTx(api, alice, oracle, 'setContractAddress', 'ico', icoAddr)

  // ---- AC5 (#1): mint_paid público por não-oracle deve falhar ----
  const before = arr((await query(api, ico, alice.address, 'getUserNfts', bob.address)).value)
  const mp = await callTx(api, bob, ico, 'mintPaid', 1, 'fake-payment-hash')
  const afterMp = arr((await query(api, ico, alice.address, 'getUserNfts', bob.address)).value)
  check('AC5', !mp.ok || afterMp.length === before.length,
    mp.ok ? `mint_paid público SUCEDEU sem pagamento (nfts: ${before.length}->${afterMp.length}) [VULNERÁVEL]` : `mint_paid rejeitado (${mp.error?.slice(0,60)})`)

  // ---- AC1 (#2): pagamento NFTPurchase confirmado deve creditar NFT ----
  const txh = 'tx-nft-' + Date.now()
  const conf = await callTx(api, alice, oracle, 'submitConfirmation', txh, 'SoLsEnDeR', 5000, bob.address, { NFTPurchase: { tier: 1 } })
  const afterPay = arr((await query(api, ico, alice.address, 'getUserNfts', bob.address)).value)
  check('AC1', afterPay.length > before.length,
    `submit_confirmation ok=${conf.ok}${conf.error ? ' err=' + conf.error.slice(0,80) : ''} | nfts do bob: ${before.length}->${afterPay.length} (esperado: aumentar)`)

  // ---- AC4 (#2): tier inválido -> falha, nada creditado ----
  const txh2 = 'tx-bad-' + Date.now()
  const conf2 = await callTx(api, alice, oracle, 'submitConfirmation', txh2, 'SoLsEnDeR', 5000, bob.address, { NFTPurchase: { tier: 99 } })
  check('AC4', !conf2.ok, `tier inválido: submit_confirmation ok=${conf2.ok} (esperado: reverter)`)

  await api.disconnect()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n=== ${passed}/${results.length} AC passaram ===`)
  process.exit(passed === results.length ? 0 : 1)
}
main().catch((e) => { console.error('FATAL', e); process.exit(2) })
