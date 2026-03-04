/**
 * Solana On-Chain Balance Service
 * 
 * Queries real USDT/USDC balances from the treasury receiver wallet on Solana.
 * Uses @solana/web3.js and @solana/spl-token.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount, TokenAccountNotFoundError } from "@solana/spl-token";

const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// Mainnet token mints
const USDT_MINT = process.env.SOLANA_USDT_MINT || "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDC_MINT = process.env.SOLANA_USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const USDT_DECIMALS = 6;
const USDC_DECIMALS = 6;
const SOL_DECIMALS = 9;

let connectionInstance: Connection | null = null;

function getConnection(): Connection {
    if (!connectionInstance) {
        connectionInstance = new Connection(SOLANA_RPC, {
            commitment: "confirmed",
        });
    }
    return connectionInstance;
}

export interface SolanaTokenBalance {
    mint: string;
    symbol: string;
    balance: bigint;
    formatted: string;
    decimals: number;
    usdValue: number;
}

export interface SolanaNativeBalance {
    lamports: bigint;
    formatted: string;
    decimals: number;
}

/**
 * Get SPL token balance for a wallet
 */
async function getTokenBalance(
    walletAddress: string,
    mintAddress: string,
    symbol: string,
    decimals: number
): Promise<SolanaTokenBalance> {
    const connection = getConnection();

    try {
        const wallet = new PublicKey(walletAddress);
        const mint = new PublicKey(mintAddress);

        // Get associated token account address
        const ata = getAssociatedTokenAddressSync(mint, wallet);

        const account = await getAccount(connection, ata);
        const balance = BigInt(account.amount.toString());

        return {
            mint: mintAddress,
            symbol,
            balance,
            formatted: formatBalance(balance, decimals),
            decimals,
            usdValue: Number(balance) / (10 ** decimals), // 1:1 for stablecoins
        };
    } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
            // No token account = 0 balance
            return {
                mint: mintAddress,
                symbol,
                balance: BigInt(0),
                formatted: "0.00",
                decimals,
                usdValue: 0,
            };
        }
        console.error(`[Solana] Error fetching ${symbol} balance:`, error);
        return {
            mint: mintAddress,
            symbol,
            balance: BigInt(0),
            formatted: "0.00",
            decimals,
            usdValue: 0,
        };
    }
}

/**
 * Get native SOL balance for a wallet
 */
async function getSolBalance(walletAddress: string): Promise<SolanaNativeBalance> {
    const connection = getConnection();

    try {
        const wallet = new PublicKey(walletAddress);
        const lamports = await connection.getBalance(wallet);

        return {
            lamports: BigInt(lamports),
            formatted: formatBalance(BigInt(lamports), SOL_DECIMALS),
            decimals: SOL_DECIMALS,
        };
    } catch (error) {
        console.error("[Solana] Error fetching SOL balance:", error);
        return {
            lamports: BigInt(0),
            formatted: "0.00",
            decimals: SOL_DECIMALS,
        };
    }
}

/**
 * Get all treasury balances from Solana (USDT, USDC, SOL)
 */
export async function getSolanaTreasuryBalances(): Promise<{
    wallet: string;
    sol: SolanaNativeBalance;
    usdt: SolanaTokenBalance;
    usdc: SolanaTokenBalance;
    totalUsdValue: number;
    connected: boolean;
    rpc: string;
}> {
    const receiverWallet = process.env.SOLANA_RECEIVER_WALLET;

    if (!receiverWallet) {
        return {
            wallet: "",
            sol: { lamports: BigInt(0), formatted: "0.00", decimals: SOL_DECIMALS },
            usdt: { mint: USDT_MINT, symbol: "USDT", balance: BigInt(0), formatted: "0.00", decimals: USDT_DECIMALS, usdValue: 0 },
            usdc: { mint: USDC_MINT, symbol: "USDC", balance: BigInt(0), formatted: "0.00", decimals: USDC_DECIMALS, usdValue: 0 },
            totalUsdValue: 0,
            connected: false,
            rpc: SOLANA_RPC,
        };
    }

    try {
        const [sol, usdt, usdc] = await Promise.all([
            getSolBalance(receiverWallet),
            getTokenBalance(receiverWallet, USDT_MINT, "USDT", USDT_DECIMALS),
            getTokenBalance(receiverWallet, USDC_MINT, "USDC", USDC_DECIMALS),
        ]);

        return {
            wallet: receiverWallet,
            sol,
            usdt,
            usdc,
            totalUsdValue: usdt.usdValue + usdc.usdValue,
            connected: true,
            rpc: SOLANA_RPC,
        };
    } catch (error) {
        console.error("[Solana] Treasury query error:", error);
        return {
            wallet: receiverWallet,
            sol: { lamports: BigInt(0), formatted: "0.00", decimals: SOL_DECIMALS },
            usdt: { mint: USDT_MINT, symbol: "USDT", balance: BigInt(0), formatted: "0.00", decimals: USDT_DECIMALS, usdValue: 0 },
            usdc: { mint: USDC_MINT, symbol: "USDC", balance: BigInt(0), formatted: "0.00", decimals: USDC_DECIMALS, usdValue: 0 },
            totalUsdValue: 0,
            connected: false,
            rpc: SOLANA_RPC,
        };
    }
}

/**
 * Format a raw balance with decimals
 */
function formatBalance(raw: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals);
    const whole = raw / divisor;
    const fraction = raw % divisor;
    const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 2);
    return `${whole.toLocaleString("en-US")}.${fractionStr}`;
}
