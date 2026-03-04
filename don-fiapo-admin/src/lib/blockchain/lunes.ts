/**
 * Lunes Network (Substrate) On-Chain Balance Service
 * 
 * Queries real balances from Lunes Network via WSS RPC:
 * - Native LUNES balance (system.account)
 * - PSP22 FIAPO token balance (via contract query)
 */

import { ApiPromise, WsProvider } from "@polkadot/api";

const LUNES_RPC = process.env.LUNES_RPC_URL || "wss://ws.lunes.io";
const LUNES_DECIMALS = 8;
const FIAPO_DECIMALS = 8;

let apiInstance: ApiPromise | null = null;
let connectionPromise: Promise<ApiPromise> | null = null;

/**
 * Get or create a persistent API connection to Lunes Network
 */
async function getApi(): Promise<ApiPromise> {
    if (apiInstance && apiInstance.isConnected) {
        return apiInstance;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = (async () => {
        try {
            console.log(`[Lunes] Connecting to ${LUNES_RPC}...`);
            const provider = new WsProvider(LUNES_RPC, 5000); // 5s timeout
            const api = await ApiPromise.create({
                provider,
                noInitWarn: true,
            });
            await api.isReady;
            console.log(`[Lunes] Connected to chain: ${(await api.rpc.system.chain()).toString()}`);
            apiInstance = api;

            // Handle disconnects
            provider.on("disconnected", () => {
                console.warn("[Lunes] Disconnected from RPC");
                apiInstance = null;
                connectionPromise = null;
            });

            return api;
        } catch (error) {
            console.error("[Lunes] Connection failed:", error);
            connectionPromise = null;
            throw error;
        }
    })();

    return connectionPromise;
}

export interface LunesBalance {
    free: bigint;
    reserved: bigint;
    total: bigint;
    formatted: string;
    decimals: number;
}

/**
 * Query native LUNES balance for an address
 */
export async function getLunesBalance(address: string): Promise<LunesBalance> {
    const api = await getApi();
    const { data } = await api.query.system.account(address) as any;

    const free = BigInt(data.free.toString());
    const reserved = BigInt(data.reserved.toString());
    const total = free + reserved;

    return {
        free,
        reserved,
        total,
        formatted: formatBalance(free, LUNES_DECIMALS),
        decimals: LUNES_DECIMALS,
    };
}

export interface PSP22Balance {
    balance: bigint;
    formatted: string;
    decimals: number;
}

/**
 * Query PSP22 (FIAPO) token balance via contract dry-run call
 * Uses the standard PSP22 `balance_of` selector
 */
export async function getFiapoBalance(
    contractAddress: string,
    accountAddress: string
): Promise<PSP22Balance> {
    const api = await getApi();

    // PSP22 balance_of selector: 0x6568382f (from ink! PSP22 standard)
    const BALANCE_OF_SELECTOR = "0x6568382f";

    try {
        // Encode the call data: selector + account parameter
        const callData = api.registry.createType("Raw",
            BALANCE_OF_SELECTOR +
            api.registry.createType("AccountId", accountAddress).toHex().slice(2)
        );

        const result = await api.call.contractsApi.call(
            accountAddress, // origin
            contractAddress, // dest
            0, // value
            null, // gasLimit (null = unlimited for dry-run)
            null, // storageDepositLimit
            callData.toHex()
        ) as any;

        if (result.result?.isOk) {
            const outputData = result.result.asOk.data;
            // PSP22 returns Result<Balance, PSP22Error>
            // Ok variant starts with 0x00 prefix, then the u128 LE-encoded balance
            const hex = outputData.toHex();

            // Skip the "Ok" enum prefix (0x00) = 2 chars after 0x
            const balanceHex = hex.slice(4); // skip "0x00"

            // Parse u128 from little-endian hex (32 chars = 16 bytes)
            const leBytes = balanceHex.slice(0, 32).padEnd(32, "0");
            let balance = BigInt(0);
            for (let i = 0; i < 32; i += 2) {
                const byte = BigInt(parseInt(leBytes.slice(i, i + 2), 16));
                balance += byte << BigInt((i / 2) * 8);
            }

            return {
                balance,
                formatted: formatBalance(balance, FIAPO_DECIMALS),
                decimals: FIAPO_DECIMALS,
            };
        }

        console.warn("[Lunes] PSP22 query failed:", result.result?.asErr?.toString());
        return { balance: BigInt(0), formatted: "0.00", decimals: FIAPO_DECIMALS };
    } catch (error) {
        console.error("[Lunes] PSP22 balance query error:", error);
        return { balance: BigInt(0), formatted: "0.00", decimals: FIAPO_DECIMALS };
    }
}

/**
 * Get all treasury balances from Lunes Network
 */
export async function getLunesTreasuryBalances(): Promise<{
    wallets: Array<{
        address: string;
        name: string;
        lunesBalance: LunesBalance;
        fiapoBalance: PSP22Balance | null;
    }>;
    chainInfo: {
        chain: string;
        connected: boolean;
        rpc: string;
    };
}> {
    const teamWallet = process.env.LUNES_TEAM_WALLET;
    const burnWallet = process.env.LUNES_BURN_WALLET;
    const coreContract = process.env.LUNES_CORE_CONTRACT;

    const walletConfigs = [
        { address: teamWallet, name: "Team Wallet" },
        { address: burnWallet, name: "Burn Wallet" },
    ].filter(w => w.address) as { address: string; name: string }[];

    if (walletConfigs.length === 0) {
        return {
            wallets: [],
            chainInfo: { chain: "Lunes", connected: false, rpc: LUNES_RPC },
        };
    }

    try {
        const api = await getApi();
        const chain = (await api.rpc.system.chain()).toString();

        const wallets = await Promise.all(
            walletConfigs.map(async (config) => {
                const lunesBalance = await getLunesBalance(config.address);
                let fiapoBalance: PSP22Balance | null = null;

                if (coreContract) {
                    fiapoBalance = await getFiapoBalance(coreContract, config.address);
                }

                return {
                    address: config.address,
                    name: config.name,
                    lunesBalance,
                    fiapoBalance,
                };
            })
        );

        return {
            wallets,
            chainInfo: { chain, connected: true, rpc: LUNES_RPC },
        };
    } catch (error) {
        console.error("[Lunes] Treasury query error:", error);
        return {
            wallets: [],
            chainInfo: { chain: "Lunes", connected: false, rpc: LUNES_RPC },
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

/**
 * Disconnect from Lunes Network (cleanup)
 */
export async function disconnectLunes(): Promise<void> {
    if (apiInstance) {
        await apiInstance.disconnect();
        apiInstance = null;
        connectionPromise = null;
    }
}
