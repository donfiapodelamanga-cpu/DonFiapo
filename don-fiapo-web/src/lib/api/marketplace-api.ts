/**
 * Marketplace Contract API
 * 
 * Conexão separada com o contrato FiapoMarketplace.
 * O marketplace é um contrato independente do ICO.
 */

import type { ContractPromise } from '@polkadot/api-contract';
import { API_CONFIG } from './config';
import { parseBigInt, parseNum, getGasLimit, initializeContract, decodeContractError } from './contract';
import type { Listing, Auction, TradeOffer, MarketplaceStats } from './contract-abi';

// Module-level cache for marketplace contract
let marketplaceContract: ContractPromise | null = null;
let marketplaceApi: any = null;

/**
 * Get injector for signing transactions
 */
async function getInjector(address: string) {
  const { web3FromAddress } = await import('@polkadot/extension-dapp');
  return web3FromAddress(address);
}

/**
 * Initialize marketplace contract connection.
 * Reuses the API connection from the main contract module.
 */
async function getMarketplaceContract(): Promise<ContractPromise | null> {
  if (typeof window === 'undefined') return null;

  if (marketplaceContract && marketplaceApi?.isConnected) {
    return marketplaceContract;
  }

  try {
    // Reuse the API connection from the main contract
    const icoContract = await initializeContract();
    if (!icoContract) return null;

    marketplaceApi = icoContract.api as any;

    const marketplaceAddress = API_CONFIG.contracts.marketplace;
    if (!marketplaceAddress) {
      console.warn('[Marketplace] No marketplace contract address configured');
      return null;
    }

    const { ContractPromise: ContractPromiseClass } = await import('@polkadot/api-contract');

    // Load marketplace ABI metadata
    // After `cargo contract build`, copy the .json to src/lib/contracts/
    let metadata: any;
    try {
      metadata = (await import('../contracts/fiapo_marketplace.json')).default;
    } catch {
      console.warn('[Marketplace] No marketplace ABI found at src/lib/contracts/fiapo_marketplace.json');
      console.warn('[Marketplace] Build the contract and copy the metadata JSON to enable marketplace features.');
      return null;
    }

    marketplaceContract = new ContractPromiseClass(
      marketplaceApi as any,
      metadata,
      marketplaceAddress
    );

    console.log('[Marketplace] Connected to marketplace contract:', marketplaceAddress);
    return marketplaceContract;
  } catch (error) {
    console.warn('[Marketplace] Failed to connect:', error);
    return null;
  }
}

/**
 * Helper: sign and send a transaction with proper error handling
 * @param nativeValue - optional: valor em moeda nativa (LUNES) para mensagens payable
 */
async function signAndSendTx(
  address: string,
  txBuilder: (contract: ContractPromise, gasOpts: any) => any,
  nativeValue?: string
): Promise<string> {
  const contract = await getMarketplaceContract();
  if (!contract) throw new Error('Marketplace contract not available');

  const injector = await getInjector(address);
  const gasOpts = {
    gasLimit: getGasLimit(contract.api).gasLimit,
    storageDepositLimit: null,
    value: nativeValue || 0,
  };
  const tx = txBuilder(contract, gasOpts);

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }: any) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError, contract.api)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/** Cache para evitar queries repetidas de modo de pagamento */
let _modeCache: { value: 0 | 2; ts: number } | null = null;
export async function getCachedPaymentMode(): Promise<0 | 2> {
  if (_modeCache && Date.now() - _modeCache.ts < 60000) return _modeCache.value;
  const m = await getPaymentMode();
  _modeCache = { value: m, ts: Date.now() };
  return m;
}

// ==================== View Functions ====================

/**
 * Retorna modo de pagamento: 0=só LUNES (ICO ativa), 2=LUNES+FIAPO (após ICO)
 */
export async function getPaymentMode(): Promise<0 | 2> {
  const contract = await getMarketplaceContract();
  if (!contract) return 0;

  try {
    const { result, output } = await contract.query.payment_mode(
      contract.address,
      getGasLimit(contract.api)
    );
    if (result.isOk && output) {
      const val = output.toHuman() as any;
      const code = val?.Ok ?? val;
      return (code === 2 || code === '2') ? 2 : 0;
    }
  } catch (e) {
    console.error('[Marketplace] Failed to get payment mode:', e);
  }
  return 0;
}

/** Helper: converte currency code (0/1) para label */
export function currencyLabel(code: number): 'LUNES' | 'FIAPO' {
  return code === 1 ? 'FIAPO' : 'LUNES';
}

/**
 * Check if ICO sales are completed (price restrictions lifted)
 */
export async function isIcoSalesCompleted(): Promise<boolean> {
  const contract = await getMarketplaceContract();
  if (!contract) return false;

  try {
    const { result, output } = await contract.query.is_ico_sales_completed(
      contract.address,
      getGasLimit(contract.api)
    );
    if (result.isOk && output) {
      const val = output.toHuman();
      if (typeof val === 'object' && val !== null && 'Ok' in (val as any)) {
        return (val as any).Ok === true || (val as any).Ok === 'true';
      }
      return val === true || val === 'true';
    }
  } catch (e) {
    console.error('[Marketplace] Failed to check ICO sales status:', e);
  }
  return false;
}

/**
 * Get minimum price for a tier (in FIAPO tokens)
 */
export async function getMinPrice(tier: number): Promise<bigint> {
  const contract = await getMarketplaceContract();
  if (!contract) return BigInt(0);

  try {
    const { result, output } = await contract.query.get_min_price(
      contract.address,
      getGasLimit(contract.api),
      tier
    );
    if (result.isOk && output) {
      const val = output.toHuman() as any;
      const data = val?.Ok ?? val;
      return parseBigInt(data);
    }
  } catch (e) {
    console.error('[Marketplace] Failed to get min price:', e);
  }
  return BigInt(0);
}

/**
 * Get marketplace stats
 */
export async function getMarketplaceStats(): Promise<MarketplaceStats | null> {
  const contract = await getMarketplaceContract();
  if (!contract) return null;

  try {
    const { result, output } = await contract.query.get_stats(
      contract.address,
      getGasLimit(contract.api)
    );
    if (result.isOk && output) {
      const raw = output.toHuman() as any;
      const data = raw?.Ok ?? raw;
      if (Array.isArray(data) && data.length >= 4) {
        return {
          totalVolume: parseBigInt(data[0]),
          totalFeesCollected: parseBigInt(data[1]),
          totalAuctionsCompleted: parseNum(data[2]),
          totalTradesCompleted: parseNum(data[3]),
        };
      }
    }
  } catch (e) {
    console.error('[Marketplace] Failed to get stats:', e);
  }
  return null;
}

// ==================== Listings ====================

/**
 * Get all active listing NFT IDs
 */
export async function getActiveListings(): Promise<number[]> {
  const contract = await getMarketplaceContract();
  if (!contract) return [];

  try {
    const { result, output } = await contract.query.get_active_listings(
      contract.address,
      getGasLimit(contract.api)
    );
    if (result.isOk && output) {
      const data = output.toHuman() as any;
      const arr = data?.Ok ?? data;
      if (Array.isArray(arr)) {
        return arr.map((id: any) => parseNum(id));
      }
    }
  } catch (e) {
    console.error('[Marketplace] Failed to fetch active listings:', e);
  }
  return [];
}

/**
 * Get listing details for an NFT
 */
export async function getListing(nftId: number): Promise<Listing | null> {
  const contract = await getMarketplaceContract();
  if (!contract) return null;

  try {
    const { result, output } = await contract.query.get_listing(
      contract.address,
      getGasLimit(contract.api),
      nftId
    );
    if (result.isOk && output) {
      const raw = output.toHuman() as any;
      const val = raw?.Ok ?? raw;
      if (!val || val === 'None' || val === null) return null;

      return {
        nftId: parseNum(val.nftId ?? val.nft_id),
        seller: val.seller,
        price: parseBigInt(val.price),
        nftTier: parseNum(val.nftTier ?? val.nft_tier),
        currency: parseNum(val.currency ?? 0),
        active: val.active === true || val.active === 'true',
      };
    }
  } catch (e) {
    console.error('[Marketplace] Failed to fetch listing:', e);
  }
  return null;
}

/**
 * List an NFT for direct sale
 * @param currency 0=LUNES, 1=FIAPO (FIAPO só após ICO)
 */
export async function listNFT(
  address: string,
  nftId: number,
  price: string,
  nftTier: number,
  currency: number = 0
): Promise<string> {
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.list_nft(gasOpts, nftId, price, nftTier, currency)
  );
}

/**
 * Buy an NFT (direct sale)
 * @param listingCurrency 0=LUNES(enviar nativo), 1=FIAPO(PSP22 approved)
 * @param price preço da listing (usado como value nativo se LUNES)
 */
export async function buyNFT(address: string, nftId: number, price: string, listingCurrency: number = 0): Promise<string> {
  const nativeValue = listingCurrency === 0 ? price : undefined;
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.buy_nft(gasOpts, nftId)
  , nativeValue);
}

/**
 * Buy an NFT with affiliate code
 */
export async function buyNFTWithCode(address: string, nftId: number, affiliateCode: string, price: string, listingCurrency: number = 0): Promise<string> {
  const nativeValue = listingCurrency === 0 ? price : undefined;
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.buy_nft_with_code(gasOpts, nftId, affiliateCode)
  , nativeValue);
}

/**
 * Cancel a listing
 */
export async function cancelListing(address: string, nftId: number): Promise<string> {
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.cancel_listing(gasOpts, nftId)
  );
}

// ==================== Auctions ====================

/**
 * Get all active auction IDs
 */
export async function getActiveAuctions(): Promise<number[]> {
  const contract = await getMarketplaceContract();
  if (!contract) return [];

  try {
    const { result, output } = await contract.query.get_active_auctions(
      contract.address,
      getGasLimit(contract.api)
    );
    if (result.isOk && output) {
      const data = output.toHuman() as any;
      const arr = data?.Ok ?? data;
      if (Array.isArray(arr)) {
        return arr.map((id: any) => parseNum(id));
      }
    }
  } catch (e) {
    console.error('[Marketplace] Failed to fetch active auctions:', e);
  }
  return [];
}

/**
 * Get auction details
 */
export async function getAuction(auctionId: number): Promise<Auction | null> {
  const contract = await getMarketplaceContract();
  if (!contract) return null;

  try {
    const { result, output } = await contract.query.get_auction(
      contract.address,
      getGasLimit(contract.api),
      auctionId
    );
    if (result.isOk && output) {
      const raw = output.toHuman() as any;
      const val = raw?.Ok ?? raw;
      if (!val || val === 'None' || val === null) return null;

      return {
        auctionId: parseNum(val.auctionId ?? val.auction_id),
        nftId: parseNum(val.nftId ?? val.nft_id),
        seller: val.seller,
        minPrice: parseBigInt(val.minPrice ?? val.min_price),
        highestBid: parseBigInt(val.highestBid ?? val.highest_bid),
        highestBidder: val.highestBidder ?? val.highest_bidder ?? null,
        endTime: parseNum(val.endTime ?? val.end_time),
        nftTier: parseNum(val.nftTier ?? val.nft_tier),
        currency: parseNum(val.currency ?? 0),
        active: val.active === true || val.active === 'true',
        finalized: val.finalized === true || val.finalized === 'true',
      };
    }
  } catch (e) {
    console.error('[Marketplace] Failed to fetch auction:', e);
  }
  return null;
}

/**
 * Create an auction
 * @param currency 0=LUNES, 1=FIAPO (FIAPO só após ICO)
 */
export async function createAuction(
  address: string,
  nftId: number,
  minPrice: string,
  nftTier: number,
  durationSecs: number,
  currency: number = 0
): Promise<string> {
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.create_auction(gasOpts, nftId, minPrice, nftTier, durationSecs, currency)
  );
}

/**
 * Place a bid on an auction
 * @param auctionCurrency 0=LUNES(enviar nativo), 1=FIAPO(PSP22)
 */
export async function placeBid(address: string, auctionId: number, amount: string, auctionCurrency: number = 0): Promise<string> {
  const nativeValue = auctionCurrency === 0 ? amount : undefined;
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.place_bid(gasOpts, auctionId, amount)
  , nativeValue);
}

/**
 * Finalize an ended auction
 */
export async function finalizeAuction(address: string, auctionId: number): Promise<string> {
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.finalize_auction(gasOpts, auctionId)
  );
}

/**
 * Cancel an auction (only seller, no bids)
 */
export async function cancelAuction(address: string, auctionId: number): Promise<string> {
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.cancel_auction(gasOpts, auctionId)
  );
}

// ==================== Trades ====================

/**
 * Get all active trade IDs
 */
export async function getActiveTrades(): Promise<number[]> {
  const contract = await getMarketplaceContract();
  if (!contract) return [];

  try {
    const { result, output } = await contract.query.get_active_trades(
      contract.address,
      getGasLimit(contract.api)
    );
    if (result.isOk && output) {
      const data = output.toHuman() as any;
      const arr = data?.Ok ?? data;
      if (Array.isArray(arr)) {
        return arr.map((id: any) => parseNum(id));
      }
    }
  } catch (e) {
    console.error('[Marketplace] Failed to fetch active trades:', e);
  }
  return [];
}

/**
 * Get trade details
 */
export async function getTrade(tradeId: number): Promise<TradeOffer | null> {
  const contract = await getMarketplaceContract();
  if (!contract) return null;

  try {
    const { result, output } = await contract.query.get_trade(
      contract.address,
      getGasLimit(contract.api),
      tradeId
    );
    if (result.isOk && output) {
      const raw = output.toHuman() as any;
      const val = raw?.Ok ?? raw;
      if (!val || val === 'None' || val === null) return null;

      return {
        tradeId: parseNum(val.tradeId ?? val.trade_id),
        nftIdOffered: parseNum(val.nftIdOffered ?? val.nft_id_offered),
        offerer: val.offerer,
        nftIdWanted: parseNum(val.nftIdWanted ?? val.nft_id_wanted),
        wantedTier: val.wantedTier ?? val.wanted_tier ?? null,
        counterparty: val.counterparty ?? null,
        active: val.active === true || val.active === 'true',
      };
    }
  } catch (e) {
    console.error('[Marketplace] Failed to fetch trade:', e);
  }
  return null;
}

/**
 * Create a trade offer
 */
export async function createTrade(
  address: string,
  nftIdOffered: number,
  nftIdWanted: number,
  wantedTier: number | null,
  counterparty: string | null
): Promise<string> {
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.create_trade(gasOpts, nftIdOffered, nftIdWanted, wantedTier, counterparty)
  );
}

/**
 * Accept a trade offer
 * Taxa de troca é payable (LUNES nativo) — enviar tradeFee como value
 * @param tradeFee - valor da taxa em LUNES nativo (se aplicável)
 */
export async function acceptTrade(address: string, tradeId: number, acceptorNftId: number, tradeFee?: string): Promise<string> {
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.accept_trade(gasOpts, tradeId, acceptorNftId)
  , tradeFee);
}

/**
 * Cancel a trade offer
 */
export async function cancelTrade(address: string, tradeId: number): Promise<string> {
  return signAndSendTx(address, (contract, gasOpts) =>
    contract.tx.cancel_trade(gasOpts, tradeId)
  );
}
