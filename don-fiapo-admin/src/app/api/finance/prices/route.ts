import { NextResponse } from "next/server";

export async function GET() {
    const result = {
        coingecko: 0,
        bitstorage: 0,
        lastUpdate: Date.now(),
    };

    try {
        // 1. Fetch from Coingecko
        const cgRes = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=lunes&vs_currencies=usdt",
            { next: { revalidate: 60 } } // Cache for 60 seconds
        );
        if (cgRes.ok) {
            const data = await cgRes.json();
            result.coingecko = data.lunes?.usdt || 0;
        }
    } catch (error) {
        console.error("Coingecko price fetch error:", error);
    }

    try {
        // 2. Fetch from BitStorage using verified trades endpoint
        const bsRes = await fetch(
            "https://api.bitstorage.finance/v1/public/trades?pair=LUNESUSDT",
            { next: { revalidate: 60 } }
        );
        if (bsRes.ok) {
            const json = await bsRes.json();
            if (json.status && json.data && json.data.length > 0) {
                result.bitstorage = parseFloat(json.data[0].rate);
            }
        }
    } catch (error) {
        console.error("BitStorage price fetch error:", error);
    }

    return NextResponse.json(result);
}
