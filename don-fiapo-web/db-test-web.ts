import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const libsql = createClient({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });
const adapter = new PrismaLibSQL(libsql);
const db = new PrismaClient({ adapter });

let passed = 0; let failed = 0;
const P = "✅"; const F = "❌";
async function test(name: string, fn: () => Promise<void>) {
    try { await fn(); console.log(P, name); passed++; }
    catch (e: any) { console.log(F, name + ":", e.message); failed++; }
}

async function main() {
    console.log("\n🔍 DonFiapo Web — Database Integration Tests\n");
    let userId = "", walletId = "", missionId = "", completionId = "", referredId = "";

    await test("User: create", async () => { const u = await db.user.create({ data: {} }); userId = u.id; });
    await test("User: read", async () => { if (!await db.user.findUnique({ where: { id: userId } })) throw new Error("Not found"); });
    await test("User: update score", async () => { const u = await db.user.update({ where: { id: userId }, data: { offchainScore: 500 } }); if (u.offchainScore !== 500) throw new Error("Fail"); });

    await test("Wallet: create", async () => {
        const addr = `lunes_${Date.now()}`;
        const w = await db.wallet.create({ data: { address: addr, network: "LUNES", userId } }); walletId = w.id;
    });
    await test("Wallet: unique address constraint", async () => {
        const w = await db.wallet.findUnique({ where: { id: walletId } });
        let threw = false;
        try { await db.wallet.create({ data: { address: w!.address, network: "LUNES", userId } }); } catch { threw = true; }
        if (!threw) throw new Error("Unique constraint not enforced");
    });

    await test("Mission: create + toggle isActive", async () => {
        const m = await db.mission.create({ data: { name: "Test", description: "Test", type: "OFFCHAIN", platform: "X", basePoints: 100 } });
        missionId = m.id;
        const m2 = await db.mission.update({ where: { id: missionId }, data: { isActive: false } });
        if (m2.isActive) throw new Error("isActive should be false");
    });

    await test("MissionCompletion: PENDING → VERIFIED", async () => {
        const c = await db.missionCompletion.create({ data: { userId, missionId, status: "PENDING", earnedPoints: 100 } });
        completionId = c.id;
        const c2 = await db.missionCompletion.update({ where: { id: completionId }, data: { status: "VERIFIED", verifiedAt: new Date() } });
        if (c2.status !== "VERIFIED") throw new Error("Status not updated");
    });

    await test("SpinResult: create", async () => {
        await db.spinResult.create({ data: { userId, prizeIndex: 2, prizeLabel: "0.5", prizeSublabel: "FIAPO", tier: "common" } });
    });

    await test("SpinPurchase: PENDING → CONFIRMED", async () => {
        const p = await db.spinPurchase.create({ data: { userId, spins: 10, priceUsdt: 9.0, paymentId: `pay_${Date.now()}` } });
        const p2 = await db.spinPurchase.update({ where: { id: p.id }, data: { status: "CONFIRMED", solanaTxHash: `tx_${Date.now()}`, confirmedAt: new Date() } });
        if (p2.status !== "CONFIRMED") throw new Error("Status not updated");
    });

    await test("Referral: create + qualify", async () => {
        const r = await db.user.create({ data: {} }); referredId = r.id;
        await db.referral.create({ data: { referrerId: userId, referredId, status: "PENDING" } });
        const ref = await db.referral.update({ where: { referredId }, data: { status: "QUALIFIED", qualifiedAt: new Date() } });
        if (ref.status !== "QUALIFIED") throw new Error("Status not updated");
    });

    await test("FraudFlag: create", async () => {
        await db.fraudFlag.create({ data: { userId, reason: "Test flag", severity: "LOW" } });
    });

    await test("RewardPool + EarlyBirdClaim: create", async () => {
        const p = await db.rewardPool.create({ data: { name: "Test Pool", type: "EARLY_BIRD", totalAmount: 100000, maxSlots: 1000 } });
        await db.earlyBirdClaim.create({ data: { userId, poolId: p.id, slotNumber: 1, lunesAmount: 100 } });
    });

    await test("TokenMigration: create", async () => {
        await db.tokenMigration.create({ data: { userId, solanaTxHash: `sol_${Date.now()}`, solanaSender: "sender", lunesRecipient: "recipient", amountSolana: 100, amountLunes: 102, status: "PENDING" } });
    });

    await test("Subscriber: create", async () => {
        await db.subscriber.create({ data: { email: `test_${Date.now()}@sub.com` } });
    });

    await test("Relations: user.include all", async () => {
        const u = await db.user.findUnique({ where: { id: userId }, include: { wallets: true, completions: true, spinResults: true, spinPurchases: true, fraudFlags: true, referralsMade: true, earlyBirdClaim: true, migrations: true } });
        if (!u?.wallets?.length) throw new Error("No wallets");
        if (!u?.completions?.length) throw new Error("No completions");
    });

    await test("Cleanup: cascade delete", async () => {
        await db.user.delete({ where: { id: referredId } });
        await db.user.delete({ where: { id: userId } });
        await db.mission.delete({ where: { id: missionId } });
    });

    console.log("\n" + "─".repeat(50));
    console.log(`✅ Passed: ${passed}  |  ❌ Failed: ${failed}  |  Total: ${passed + failed}`);
    if (failed === 0) console.log("\n🎉 All web database tests passed!\n");
    else { console.log("\n⚠️ Some tests failed.\n"); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
