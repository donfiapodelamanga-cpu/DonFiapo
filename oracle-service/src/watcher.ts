import { SolanaVerifier, USDTTransactionDetails } from './solana-verifier';
import { LunesContractClient } from './lunes-contract';

export class OracleWatcher {
    private isRunning: boolean = false;
    private processedSignatures: Set<string> = new Set();

    constructor(
        private solanaVerifier: SolanaVerifier,
        private lunesClient: LunesContractClient,
        private pollIntervalMs: number = 5000
    ) { }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('🔍 Oracle Watcher Started - Monitoring Solana USDT transfers...');

        // Subscribe tologs
        this.solanaVerifier.subscribeToTransactions(async (signature) => {
            if (this.processedSignatures.has(signature)) return;
            this.processedSignatures.add(signature);

            console.log(`⚡ New Transaction Detected: ${signature}`);
            await this.processTransaction(signature);

            // Cleanup cache periodically
            if (this.processedSignatures.size > 1000) {
                this.processedSignatures.clear();
            }
        });
    }

    async stop() {
        this.isRunning = false;
        // Unsubscribe logic would go here if exposed
        console.log('🛑 Oracle Watcher Stopped');
    }

    private async processTransaction(signature: string) {
        try {
            // 1. Check if already processed on Lunes (Double check)
            const isProcessed = await this.lunesClient.isTransactionProcessed(signature);
            if (isProcessed) {
                console.log(`⏭️  Transaction ${signature} already processed on Lunes.`);
                return;
            }

            // 2. Get Details from Solana
            // We wait for confirmations? 
            // The subscription triggers immediately. We might need to wait for block confirmations.
            // Retrying logic for confirmations:
            let details: USDTTransactionDetails | null = null;
            for (let i = 0; i < 5; i++) {
                details = await this.solanaVerifier.getTransferDetails(signature);
                if (details.isValid && details.confirmations >= 1) break; // At least 1 conf to start processing logic
                await new Promise(r => setTimeout(r, 2000));
            }

            if (!details || !details.isValid) {
                console.log(`❌ Invalid Transaction ${signature}: ${details?.error}`);
                return;
            }

            console.log(`✅ Valid USDT Transfer: ${details.amount / 1_000_000} USDT from ${details.sender}`);

            // 3. Confirm on Lunes
            // Note: "amount" in details is integer (6 decimals). Contract expects integer.
            const result = await this.lunesClient.confirmSolanaPayment(
                signature,
                details.sender,
                details.amount,
                details.blockTime * 1000, // Contract expects ms? Or seconds? Check.
                details.slot
            );

            if (result.success) {
                console.log(`🎉 Payment Confirmed on Lunes! Hash: ${result.transactionHash}`);
            } else {
                console.error(`💀 Failed to confirm on Lunes: ${result.error}`);
            }

        } catch (error) {
            console.error(`💥 Error processing ${signature}:`, error);
        }
    }
}
