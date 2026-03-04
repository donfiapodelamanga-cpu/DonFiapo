/**
 * Treasury API - On-Chain Balances
 * 
 * Fetches real balances from:
 * - Lunes Network: LUNES (native) + FIAPO (PSP22) from team/burn wallets
 * - Solana: USDT + USDC from receiver wallet
 * 
 * Combines with USD/BRL exchange rate for unified view.
 */

import { NextResponse } from "next/server";
import { getLunesTreasuryBalances } from "@/lib/blockchain/lunes";
import { getSolanaTreasuryBalances } from "@/lib/blockchain/solana";

// Token prices in USD (fallback values)
const FALLBACK_PRICES: Record<string, number> = {
    USDT: 1.0,
    USDC: 1.0,
    FIAPO: 0.10,
    LUNES: 0.0001,
    SOL: 150.0,
};

async function fetchPrices(): Promise<Record<string, number>> {
    const prices = { ...FALLBACK_PRICES };

    try {
        const res = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=lunes,solana&vs_currencies=usd",
            { next: { revalidate: 120 } }
        );
        if (res.ok) {
            const data = await res.json();
            if (data.lunes?.usd) prices.LUNES = data.lunes.usd;
            if (data.solana?.usd) prices.SOL = data.solana.usd;
        }
    } catch (e) {
        console.error("[Treasury] Price fetch error:", e);
    }

    return prices;
}

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
        console.error("[Treasury] USD/BRL fetch error:", e);
    }
    return 5.80;
}

// Serializer for BigInt values
function serializeBigInts(obj: any): any {
    if (typeof obj === "bigint") return obj.toString();
    if (Array.isArray(obj)) return obj.map(serializeBigInts);
    if (obj !== null && typeof obj === "object") {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = serializeBigInts(value);
        }
        return result;
    }
    return obj;
}

export async function GET() {
    const startTime = Date.now();

    try {
        // Fetch all data in parallel
        const [lunesData, solanaData, prices, usdBrlRate] = await Promise.all([
            getLunesTreasuryBalances().catch((e) => {
                console.error("[Treasury] Lunes error:", e);
                return null;
            }),
            getSolanaTreasuryBalances().catch((e) => {
                console.error("[Treasury] Solana error:", e);
                return null;
            }),
            fetchPrices(),
            fetchUsdBrlRate(),
        ]);

        // Build unified treasury response
        const currencies: Array<{
            symbol: string;
            network: string;
            balance: number;
            balanceFormatted: string;
            priceUsd: number;
            valueUsd: number;
            valueBrl: number;
            source: string;
            address: string;
            connected: boolean;
        }> = [];

        // Process Lunes wallets
        if (lunesData?.wallets) {
            for (const wallet of lunesData.wallets) {
                // LUNES native balance
                const lunesBal = Number(wallet.lunesBalance.free) / 1e8;
                currencies.push({
                    symbol: "LUNES",
                    network: "Lunes Network",
                    balance: lunesBal,
                    balanceFormatted: wallet.lunesBalance.formatted,
                    priceUsd: prices.LUNES,
                    valueUsd: lunesBal * prices.LUNES,
                    valueBrl: lunesBal * prices.LUNES * usdBrlRate,
                    source: wallet.name,
                    address: wallet.address,
                    connected: lunesData.chainInfo.connected,
                });

                // FIAPO PSP22 balance
                if (wallet.fiapoBalance) {
                    const fiapoBal = Number(wallet.fiapoBalance.balance) / 1e8;
                    currencies.push({
                        symbol: "FIAPO",
                        network: "Lunes Network",
                        balance: fiapoBal,
                        balanceFormatted: wallet.fiapoBalance.formatted,
                        priceUsd: prices.FIAPO,
                        valueUsd: fiapoBal * prices.FIAPO,
                        valueBrl: fiapoBal * prices.FIAPO * usdBrlRate,
                        source: wallet.name,
                        address: wallet.address,
                        connected: lunesData.chainInfo.connected,
                    });
                }
            }
        }

        // Process Solana wallet
        if (solanaData) {
            if (solanaData.usdt) {
                currencies.push({
                    symbol: "USDT",
                    network: "Solana",
                    balance: solanaData.usdt.usdValue,
                    balanceFormatted: solanaData.usdt.formatted,
                    priceUsd: 1.0,
                    valueUsd: solanaData.usdt.usdValue,
                    valueBrl: solanaData.usdt.usdValue * usdBrlRate,
                    source: "Receiver Wallet",
                    address: solanaData.wallet,
                    connected: solanaData.connected,
                });
            }

            if (solanaData.usdc) {
                currencies.push({
                    symbol: "USDC",
                    network: "Solana",
                    balance: solanaData.usdc.usdValue,
                    balanceFormatted: solanaData.usdc.formatted,
                    priceUsd: 1.0,
                    valueUsd: solanaData.usdc.usdValue,
                    valueBrl: solanaData.usdc.usdValue * usdBrlRate,
                    source: "Receiver Wallet",
                    address: solanaData.wallet,
                    connected: solanaData.connected,
                });
            }
        }

        // Aggregate by symbol
        const aggregated: Record<string, {
            symbol: string;
            totalBalance: number;
            totalValueUsd: number;
            totalValueBrl: number;
            priceUsd: number;
            wallets: number;
            connected: boolean;
            network: string;
        }> = {};

        for (const c of currencies) {
            if (!aggregated[c.symbol]) {
                aggregated[c.symbol] = {
                    symbol: c.symbol,
                    totalBalance: 0,
                    totalValueUsd: 0,
                    totalValueBrl: 0,
                    priceUsd: c.priceUsd,
                    wallets: 0,
                    connected: false,
                    network: c.network,
                };
            }
            aggregated[c.symbol].totalBalance += c.balance;
            aggregated[c.symbol].totalValueUsd += c.valueUsd;
            aggregated[c.symbol].totalValueBrl += c.valueBrl;
            aggregated[c.symbol].wallets += 1;
            if (c.connected) aggregated[c.symbol].connected = true;
        }

        const totalValueUsd = currencies.reduce((sum, c) => sum + c.valueUsd, 0);
        const totalValueBrl = totalValueUsd * usdBrlRate;

        const response = {
            timestamp: Date.now(),
            queryTimeMs: Date.now() - startTime,
            usdBrlRate,
            prices,
            totalValueUsd,
            totalValueBrl,
            aggregated: Object.values(aggregated),
            details: currencies,
            status: {
                lunes: {
                    connected: lunesData?.chainInfo?.connected || false,
                    rpc: lunesData?.chainInfo?.rpc || process.env.LUNES_RPC_URL || "not configured",
                    chain: lunesData?.chainInfo?.chain || "unknown",
                    walletsConfigured: lunesData?.wallets?.length || 0,
                },
                solana: {
                    connected: solanaData?.connected || false,
                    rpc: process.env.SOLANA_RPC_URL || "not configured",
                    walletConfigured: !!process.env.SOLANA_RECEIVER_WALLET,
                },
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[Treasury] API error:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch treasury data",
                details: error instanceof Error ? error.message : "Unknown error",
                timestamp: Date.now(),
                queryTimeMs: Date.now() - startTime,
            },
            { status: 500 }
        );
    }
}
