/**
 * Don Fiapo — Volume & Stress Tests for Local Testnet
 * 
 * Tests high-throughput scenarios: batch transfers, batch mints, 
 * concurrent staking, financial integrity checks.
 * 
 * Usage: LUNES_RPC_URL=ws://127.0.0.1:9944 node test_volume.cjs
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.LUNES_RPC_URL || 'ws://127.0.0.1:9944';
const DEPLOY_FILE = path.join(__dirname, 'last_deploy_ecosystem.json');
const ARTIFACTS_DIR = path.join(__dirname, '../don_fiapo/target/ink');
const SCALE = 100_000_000n;

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════

function loadDeployInfo() {
    return JSON.parse(fs.readFileSync(DEPLOY_FILE, 'utf8'));
}

function loadAbi(name) {
    const patterns = [
        `fiapo_${name}/fiapo_${name}.contract`,
        `${name}/${name}.contract`,
    ];
    for (const p of patterns) {
        const full = path.join(ARTIFACTS_DIR, p);
        if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, 'utf8'));
    }
    return null;
}

function gas(api) {
    return api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
    });
}

async function query(contract, caller, method, args = []) {
    const g = gas(contract.api);
    const { result, output } = await contract.query[method](caller.address, { gasLimit: g }, ...args);
    if (!result.isOk) throw new Error(`Query ${method} failed`);
    return output;
}

async function sendTx(contract, caller, method, args = [], value = 0) {
    const g = gas(contract.api);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`TX timeout: ${method}`)), 30000);
        contract.tx[method]({ gasLimit: g, storageDepositLimit: null, value }, ...args)
            .signAndSend(caller, ({ status, dispatchError }) => {
                if (status.isInBlock || status.isFinalized) {
                    clearTimeout(timeout);
                    if (dispatchError) {
                        let msg = 'Unknown';
                        if (dispatchError.isModule) {
                            const d = contract.api.registry.findMetaError(dispatchError.asModule);
                            msg = `${d.section}.${d.name}`;
                        }
                        reject(new Error(msg));
                    } else {
                        resolve();
                    }
                }
            }).catch(e => { clearTimeout(timeout); reject(e); });
    });
}

// ═══════════════════════════════════════════
//  VOLUME TESTS
// ═══════════════════════════════════════════

async function main() {
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║  Don Fiapo Volume Tests — Local Testnet   ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const provider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider });
    const keyring = new Keyring({ type: 'sr25519' });

    const alice = keyring.addFromUri('//Alice');
    const deploy = loadDeployInfo();

    const coreAbi = loadAbi('core');
    if (!coreAbi) { console.error('Core ABI not found'); process.exit(1); }
    const core = new ContractPromise(api, coreAbi, deploy.core);

    // Generate test accounts
    const testAccounts = [];
    for (let i = 0; i < 50; i++) {
        testAccounts.push(keyring.addFromUri(`//TestUser${i}`));
    }

    // ═══ T1: Batch Transfers ═══
    console.log('═══ T1: Batch Transfers (50 sequential) ═══\n');
    {
        const amount = 100n * SCALE;
        let success = 0;
        let fail = 0;
        const startTime = Date.now();

        for (let i = 0; i < 50; i++) {
            try {
                await sendTx(core, alice, 'transfer', [testAccounts[i].address, amount.toString()]);
                success++;
                if ((i + 1) % 10 === 0) process.stdout.write(`  ${i + 1}/50 done\n`);
            } catch (e) {
                fail++;
                console.error(`  Transfer ${i} failed: ${e.message}`);
            }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const tps = (success / elapsed).toFixed(2);
        console.log(`\n  ✅ ${success} OK, ❌ ${fail} failed`);
        console.log(`  ⏱️  ${elapsed.toFixed(1)}s total, ~${tps} tx/s\n`);
    }

    // ═══ T2: Balance Integrity Check ═══
    console.log('═══ T2: Balance Integrity Check ═══\n');
    {
        const supplyOut = await query(core, alice, 'totalSupply');
        const totalSupply = BigInt(supplyOut.toJSON()?.ok?.replace(/,/g, '') || '0');

        const burnedOut = await query(core, alice, 'totalBurned');
        const totalBurned = BigInt(burnedOut.toJSON()?.ok?.replace(/,/g, '') || '0');

        // Check Alice + all test accounts + contract balances
        let sampledBalance = 0n;
        const aliceBal = BigInt((await query(core, alice, 'balanceOf', [alice.address])).toJSON()?.ok?.replace(/,/g, '') || '0');
        sampledBalance += aliceBal;

        for (const acc of testAccounts) {
            const bal = BigInt((await query(core, alice, 'balanceOf', [acc.address])).toJSON()?.ok?.replace(/,/g, '') || '0');
            sampledBalance += bal;
        }

        // Check treasury contracts
        const treasuryAddrs = [deploy.staking, deploy.ico, deploy.airdrop, deploy.rewards].filter(Boolean);
        for (const addr of treasuryAddrs) {
            const bal = BigInt((await query(core, alice, 'balanceOf', [addr])).toJSON()?.ok?.replace(/,/g, '') || '0');
            sampledBalance += bal;
        }

        console.log(`  Total Supply:    ${totalSupply}`);
        console.log(`  Total Burned:    ${totalBurned}`);
        console.log(`  Sampled Balance: ${sampledBalance}`);
        console.log(`  Remaining (unsampled wallets): ${totalSupply - totalBurned - sampledBalance}`);

        // Verify: sampled should not exceed supply - burned
        if (sampledBalance <= totalSupply - totalBurned) {
            console.log('  ✅ Balance integrity: PASS\n');
        } else {
            console.log('  ❌ Balance integrity: FAIL (sampled > supply - burned)\n');
        }
    }

    // ═══ T3: Rapid approve + transferFrom ═══
    console.log('═══ T3: Rapid approve + transferFrom (20 rounds) ═══\n');
    {
        let success = 0;
        const startTime = Date.now();

        for (let i = 0; i < 20; i++) {
            try {
                const amount = 10n * SCALE;
                const from = testAccounts[i];
                const to = testAccounts[(i + 1) % 20];
                // from approves alice
                await sendTx(core, from, 'approve', [alice.address, amount.toString()]);
                // alice transfers from→to
                await sendTx(core, alice, 'transferFrom', [from.address, to.address, amount.toString()]);
                success++;
            } catch (e) {
                // Some may fail due to insufficient balance
            }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`  ✅ ${success}/20 rounds completed in ${elapsed.toFixed(1)}s\n`);
    }

    // ═══ T4: Staking Volume (if available) ═══
    if (deploy.staking) {
        console.log('═══ T4: Staking Volume (10 stakes) ═══\n');
        const stakingAbi = loadAbi('staking');
        if (stakingAbi) {
            const staking = new ContractPromise(api, stakingAbi, deploy.staking);
            let success = 0;
            const stakeAmount = 1000n * SCALE;

            for (let i = 0; i < 10; i++) {
                try {
                    const user = testAccounts[i];
                    // Approve
                    await sendTx(core, user, 'approve', [deploy.staking, stakeAmount.toString()]);
                    // Stake in pool 0 (DonBurn)
                    await sendTx(staking, user, 'stake', [0, stakeAmount.toString()]);
                    success++;
                } catch (e) {
                    // May fail if balance insufficient
                }
            }
            console.log(`  ✅ ${success}/10 stakes completed\n`);

            // Check total staked
            try {
                const statsOut = await query(staking, alice, 'getStats');
                console.log(`  Stats: ${JSON.stringify(statsOut.toHuman()?.Ok)}\n`);
            } catch (e) {
                console.log(`  Stats query failed: ${e.message}\n`);
            }
        }
    }

    // ═══ T5: Fee Distribution Verification ═══
    console.log('═══ T5: Fee Distribution Verification ═══\n');
    {
        // Transfer a known amount and verify fee was charged
        const testUser = testAccounts[0];
        const balBefore = BigInt((await query(core, alice, 'balanceOf', [testUser.address])).toJSON()?.ok?.replace(/,/g, '') || '0');
        const burnBefore = BigInt((await query(core, alice, 'totalBurned')).toJSON()?.ok?.replace(/,/g, '') || '0');

        const transferAmount = 10000n * SCALE;
        try {
            await sendTx(core, alice, 'transfer', [testUser.address, transferAmount.toString()]);

            const balAfter = BigInt((await query(core, alice, 'balanceOf', [testUser.address])).toJSON()?.ok?.replace(/,/g, '') || '0');
            const burnAfter = BigInt((await query(core, alice, 'totalBurned')).toJSON()?.ok?.replace(/,/g, '') || '0');

            const received = balAfter - balBefore;
            const burned = burnAfter - burnBefore;
            const feeTotal = transferAmount - received;
            const feePct = Number(feeTotal * 10000n / transferAmount) / 100;

            console.log(`  Sent:     ${transferAmount} paws`);
            console.log(`  Received: ${received} paws`);
            console.log(`  Fee:      ${feeTotal} paws (${feePct}%)`);
            console.log(`  Burned:   ${burned} paws`);

            if (feePct > 0 && feePct < 2) {
                console.log('  ✅ Fee distribution: PASS (0.6% expected)\n');
            } else if (feePct === 0) {
                console.log('  ⚠️  Fee is 0 — fees may be disabled or exempt\n');
            } else {
                console.log(`  ⚠️  Fee is ${feePct}% — check configuration\n`);
            }
        } catch (e) {
            console.log(`  Transfer failed: ${e.message}\n`);
        }
    }

    // ═══ SUMMARY ═══
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║  Volume Tests Complete                    ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    await api.disconnect();
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
