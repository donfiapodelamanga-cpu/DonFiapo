"use client";

import { useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAccount,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { API_CONFIG } from '@/lib/api/config';

// USDT and USDC token mint addresses on Solana Mainnet
const USDT_MINT = new PublicKey(API_CONFIG.solana.usdtMint);
const USDC_MINT = new PublicKey(API_CONFIG.solana.usdcMint);

// Token decimals
const USDT_DECIMALS = 6;
const USDC_DECIMALS = 6;

export type StablecoinType = 'usdt' | 'usdc';

interface TransferResult {
    signature: string;
    success: boolean;
}

/**
 * Hook for Solana wallet operations and USDT/USDC transfers
 */
export function useSolana() {
    const { connection } = useConnection();
    const {
        publicKey,
        connected,
        connecting,
        disconnect,
        signTransaction,
        sendTransaction
    } = useWallet();

    const {
        setSolanaWallet,
        setSolanaBalance,
        solanaAddress,
        solanaConnected
    } = useWalletStore();

    // Sync wallet adapter state with zustand store
    useEffect(() => {
        if (connected && publicKey) {
            setSolanaWallet(publicKey.toBase58(), true);
        } else if (!connected && !connecting) {
            setSolanaWallet(null, false);
        }
    }, [connected, publicKey, connecting, setSolanaWallet]);

    // Fetch SOL balance when connected
    useEffect(() => {
        async function fetchBalance() {
            if (publicKey && connection) {
                try {
                    const balance = await connection.getBalance(publicKey);
                    setSolanaBalance((balance / 1e9).toFixed(4)); // Convert lamports to SOL
                } catch (error) {
                    console.error('Failed to fetch SOL balance:', error);
                }
            }
        }
        fetchBalance();
    }, [publicKey, connection, setSolanaBalance]);

    /**
     * Get token balance for USDT or USDC
     */
    const getTokenBalance = useCallback(async (tokenType: StablecoinType): Promise<number> => {
        if (!publicKey || !connection) return 0;

        const mint = tokenType === 'usdt' ? USDT_MINT : USDC_MINT;
        const decimals = tokenType === 'usdt' ? USDT_DECIMALS : USDC_DECIMALS;

        try {
            const tokenAccount = await getAssociatedTokenAddress(
                mint,
                publicKey
            );
            const account = await getAccount(connection, tokenAccount);
            return Number(account.amount) / Math.pow(10, decimals);
        } catch {
            // Account doesn't exist or has no balance
            return 0;
        }
    }, [publicKey, connection]);

    /**
     * Transfer USDT or USDC to a receiver address
     */
    const transferStablecoin = useCallback(async (
        tokenType: StablecoinType,
        amount: number,
        receiverAddress: string
    ): Promise<TransferResult> => {
        if (!publicKey || !signTransaction || !connection) {
            throw new Error('Wallet not connected');
        }

        const mint = tokenType === 'usdt' ? USDT_MINT : USDC_MINT;
        const decimals = tokenType === 'usdt' ? USDT_DECIMALS : USDC_DECIMALS;
        const receiver = new PublicKey(receiverAddress);

        // Convert amount to atomic units
        const atomicAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));

        // Get token accounts
        const senderTokenAccount = await getAssociatedTokenAddress(mint, publicKey);
        const receiverTokenAccount = await getAssociatedTokenAddress(mint, receiver);

        // Create transaction
        const transaction = new Transaction();

        // Check if receiver token account exists, if not create it
        try {
            await getAccount(connection, receiverTokenAccount);
        } catch {
            // Account doesn't exist, add instruction to create it
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    publicKey, // payer
                    receiverTokenAccount, // ata
                    receiver, // owner
                    mint // mint
                )
            );
        }

        // Add transfer instruction
        transaction.add(
            createTransferInstruction(
                senderTokenAccount,
                receiverTokenAccount,
                publicKey,
                atomicAmount
            )
        );

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Sign and send transaction
        const signature = await sendTransaction(transaction, connection);

        // Wait for confirmation
        await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        });

        return {
            signature,
            success: true,
        };
    }, [publicKey, signTransaction, sendTransaction, connection]);

    /**
     * Transfer USDT (convenience wrapper)
     */
    const sendUSDT = useCallback(async (
        amount: number,
        receiverAddress: string
    ): Promise<TransferResult> => {
        return transferStablecoin('usdt', amount, receiverAddress);
    }, [transferStablecoin]);

    /**
     * Transfer USDC (convenience wrapper)
     */
    const sendUSDC = useCallback(async (
        amount: number,
        receiverAddress: string
    ): Promise<TransferResult> => {
        return transferStablecoin('usdc', amount, receiverAddress);
    }, [transferStablecoin]);

    return {
        // State
        publicKey,
        address: publicKey?.toBase58() || null,
        connected,
        connecting,

        // Actions
        disconnect,
        getTokenBalance,
        transferStablecoin,
        sendUSDT,
        sendUSDC,

        // Convenience
        isReady: connected && !!publicKey,
    };
}
