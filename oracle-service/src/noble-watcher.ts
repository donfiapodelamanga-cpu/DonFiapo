import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';

// Load ABI
const loadAbi = () => {
    const abiPath = path.join(__dirname, 'noble_affiliate.json');
    if (!fs.existsSync(abiPath)) {
        throw new Error(`Noble Affiliate ABI not found at: ${abiPath}`);
    }
    return JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
};

const NOBLE_ABI = loadAbi();

export class NobleWatcher {
    private api: ApiPromise | null = null;
    private contract: ContractPromise | null = null;
    private isConnected: boolean = false;

    constructor(
        private readonly rpcUrls: string[],
        private readonly contractAddress: string
    ) { }

    async start() {
        if (this.isConnected) return;

        console.log(`Starting Noble Watcher for contract: ${this.contractAddress}`);
        const provider = new WsProvider(this.rpcUrls);
        this.api = await ApiPromise.create({ provider });

        this.contract = new ContractPromise(this.api, NOBLE_ABI, this.contractAddress);
        this.isConnected = true;

        console.log('✅ Noble Watcher connected. Listening for events...');
        this.subscribeToEvents();
    }

    private async subscribeToEvents() {
        if (!this.api || !this.contract) return;

        this.api.query.system.events((events: any[]) => {
            events.forEach((record: any) => {
                const { event } = record;

                if (this.api?.events.contracts.ContractEmitted.is(event)) {
                    const [account, data] = event.data;

                    // Filter by our contract address
                    if (account.toString() === this.contractAddress) {
                        try {
                            const decoded = this.contract?.abi.decodeEvent(data as any);
                            if (decoded?.event.identifier === 'SolanaWithdrawalRequested') {
                                this.handleWithdrawalRequest(decoded.args);
                            }
                        } catch (e) {
                            console.error('Failed to decode event:', e);
                        }
                    }
                }
            });
        });
    }

    private handleWithdrawalRequest(args: any[]) {
        // ABI Event: SolanaWithdrawalRequested { noble: AccountId, amount: Balance, solana_wallet: Vec<u8> }
        // args[0] = noble
        // args[1] = amount
        // args[2] = solana_wallet (Codec wrapping Vec<u8>)

        try {
            const noble = args[0].toString();
            // Amount is Balance (u128), typically represented as comma-separated string or raw int string by JS API
            const amount = args[1].toString();

            // Handle Vec<u8>
            // PolkadotJS Codec `.toU8a()` gets the encoded bytes.
            // If the codec matches the type, `toU8a(true)` might unwrap.
            // Let's assume `args[2]` is the Vec<u8> Codec.
            // Constructing new Uint8Array from it usually works for Codec types.

            const rawBytes = new Uint8Array(args[2] as any);
            const solanaAddress = bs58.encode(rawBytes);

            console.log('\n🚨 SOLANA WITHDRAWAL REQUEST DETECTED 🚨');
            console.log(`   Noble (Lunes): ${noble}`);
            console.log(`   Amount (Lunes): ${amount}`);
            console.log(`   Solana Wallet: ${solanaAddress}`);
            console.log('----------------------------------------\n');

        } catch (e) {
            console.error('Error parsing withdrawal event:', e);
            console.log('Raw Args:', args.map(a => a.toString()));
        }
    }
}
