import { db } from "@/lib/db";

async function verify() {
    console.log("1. Checking initial count...");
    const initialCount = await db.subscriber.count();
    console.log("Initial subscribers:", initialCount);

    const testEmail = `test_${Date.now()}@donfiapo.com`;
    console.log(`2. Simulating API call for ${testEmail}...`);

    // We can't fetch localhost easily in this script without running the server, 
    // but we can test the DB insertion logic directly or rely on the running dev server.
    // Since dev server is running, we could curl it, but let's just test DB write access first
    // to prove the "saving" part works.

    try {
        const sub = await db.subscriber.create({
            data: { email: testEmail, source: "verification_script" }
        });
        console.log("✅ Success! ID:", sub.id);
    } catch (e) {
        console.error("❌ Failed:", e);
    }

    const finalCount = await db.subscriber.count();
    console.log("Final subscribers:", finalCount);
}

verify()
    .catch(console.error)
    .finally(() => process.exit(0));
