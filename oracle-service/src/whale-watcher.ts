
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

            // 1. Fetch Top 100 Holders from Indexer (Mocked here)
            const topHolders = await this.fetchTopHolders();

            // 2. Submit to Contract via LunesClient
            // Note: LunesContractClient precisa de um método updateWhaleList
            // Vamos assumir que adicionaremos isso ou apenas logamos por enquanto.

            console.log(`🐋 Found ${topHolders.length} whales. Updating contract...`);

            // await this.lunesClient.updateWhaleList(topHolders);
            // (Método não existe ainda no client, necessitaria update no LunesContractClient)

            console.log('🐋 Whale List Updated (Simulation)');

        } catch (error) {
            console.error('🐋 Error in WhaleWatcher:', error);
        }
    }

    private async fetchTopHolders(): Promise<string[]> {
        // Mock implementation
        return [
            '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // Alice
            '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // Bob
            // ...
        ];
    }
}
