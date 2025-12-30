import fetch from 'node-fetch';

/**
 * Load Simulator for Don Fiapo Ecosystem
 * 
 * Target: 100,000 "Users" (Simulated requests)
 * Strategy: Batched concurrent requests to avoid OS limit exhaustion
 */

const TARGET_USERS = 100000;
const BATCH_SIZE = 50; // Requests per batch
const DELAY_MS = 10; // Delay between batches

const ORACLE_URL = process.env.ORACLE_URL || 'http://localhost:3000';
const API_KEY = process.env.ORACLE_API_KEY || 'dev-secret-key';

async function simulateUser(id: number) {
    try {
        // 1. Simulate "Create Payment"
        const start = Date.now();
        const res = await fetch(`${ORACLE_URL}/api/payment/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({
                lunesAccount: `user_${id}_addr`,
                fiapoAmount: 1000,
                expectedAmount: 1000000 // 1 USDT
            })
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const latency = Date.now() - start;
        return { success: true, latency };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

async function main() {
    console.log(`🚀 Starting Load Simulation: ${TARGET_USERS} users`);
    console.log(`📦 Batch Size: ${BATCH_SIZE}`);

    let successCount = 0;
    let failCount = 0;
    let totalLatency = 0;

    for (let i = 0; i < TARGET_USERS; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = 0; j < BATCH_SIZE && (i + j) < TARGET_USERS; j++) {
            batchPromises.push(simulateUser(i + j));
        }

        const results = await Promise.all(batchPromises);

        results.forEach(r => {
            if (r.success) {
                successCount++;
                totalLatency += r.latency!;
            } else {
                failCount++;
            }
        });

        if (i % 1000 === 0) {
            console.log(`Progress: ${i}/${TARGET_USERS} | Success: ${successCount} | Failed: ${failCount} | Avg Latency: ${(totalLatency / successCount || 0).toFixed(2)}ms`);
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log('\n🏁 Simulation Complete');
    console.log(`Total Requests: ${TARGET_USERS}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏱️ Avg Latency: ${(totalLatency / successCount).toFixed(2)}ms`);
}

main();
