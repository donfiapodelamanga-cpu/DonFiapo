
import { LunesContractClient } from './lunes-contract';

export class WhaleWatcher {
    private isRunning: boolean = false;
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private lunesClient: LunesContractClient,
        // Em produção, isso deveria conectar a um Indexador ou DB para saber quem são as baleias.
        // Como o contrato não expõe a lista completa de holders de forma iterável (Mapping),
        // precisamos de um indexador off-chain.
        // Para este MVP/Simulação, vamos usar um mock ou apenas logs.
    ) { }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('🐋 Whale Watcher Started');

        // Rodar a cada 24 horas (86400000 ms)
        // Para demo: 1 hora
        const interval = 3600 * 1000;

        this.timer = setInterval(() => this.checkWhales(), interval);
        this.checkWhales(); // Executa imediatamente
    }

    stop() {
        this.isRunning = false;
        if (this.timer) clearInterval(this.timer);
    }

    private async checkWhales() {
        try {
            console.log('🐋 Checking for new Whales...');

            const topHolders = await this.fetchTopHolders();

            if (topHolders.length === 0) {
                console.log('🐋 No whale data available (indexer not connected)');
                return;
            }

            console.log(`🐋 Found ${topHolders.length} whales. Submitting to contract...`);

            if (typeof (this.lunesClient as any).updateWhaleList === 'function') {
                await (this.lunesClient as any).updateWhaleList(topHolders);
                console.log('🐋 Whale list updated on-chain');
            } else {
                console.warn('🐋 LunesContractClient.updateWhaleList not implemented yet — skipping on-chain update');
            }

        } catch (error) {
            console.error('🐋 Error in WhaleWatcher:', error);
        }
    }

    private async fetchTopHolders(): Promise<string[]> {
        // Requires an off-chain indexer to enumerate holders from the PSP22 Mapping.
        // The contract does not expose an iterable holder list.
        // When an indexer (e.g. SubQuery, Subsquid) is deployed, query it here.
        console.info('🐋 fetchTopHolders: awaiting indexer integration');
        return [];
    }
}
