import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Known stablecoin prices in USD
const STABLECOIN_PRICES: Record<string, number> = {
    USDC: 1.0,
    USDT: 1.0,
};

// Internal token prices in USD (fallback if external API fails)
const INTERNAL_PRICES: Record<string, number> = {
    FIAPO: 0.10,
    LUNES: 0.0001, // fallback, overridden by CoinGecko/BitStorage
};

async function fetchExternalPrices(): Promise<Record<string, number>> {
    const prices: Record<string, number> = { ...STABLECOIN_PRICES, ...INTERNAL_PRICES };

    try {
        const cgRes = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=lunes&vs_currencies=usd",
            { next: { revalidate: 60 } }
        );
        if (cgRes.ok) {
            const data = await cgRes.json();
            if (data.lunes?.usd) {
                prices.LUNES = data.lunes.usd;
            }
        }
    } catch (e) {
        console.error("[Wallets] CoinGecko price error:", e);
    }

    return prices;
}

// USD to BRL rate (fallback)
async function fetchUsdBrlRate(): Promise<number> {
    try {
        const res = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=brl",
            { next: { revalidate: 300 } }
        );
        if (res.ok) {
            const data = await res.json();
            if (data.usd?.brl) return data.usd.brl;
        }
    } catch (e) {
        console.error("[Wallets] USD/BRL rate error:", e);
    }
    return 5.80; // fallback rate
}

export async function GET() {
    try {
        const wallets = await prisma.wallet.findMany({
            include: {
                branch: true,
                transactions: true,
            },
        });

        const [tokenPrices, usdBrlRate] = await Promise.all([
            fetchExternalPrices(),
            fetchUsdBrlRate(),
        ]);

        const formattedWallets = wallets.map((w) => {
            // Calculate real balance from transactions
            const deposits = w.transactions
                .filter((t) => t.type === "deposit" && t.status === "completed")
                .reduce((acc, t) => acc + t.amount, 0);
            const withdrawals = w.transactions
                .filter((t) => t.type === "withdrawal" && t.status === "completed")
                .reduce((acc, t) => acc + t.amount, 0);
            const balance = deposits - withdrawals;

            // Get price for this token
            const priceUsd = tokenPrices[w.symbol.toUpperCase()] || 0;
            const valueBrl = balance * priceUsd * usdBrlRate;

            return {
                id: w.id,
                name: w.name,
                address: w.address,
                shortAddress: `${w.address.substring(0, 6)}...${w.address.substring(w.address.length - 4)}`,
                balance: balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                balanceRaw: balance,
                symbol: w.symbol,
                network: w.network,
                networkId: w.network.toLowerCase(),
                priceUsd,
                valueBrl,
                color: w.symbol === "LUNES" ? "bg-blue-600" : w.symbol === "FIAPO" ? "bg-yellow-500" : w.symbol === "USDT" ? "bg-green-500" : w.symbol === "USDC" ? "bg-blue-500" : "bg-neutral-600",
                branchName: w.branch.name,
                branchId: w.branchId,
                transactionCount: w.transactions.length,
            };
        });

        return NextResponse.json(formattedWallets);
    } catch (error) {
        console.error("Error fetching wallets:", error);
        return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
    }
}
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, address, seed, symbol, network, branchId } = body;

        const wallet = await prisma.wallet.create({
            data: {
                name,
                address,
                seed,
                symbol: symbol.toUpperCase(),
                network,
                branchId,
            },
            include: {
                branch: true,
            },
        });

        return NextResponse.json(wallet);
    } catch (error) {
        console.error("Error creating wallet:", error);
        return NextResponse.json({ error: "Failed to create wallet" }, { status: 500 });
    }
}
