export interface PriceData {
    coingecko?: number;
    bitstorage?: number;
    lastUpdate: number;
}

export async function fetchLunesPrices(): Promise<PriceData> {
    try {
        const res = await fetch("/api/finance/prices");
        if (res.ok) {
            return await res.json();
        }
    } catch (error) {
        console.error("Internal price fetch error:", error);
    }

    return {
        lastUpdate: Date.now(),
    };
}
