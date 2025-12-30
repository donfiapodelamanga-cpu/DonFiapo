"use client";

import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';

// Solana configuration for payments
export const SOLANA_CONFIG = {
  network: 'mainnet-beta' as const,
  rpc: 'https://api.mainnet-beta.solana.com',
  // Payment receiver wallet (your project's wallet)
  receiverWallet: 'YOUR_SOLANA_RECEIVER_WALLET_ADDRESS',
};

// USDC/USDT addresses on Solana
export const STABLECOINS = {
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  USDT: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
};

let connection: Connection | null = null;

/**
 * Get Solana connection
 */
export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_CONFIG.rpc, 'confirmed');
  }
  return connection;
}

/**
 * Get SOL balance
 */
export async function getSolBalance(address: string): Promise<number> {
  const conn = getConnection();
  const publicKey = new PublicKey(address);
  const balance = await conn.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Create SOL transfer transaction
 */
export function createSolTransfer(
  from: PublicKey,
  amount: number
): Transaction {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: new PublicKey(SOLANA_CONFIG.receiverWallet),
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );
  
  return transaction;
}

/**
 * Format SOL amount
 */
export function formatSol(amount: number): string {
  return `${amount.toFixed(4)} SOL`;
}

/**
 * Calculate USD equivalent (placeholder - would use price oracle)
 */
export function solToUsd(solAmount: number, solPrice = 100): number {
  return solAmount * solPrice;
}

/**
 * Calculate SOL needed for USD amount
 */
export function usdToSol(usdAmount: number, solPrice = 100): number {
  return usdAmount / solPrice;
}
