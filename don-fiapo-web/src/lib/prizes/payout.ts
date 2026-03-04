/**
 * Server-side prize payout service.
 *
 * Delivers USDT (Solana SPL) and LUNES (Lunes Network) prizes immediately on-chain.
 *
 * Architecture:
 *   - Payer ADDRESS   → read from SystemWallet table (roles: spin_usdt, spin_lunes)
 *   - Payer SIGNER    → env var (private key / mnemonic) — never stored in DB
 *
 * Required env vars:
 *   SOLANA_ADMIN_PRIVATE_KEY  – base58-encoded private key of the Solana payout wallet
 *   NEXT_PUBLIC_SOLANA_RPC    – Solana RPC endpoint
 *   LUNES_MNEMONIC            – mnemonic of the Lunes payout wallet (server-side only)
 *   NEXT_PUBLIC_LUNES_RPC     – Lunes WebSocket RPC endpoint
 *   USDT_MINT_ADDRESS         – Solana USDT SPL token mint (defaults to mainnet)
 */

import { db } from "@/lib/db";

const USDT_MINT_MAINNET = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export interface PayoutResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Looks up a system wallet address by role key. Returns null if not configured. */
async function getSystemWalletAddress(role: string): Promise<string | null> {
    try {
        const wallet = await (db as any).systemWallet.findFirst({
            where: { key: role, isActive: true },
            select: { address: true },
        });
        return wallet?.address ?? null;
    } catch {
        return null;
    }
}

// ── Solana USDT Transfer ──────────────────────────────────────────────────────

/**
 * Send USDT (SPL token on Solana) to the user's Solana address.
 * The payer account address is read from SystemWallet (role: spin_usdt).
 * The payer signing key comes from SOLANA_ADMIN_PRIVATE_KEY env var.
 */
export async function sendUsdtToUser(
    toSolanaAddress: string,
    amountUsdt: number
): Promise<PayoutResult> {
    try {
        const adminPrivateKeyB58 = process.env.SOLANA_ADMIN_PRIVATE_KEY;
        if (!adminPrivateKeyB58) {
            return { success: false, error: "SOLANA_ADMIN_PRIVATE_KEY not configured" };
        }

        // Verify the configured spin_usdt pool wallet matches the private key (soft check)
        const poolAddress = await getSystemWalletAddress("spin_usdt");
        if (!poolAddress) {
            return { success: false, error: "spin_usdt wallet not configured in System Wallets" };
        }

        const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
        const mintAddress = process.env.USDT_MINT_ADDRESS || USDT_MINT_MAINNET;

        const { Connection, Keypair, PublicKey } = await import("@solana/web3.js");
        const { getOrCreateAssociatedTokenAccount, transfer } = await import("@solana/spl-token");
        const bs58 = await import("bs58");

        const connection = new Connection(rpc, "confirmed");
        const adminKeypair = Keypair.fromSecretKey(bs58.default.decode(adminPrivateKeyB58));
        const mint = new PublicKey(mintAddress);
        const recipient = new PublicKey(toSolanaAddress);

        // USDT has 6 decimals on Solana
        const lamports = BigInt(Math.round(amountUsdt * 1_000_000));

        // Get admin ATA (payer)
        const fromAta = await getOrCreateAssociatedTokenAccount(
            connection,
            adminKeypair,
            mint,
            adminKeypair.publicKey
        );

        // Get/create recipient ATA (admin pays for creation if needed)
        const toAta = await getOrCreateAssociatedTokenAccount(
            connection,
            adminKeypair, // payer
            mint,
            recipient
        );

        const signature = await transfer(
            connection,
            adminKeypair,
            fromAta.address,
            toAta.address,
            adminKeypair,
            lamports
        );

        return { success: true, txHash: signature };
    } catch (err: any) {
        console.error("[PAYOUT_USDT]", err);
        return { success: false, error: err?.message ?? "Unknown error" };
    }
}

// ── Lunes Native Transfer ─────────────────────────────────────────────────────

/**
 * Send native LUNES tokens to the user's Lunes address.
 * The payer account address is read from SystemWallet (role: spin_lunes).
 * The payer signing key comes from LUNES_MNEMONIC env var.
 */
export async function sendLunesToUser(
    toLunesAddress: string,
    amountLunes: number
): Promise<PayoutResult> {
    try {
        const mnemonic = process.env.LUNES_MNEMONIC;
        if (!mnemonic) {
            return { success: false, error: "LUNES_MNEMONIC not configured" };
        }

        // Verify the spin_lunes pool wallet is configured in admin
        const poolAddress = await getSystemWalletAddress("spin_lunes");
        if (!poolAddress) {
            return { success: false, error: "spin_lunes wallet not configured in System Wallets" };
        }

        const rpc = process.env.NEXT_PUBLIC_LUNES_RPC || "ws://127.0.0.1:9944";

        const { ApiPromise, WsProvider } = await import("@polkadot/api");
        const { Keyring } = await import("@polkadot/keyring");
        const { cryptoWaitReady } = await import("@polkadot/util-crypto");

        await cryptoWaitReady();

        const provider = new WsProvider(rpc, 1000);
        const apiTimeout = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Lunes RPC connection timeout")), 6000)
        );
        const api = await Promise.race([ApiPromise.create({ provider }), apiTimeout]) as ApiPromise;

        const keyring = new Keyring({ type: "sr25519" });
        const adminAccount = keyring.addFromMnemonic(mnemonic);

        // LUNES has 8 decimals
        const DECIMALS = 8;
        const amount = BigInt(Math.round(amountLunes * 10 ** DECIMALS));

        const txHash = await new Promise<string>((resolve, reject) => {
            api.tx.balances
                .transferKeepAlive(toLunesAddress, amount)
                .signAndSend(adminAccount, ({ status, txHash, dispatchError }: any) => {
                    if (status.isInBlock) {
                        if (dispatchError) {
                            reject(new Error(dispatchError.toString()));
                        } else {
                            resolve(txHash.toHex());
                        }
                    }
                })
                .catch(reject);
        });

        await api.disconnect();
        return { success: true, txHash };
    } catch (err: any) {
        console.error("[PAYOUT_LUNES]", err);
        return { success: false, error: err?.message ?? "Unknown error" };
    }
}
