// Flow-check on-chain contra os contratos JÁ DEPLOYADOS no devnet (deployed_addresses.env).
// Exercita o fluxo de pagamento confirmado -> crédito on-chain, na stack real.
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { readFileSync } from 'node:fs'

const WS = 'ws://127.0.0.1:9944'
const INK = new URL('../target/ink/', import.meta.url).pathname
const ENV = new URL('../deployed_addresses.env', import.meta.url).pathname
const GAS = (api) => api.registry.createType('WeightV2', { refTime: 1_000_000_000_000n, proofSize: 3_000_000n })
const A = Object.fromEntries(readFileSync(ENV, 'utf8').trim().split('\n').map((l) => l.split('=')))
const abi = (n) => JSON.parse(readFileSync(`${INK}${n}/${n}.json`, 'utf8'))
const arr = (v) => (Array.isArray(v) ? v : [])

// resolve metodo (trait-namespaced labels viram chaves diferentes em polkadot-js)
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '')
const resolve = (bag, m) => bag[m] ? m : (Object.keys(bag).find((k) => norm(k).endsWith(norm(m))) || m)

function callTx(api, signer, c, m, ...args) {
  const k = resolve(c.tx, m)
  return new Promise((res) => {
    c.tx[k]({ gasLimit: GAS(api), storageDepositLimit: null }, ...args).signAndSend(signer, ({ status, dispatchError }) => {
      if (dispatchError) res({ ok: false, error: dispatchError.toString() })
      else if (status.isInBlock || status.isFinalized) res({ ok: true })
    }).catch((e) => res({ ok: false, error: String(e) }))
  })
}
async function query(api, c, caller, m, ...args) {
  const k = resolve(c.query, m)
  const { result, output } = await c.query[k](caller, { gasLimit: GAS(api), storageDepositLimit: null }, ...args)
  if (result.isErr) return undefined
  let v = output?.toJSON()
  if (v && typeof v === 'object' && !Array.isArray(v) && 'ok' in v) v = v.ok
  return v
}

const out = []
const check = (id, pass, detail) => { out.push(pass); console.log(`${pass ? '✅' : '❌'} ${id}: ${detail}`) }

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider(WS) })
  const kr = new Keyring({ type: 'sr25519' })
  const alice = kr.addFromUri('//Alice') // oráculo configurado
  const bob = kr.addFromUri('//Bob')     // beneficiário
  console.log('Contratos deployados:', A.ORACLE, A.ICO, A.STAKING)

  const ico = new ContractPromise(api, abi('fiapo_ico'), A.ICO)
  const staking = new ContractPromise(api, abi('fiapo_staking'), A.STAKING)
  const oracle = new ContractPromise(api, abi('fiapo_oracle_multisig'), A.ORACLE)

  // FLUXO 1: compra de NFT (NFTPurchase) confirmada pelo oráculo -> NFT creditado
  const nftsBefore = arr(await query(api, ico, alice.address, 'getUserNfts', bob.address))
  const c1 = await callTx(api, alice, oracle, 'submitConfirmation', 'flow-nft-' + Date.now(), 'SoLsEnDeR', 5000, bob.address, { NFTPurchase: { tier: 1 } })
  const nftsAfter = arr(await query(api, ico, alice.address, 'getUserNfts', bob.address))
  check('NFT', c1.ok && nftsAfter.length > nftsBefore.length, `pagamento NFT confirmado=${c1.ok} | nfts ${nftsBefore.length}->${nftsAfter.length}`)

  // FLUXO 2: entrada de staking (StakingEntry) confirmada -> posição criada
  const posBefore = arr(await query(api, staking, alice.address, 'getUserPositions', bob.address))
  const c2 = await callTx(api, alice, oracle, 'submitConfirmation', 'flow-stk-' + Date.now(), 'SoLsEnDeR', 10000, bob.address, { StakingEntry: { amount: '1000000000', pool: 1 } })
  const posAfter = arr(await query(api, staking, alice.address, 'getUserPositions', bob.address))
  check('STAKE', c2.ok && posAfter.length > posBefore.length, `pagamento staking confirmado=${c2.ok} | posições ${posBefore.length}->${posAfter.length}`)

  // SEGURANÇA: tier inválido tem que reverter (fix #2), não creditar nem marcar processado
  const c3 = await callTx(api, alice, oracle, 'submitConfirmation', 'flow-bad-' + Date.now(), 'SoLsEnDeR', 5000, bob.address, { NFTPurchase: { tier: 99 } })
  check('SAFE', !c3.ok, `tier inválido confirmado=${c3.ok} (esperado: reverter)`)

  await api.disconnect()
  const passed = out.filter(Boolean).length
  console.log(`\n=== ${passed}/${out.length} fluxos on-chain OK ===`)
  process.exit(passed === out.length ? 0 : 1)
}
main().catch((e) => { console.error('FATAL', e); process.exit(2) })
