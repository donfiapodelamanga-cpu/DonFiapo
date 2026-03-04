import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";

// ─── ABIs (imported from existing lib) ───────────────────────────────────────
async function loadAbi(name: string) {
  const mod = await import(`@/lib/api/${name}`);
  return mod.default ?? mod;
}

async function loadMarketplaceAbi() {
  try {
    const mod = await import("@/lib/contracts/fiapo_marketplace.json");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

const RPC_ENDPOINTS = [
  process.env.LUNES_RPC_WS ?? "wss://ws.lunes.io",
  "wss://ws-lunes-main-01.lunes.io",
  "wss://ws-lunes-main-02.lunes.io",
];

let _api: ApiPromise | null = null;

async function getApi(): Promise<ApiPromise | null> {
  if (_api?.isConnected) return _api;

  for (const rpc of RPC_ENDPOINTS) {
    try {
      const provider = new WsProvider(rpc, false);
      const api = await ApiPromise.create({ provider, noInitWarn: true });
      await api.isReady;
      _api = api;
      return api;
    } catch {
      // try next
    }
  }
  return null;
}

function gasLimit(api: ApiPromise) {
  return {
    gasLimit: api.registry.createType("WeightV2", {
      refTime: 6_000_000_000,
      proofSize: 131_072,
    }) as any,
  };
}

// ─── NFT verification ─────────────────────────────────────────────────────────

/**
 * Verifies that `wallet` owns at least one NFT of the given `nftType` (0=Free, 1=Bronze, …, 6=Legendary).
 * Uses the ICO contract query `get_user_nfts(owner)`.
 */
export async function verifyNFTOwnership(
  wallet: string,
  nftType: number | null // null = any NFT
): Promise<{ verified: boolean; reason?: string; nftCount?: number }> {
  try {
    const api = await getApi();
    if (!api) return { verified: false, reason: "Blockchain node unreachable" };

    const icoAddress = process.env.NEXT_PUBLIC_ICO_CONTRACT;
    if (!icoAddress) return { verified: false, reason: "ICO contract address not configured" };

    const abi = await loadAbi("contract-abi");
    const contract = new ContractPromise(api, abi, icoAddress);

    const { result, output } = await contract.query.getUserNfts(
      wallet,
      gasLimit(api),
      wallet
    );

    if (!result.isOk || !output) {
      return { verified: false, reason: "Failed to query NFT data from contract" };
    }

    const data = output.toHuman() as any;
    const nftList: any[] = data?.Ok ?? data ?? [];

    if (!Array.isArray(nftList)) {
      return { verified: false, reason: "Unexpected contract response format" };
    }

    if (nftType === null) {
      // Any NFT counts
      if (nftList.length > 0) {
        return { verified: true, nftCount: nftList.length };
      }
      return { verified: false, reason: "No NFTs found for this wallet" };
    }

    // Filter by type
    const matchingNFTs = nftList.filter((nft: any) => {
      const typeVal = nft?.nftType;
      // Contract returns enum as string ("Free", "Tier2", …) or number
      if (typeof typeVal === "string") {
        const typeMap: Record<string, number> = {
          Free: 0, Tier2: 1, Tier3: 2, Tier4: 3, Tier5: 4, Tier6: 5, Tier7: 6,
        };
        return (typeMap[typeVal] ?? -1) === nftType;
      }
      return parseInt(String(typeVal).replace(/,/g, ""), 10) === nftType;
    });

    if (matchingNFTs.length > 0) {
      return { verified: true, nftCount: matchingNFTs.length };
    }

    return { verified: false, reason: `No NFT of type ${nftType} found for this wallet` };
  } catch (err: any) {
    return { verified: false, reason: `On-chain query error: ${err?.message ?? "unknown"}` };
  }
}

// ─── Staking verification ────────────────────────────────────────────────────

/**
 * Verifies that `wallet` has an active staking position in `stakingType`.
 * stakingType: "don-burn" | "don-lunes" | "don-fiapo" | null (any pool)
 */
export async function verifyStakingPosition(
  wallet: string,
  stakingType: string | null
): Promise<{ verified: boolean; reason?: string; stakedAmount?: string }> {
  try {
    const api = await getApi();
    if (!api) return { verified: false, reason: "Blockchain node unreachable" };

    const stakingAddress = process.env.NEXT_PUBLIC_STAKING_CONTRACT;
    if (!stakingAddress) return { verified: false, reason: "Staking contract address not configured" };

    const stakingAbi = await loadAbi("staking-api").catch(() => null) ??
                       await loadAbi("contract-abi");
    const contract = new ContractPromise(api, stakingAbi, stakingAddress);

    const poolsToCheck = stakingType
      ? [stakingType]
      : ["don-burn", "don-lunes", "don-fiapo"];

    for (const pool of poolsToCheck) {
      try {
        const { result, output } = await contract.query.getStakingPosition(
          wallet,
          gasLimit(api),
          wallet,
          pool
        );

        if (!result.isOk || !output) continue;

        const data = output.toHuman() as any;
        const position = data?.Ok ?? data;

        if (!position) continue;

        const amountStr = position?.amount ?? position?.stakedAmount ?? "0";
        const amount = BigInt(String(amountStr).replace(/,/g, ""));

        if (amount > BigInt(0)) {
          return {
            verified: true,
            stakedAmount: amount.toString(),
          };
        }
      } catch {
        continue;
      }
    }

    return {
      verified: false,
      reason: stakingType
        ? `No active stake found in pool "${stakingType}"`
        : "No active stake found in any pool",
    };
  } catch (err: any) {
    return { verified: false, reason: `On-chain query error: ${err?.message ?? "unknown"}` };
  }
}

// ─── Spin Game verification ───────────────────────────────────────────────────

/**
 * Verifies that `wallet` has played the Spin Game at least once.
 * Queries `get_user_spins(wallet)` or `get_spin_history(wallet)`.
 */
export async function verifySpinPlayed(
  wallet: string
): Promise<{ verified: boolean; reason?: string; spinCount?: number }> {
  try {
    const api = await getApi();
    if (!api) return { verified: false, reason: "Blockchain node unreachable" };

    const spinAddress = process.env.NEXT_PUBLIC_SPIN_GAME_CONTRACT;
    if (!spinAddress) return { verified: false, reason: "Spin Game contract address not configured" };

    const spinAbi = await loadAbi("spin-game-abi").catch(() => null) ??
                    await loadAbi("contract-abi");
    const contract = new ContractPromise(api, spinAbi, spinAddress);

    // Try get_user_spins first, fallback to get_spin_count
    let spinCount = 0;

    try {
      const { result, output } = await contract.query.getUserSpins(
        wallet,
        gasLimit(api),
        wallet
      );
      if (result.isOk && output) {
        const data = output.toHuman() as any;
        const spins: any[] = data?.Ok ?? data ?? [];
        spinCount = Array.isArray(spins) ? spins.length : parseInt(String(spins).replace(/,/g, ""), 10) || 0;
      }
    } catch {
      // Try alternative method
      try {
        const { result, output } = await contract.query.getSpinCount(
          wallet,
          gasLimit(api),
          wallet
        );
        if (result.isOk && output) {
          const data = output.toHuman() as any;
          spinCount = parseInt(String(data?.Ok ?? data ?? "0").replace(/,/g, ""), 10) || 0;
        }
      } catch {
        return { verified: false, reason: "Spin Game contract query failed" };
      }
    }

    if (spinCount > 0) {
      return { verified: true, spinCount };
    }

    return { verified: false, reason: "No spins played yet for this wallet" };
  } catch (err: any) {
    return { verified: false, reason: `On-chain query error: ${err?.message ?? "unknown"}` };
  }
}

// ─── Marketplace helpers ───────────────────────────────────────────────────────

async function getMarketplaceContract(): Promise<{ api: ApiPromise; contract: ContractPromise } | null> {
  const api = await getApi();
  if (!api) return null;

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT;
  if (!marketplaceAddress) return null;

  const abi = await loadMarketplaceAbi() ?? await loadAbi("contract-abi");
  const contract = new ContractPromise(api, abi, marketplaceAddress);
  return { api, contract };
}

function parseNum(val: any): number {
  return parseInt(String(val ?? "0").replace(/,/g, ""), 10) || 0;
}

// ─── Marketplace volume helpers ────────────────────────────────────────────────

/** Returns IDs from a query returning Vec<u32> */
async function queryIdList(contract: ContractPromise, api: ApiPromise, caller: string, methodName: string): Promise<number[]> {
  try {
    const { result, output } = await (contract.query as any)[methodName](caller, gasLimit(api));
    if (!result.isOk || !output) return [];
    const data = output.toHuman() as any;
    const arr = data?.Ok ?? data;
    if (!Array.isArray(arr)) return [];
    return arr.map(parseNum);
  } catch { return []; }
}

// ─── Sell NFT — volume-aware ───────────────────────────────────────────────────

/**
 * Counts how many active listings on the marketplace have `seller === wallet`.
 * minCount: minimum required to pass.
 */
export async function verifyNFTListed(
  wallet: string,
  minCount = 1
): Promise<{ verified: boolean; reason?: string; count: number; required: number }> {
  const base = { count: 0, required: minCount };
  try {
    const ctx = await getMarketplaceContract();
    if (!ctx) return { verified: false, reason: "Marketplace contract not available", ...base };

    const { api, contract } = ctx;
    const listingIds = await queryIdList(contract, api, wallet, "getActiveListings");

    let count = 0;
    for (const nftId of listingIds.slice(0, 100)) {
      try {
        const { result, output } = await contract.query.getListing(wallet, gasLimit(api), nftId);
        if (result.isOk && output) {
          const raw = output.toHuman() as any;
          const listing = raw?.Ok ?? raw;
          if (listing && listing !== "None" && listing?.seller === wallet) count++;
        }
      } catch { continue; }
    }

    if (count >= minCount) return { verified: true, count, required: minCount };
    return {
      verified: false,
      reason: `You have ${count}/${minCount} active listings. List more NFTs on the marketplace.`,
      count,
      required: minCount,
    };
  } catch (err: any) {
    return { verified: false, reason: `On-chain query error: ${err?.message ?? "unknown"}`, ...base };
  }
}

// ─── Buy NFT — volume-aware ────────────────────────────────────────────────────

/**
 * Counts NFTs owned by wallet (proxy for purchases + mints).
 * For marketplace-specific buy verification we count:
 *   1. Active auctions where wallet is highestBidder.
 *   2. Total NFTs owned (includes bought ones) — used for volume tiers.
 * minCount: minimum required.
 */
export async function verifyNFTPurchased(
  wallet: string,
  minCount = 1
): Promise<{ verified: boolean; reason?: string; count: number; required: number }> {
  const base = { count: 0, required: minCount };
  try {
    const api = await getApi();
    if (!api) return { verified: false, reason: "Blockchain node unreachable", ...base };

    const ctx = await getMarketplaceContract();
    if (!ctx) return { verified: false, reason: "Marketplace contract not available", ...base };

    const { contract } = ctx;
    let count = 0;

    // Count auctions where wallet is highestBidder
    const auctionIds = await queryIdList(contract, api, wallet, "getActiveAuctions");
    for (const auctionId of auctionIds.slice(0, 100)) {
      try {
        const { result, output } = await contract.query.getAuction(wallet, gasLimit(api), auctionId);
        if (result.isOk && output) {
          const raw = output.toHuman() as any;
          const auction = raw?.Ok ?? raw;
          if (auction && auction !== "None" && auction?.highestBidder === wallet) count++;
        }
      } catch { continue; }
    }

    // Fallback: count NFTs owned via ICO contract (includes purchased)
    if (count < minCount) {
      const icoAddress = process.env.NEXT_PUBLIC_ICO_CONTRACT;
      if (icoAddress) {
        try {
          const icoAbi = await loadAbi("contract-abi");
          const icoContract = new ContractPromise(api, icoAbi, icoAddress);
          const { result, output } = await icoContract.query.getUserNfts(wallet, gasLimit(api), wallet);
          if (result.isOk && output) {
            const data = output.toHuman() as any;
            const nftList: any[] = data?.Ok ?? data ?? [];
            if (Array.isArray(nftList)) count = Math.max(count, nftList.length);
          }
        } catch { /* ignore */ }
      }
    }

    if (count >= minCount) return { verified: true, count, required: minCount };
    return {
      verified: false,
      reason: `You have ${count}/${minCount} NFTs. Buy more from the marketplace.`,
      count,
      required: minCount,
    };
  } catch (err: any) {
    return { verified: false, reason: `On-chain query error: ${err?.message ?? "unknown"}`, ...base };
  }
}

// ─── Trade NFT — volume-aware ──────────────────────────────────────────────────

/**
 * Counts active trades where wallet is offerer or counterparty.
 * minCount: minimum required.
 */
export async function verifyNFTTraded(
  wallet: string,
  minCount = 1
): Promise<{ verified: boolean; reason?: string; count: number; required: number }> {
  const base = { count: 0, required: minCount };
  try {
    const ctx = await getMarketplaceContract();
    if (!ctx) return { verified: false, reason: "Marketplace contract not available", ...base };

    const { api, contract } = ctx;
    const tradeIds = await queryIdList(contract, api, wallet, "getActiveTrades");

    let count = 0;
    for (const tradeId of tradeIds.slice(0, 100)) {
      try {
        const { result, output } = await contract.query.getTrade(wallet, gasLimit(api), tradeId);
        if (result.isOk && output) {
          const raw = output.toHuman() as any;
          const trade = raw?.Ok ?? raw;
          if (trade && trade !== "None" && (trade?.offerer === wallet || trade?.counterparty === wallet)) count++;
        }
      } catch { continue; }
    }

    if (count >= minCount) return { verified: true, count, required: minCount };
    return {
      verified: false,
      reason: `You have ${count}/${minCount} trade offers. Create or accept more trades on the marketplace.`,
      count,
      required: minCount,
    };
  } catch (err: any) {
    return { verified: false, reason: `On-chain query error: ${err?.message ?? "unknown"}`, ...base };
  }
}

// ─── Bid on Auction — volume-aware ────────────────────────────────────────────

/**
 * Counts auctions where wallet is highestBidder.
 * minCount: minimum required.
 */
export async function verifyAuctionBid(
  wallet: string,
  minCount = 1
): Promise<{ verified: boolean; reason?: string; count: number; required: number }> {
  const base = { count: 0, required: minCount };
  try {
    const ctx = await getMarketplaceContract();
    if (!ctx) return { verified: false, reason: "Marketplace contract not available", ...base };

    const { api, contract } = ctx;
    const auctionIds = await queryIdList(contract, api, wallet, "getActiveAuctions");

    let count = 0;
    for (const auctionId of auctionIds.slice(0, 100)) {
      try {
        const { result, output } = await contract.query.getAuction(wallet, gasLimit(api), auctionId);
        if (result.isOk && output) {
          const raw = output.toHuman() as any;
          const auction = raw?.Ok ?? raw;
          if (auction && auction !== "None" && auction?.highestBidder === wallet) count++;
        }
      } catch { continue; }
    }

    if (count >= minCount) return { verified: true, count, required: minCount };
    return {
      verified: false,
      reason: `You are leading ${count}/${minCount} auctions. Place bids on more auctions.`,
      count,
      required: minCount,
    };
  } catch (err: any) {
    return { verified: false, reason: `On-chain query error: ${err?.message ?? "unknown"}`, ...base };
  }
}
