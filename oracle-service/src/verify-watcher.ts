
import { OracleWatcher } from './watcher';
import { SolanaVerifier, USDTTransactionDetails } from './solana-verifier';
import { LunesContractClient, ConfirmPaymentResult } from './lunes-contract';

// Mocks
class MockSolanaVerifier extends SolanaVerifier {
    constructor() { super('https://api.devnet.solana.com', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'); }

    async subscribeToTransactions(callback: (signature: string) => void): Promise<number> {
        console.log('[MockSolana] Subscribed. Simulating tx...');
        setTimeout(() => callback('mock_signature_123'), 100);
        return 1;
    }

    async getTransferDetails(signature: string): Promise<USDTTransactionDetails> {
        console.log(`[MockSolana] Getting details for ${signature}`);
        return {
            signature,
            sender: 'SenderAddr123',
            receiver: 'ReceiverAddr456',
            amount: 5000000, // 5 USDT
            slot: 100,
            blockTime: Date.now() / 1000,
            confirmations: 10,
            isValid: true
        };
    }
}

class MockLunesClient extends LunesContractClient {
    constructor() { super('ws://mock', 'mock', 'mock'); }

    async isTransactionProcessed(hash: string): Promise<boolean> {
        return false;
    }

    async confirmSolanaPayment(hash: string, sender: string, amount: number): Promise<ConfirmPaymentResult> {
        console.log(`[MockLunes] Confirming payment: ${hash}, Amount: ${amount}`);
        return { success: true, transactionHash: 'lunes_tx_hash_789' };
    }
}

async function runTest() {
    console.log('--- Starting Manual Oracle Watcher Verification ---');
    const mockSolana = new MockSolanaVerifier();
    const mockLunes = new MockLunesClient();
    const watcher = new OracleWatcher(mockSolana, mockLunes, 1000);

    await watcher.start();

    // Give it time to process
    setTimeout(() => {
        console.log('--- Test Completed ---');
        process.exit(0);
    }, 2000);
}

runTest();
