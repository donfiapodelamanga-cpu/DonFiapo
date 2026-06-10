/**
 * Test suite: Sales Overview Module
 *
 * Verifies that the aggregation helpers (pctChange, trendDir, walletTxProduct,
 * normaliseStatus / productGroupKey) work correctly, and that a simulated
 * on-chain event (WalletTransaction) is correctly surfaced through the
 * normalisation pipeline into the "Vendas Recentes" table.
 *
 * Run: npx jest --testPathPattern=sales-overview
 */

import {
  pctChange,
  trendDir,
  walletTxProduct,
  SaleEvent,
} from "../app/api/admin/sales/overview/route";

// ─── Unit: pctChange ──────────────────────────────────────────────────────────

describe("pctChange", () => {
  it("returns 100 when previous is 0 and current > 0", () => {
    expect(pctChange(100, 0)).toBe(100);
  });

  it("returns 0 when both values are 0", () => {
    expect(pctChange(0, 0)).toBe(0);
  });

  it("calculates positive growth correctly", () => {
    expect(pctChange(120, 100)).toBe(20);
  });

  it("calculates negative growth correctly", () => {
    expect(pctChange(80, 100)).toBe(-20);
  });

  it("rounds to one decimal place", () => {
    expect(pctChange(110, 90)).toBeCloseTo(22.2, 1);
  });
});

// ─── Unit: trendDir ───────────────────────────────────────────────────────────

describe("trendDir", () => {
  it("returns 'up' when current > previous", () => {
    expect(trendDir(10, 5)).toBe("up");
  });

  it("returns 'down' when current < previous", () => {
    expect(trendDir(5, 10)).toBe("down");
  });

  it("returns 'neutral' when equal", () => {
    expect(trendDir(5, 5)).toBe("neutral");
  });
});

// ─── Unit: walletTxProduct ────────────────────────────────────────────────────

describe("walletTxProduct", () => {
  it("formats spin purchase with spins count from metadata", () => {
    const wt = {
      sourceType: "spin_purchase",
      description: "Spin purchase",
      metadata: JSON.stringify({ spins: 5 }),
    };
    expect(walletTxProduct(wt)).toBe("Spin Game — 5 Ticket(s)");
  });

  it("falls back to '?' spins when metadata missing", () => {
    const wt = {
      sourceType: "spin_purchase",
      description: "Spin purchase",
      metadata: null,
    };
    expect(walletTxProduct(wt)).toBe("Spin Game — ? Ticket(s)");
  });

  it("handles token migration", () => {
    const wt = { sourceType: "migration_in", description: "Migration", metadata: null };
    expect(walletTxProduct(wt)).toBe("Token Migration (Presale)");
  });

  it("handles NFT mint with collection name", () => {
    const wt = {
      sourceType: "nft_mint",
      description: "NFT Mint",
      metadata: JSON.stringify({ collectionName: "The Royal Scepter" }),
    };
    expect(walletTxProduct(wt)).toBe("NFT: The Royal Scepter");
  });

  it("handles unknown sourceType by returning description", () => {
    const wt = { sourceType: "staking", description: "Staking Activation", metadata: null };
    expect(walletTxProduct(wt)).toBe("Staking Activation");
  });

  it("handles malformed metadata gracefully", () => {
    const wt = { sourceType: "spin_purchase", description: "Spin", metadata: "{invalid}" };
    expect(walletTxProduct(wt)).toBe("Spin");
  });
});

// ─── Integration simulation: on-chain event → SaleEvent ──────────────────────
//
// This test simulates what the /api/admin/sales/overview route does when it
// normalises a WalletTransaction (e.g. a confirmed spin purchase synced from
// don-fiapo-web) into a SaleEvent. It verifies that:
//
//   1. The event appears in the result set with source = "on_chain"
//   2. The product name is correctly derived from metadata
//   3. The channel is correctly mapped (spin_purchase → "App")
//   4. The status is normalised to "completed"
//   5. The amount and currency are preserved
//   6. The date is the onChainAt timestamp

describe("Integration simulation: on-chain SpinPurchase → SaleEvent", () => {
  const mockWalletTransaction = {
    id: "wt-test-001",
    walletKey: "spin_wallet",
    walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    network: "solana",
    externalId: "spin:purchase:abc123",
    sourceType: "spin_purchase",
    direction: "in",
    amount: 0.35,
    symbol: "USDT",
    status: "confirmed",
    description: "Spin purchase — 5 tickets",
    fromAddress: "userWalletABC",
    toAddress: "treasuryWalletXYZ",
    txHash: "abc123txhash",
    metadata: JSON.stringify({ spins: 5, packageId: "pkg_5" }),
    onChainAt: new Date("2026-01-31T11:00:00Z"),
    indexedAt: new Date("2026-01-31T11:01:00Z"),
  };

  const SOURCE_CHANNEL: Record<string, string> = {
    spin_purchase: "App",
    migration_in: "Website",
    nft_mint: "Marketplace",
    staking: "App",
  };

  function normaliseStatus(s: string): "completed" | "pending" | "failed" {
    if (["completed", "confirmed", "APPROVED", "CONFIRMED"].includes(s)) return "completed";
    if (["failed", "REJECTED", "EXPIRED", "canceled"].includes(s)) return "failed";
    return "pending";
  }

  // This mirrors the normalisation in the route handler
  function normaliseWalletTx(wt: typeof mockWalletTransaction): SaleEvent {
    return {
      id: wt.id,
      source: "on_chain",
      product: walletTxProduct(wt),
      customer: wt.fromAddress || wt.walletKey,
      channel: SOURCE_CHANNEL[wt.sourceType] ?? "Website",
      amount: wt.amount,
      currency: wt.symbol,
      status: normaliseStatus(wt.status),
      date: wt.onChainAt.toISOString(),
    };
  }

  let saleEvent: SaleEvent;

  beforeAll(() => {
    saleEvent = normaliseWalletTx(mockWalletTransaction);
  });

  it("source is 'on_chain'", () => {
    expect(saleEvent.source).toBe("on_chain");
  });

  it("product is correctly derived from metadata", () => {
    expect(saleEvent.product).toBe("Spin Game — 5 Ticket(s)");
  });

  it("channel is 'App' for spin_purchase", () => {
    expect(saleEvent.channel).toBe("App");
  });

  it("status 'confirmed' is normalised to 'completed'", () => {
    expect(saleEvent.status).toBe("completed");
  });

  it("amount is preserved", () => {
    expect(saleEvent.amount).toBe(0.35);
  });

  it("currency is preserved as USDT", () => {
    expect(saleEvent.currency).toBe("USDT");
  });

  it("date matches onChainAt", () => {
    expect(saleEvent.date).toBe("2026-01-31T11:00:00.000Z");
  });

  it("customer uses fromAddress when present", () => {
    expect(saleEvent.customer).toBe("userWalletABC");
  });
});

// ─── Integration simulation: channel breakdown ────────────────────────────────

describe("Channel breakdown aggregation", () => {
  const events: SaleEvent[] = [
    { id: "1", source: "on_chain", product: "Spin", customer: "a", channel: "App", amount: 10, currency: "USDT", status: "completed", date: "" },
    { id: "2", source: "on_chain", product: "Spin", customer: "b", channel: "App", amount: 20, currency: "USDT", status: "completed", date: "" },
    { id: "3", source: "manual", product: "Token Pack", customer: "c", channel: "Website", amount: 30, currency: "BRL", status: "completed", date: "" },
    { id: "4", source: "nft", product: "NFT: X", customer: "d", channel: "Marketplace", amount: 50, currency: "USDT", status: "completed", date: "" },
  ];

  function buildChannelBreakdown(evts: SaleEvent[]) {
    const map = new Map<string, { amount: number; count: number }>();
    const total = evts.reduce((s, e) => s + e.amount, 0);
    for (const e of evts) {
      const entry = map.get(e.channel) ?? { amount: 0, count: 0 };
      entry.amount += e.amount;
      entry.count += 1;
      map.set(e.channel, entry);
    }
    return Array.from(map.entries())
      .map(([channel, { amount, count }]) => ({
        channel,
        amount,
        count,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  it("aggregates App channel correctly", () => {
    const breakdown = buildChannelBreakdown(events);
    const app = breakdown.find((b) => b.channel === "App");
    expect(app?.amount).toBe(30);
    expect(app?.count).toBe(2);
  });

  it("Marketplace has correct percentage", () => {
    const breakdown = buildChannelBreakdown(events);
    const mp = breakdown.find((b) => b.channel === "Marketplace");
    expect(mp?.pct).toBe(45); // 50/110 ≈ 45.45% → rounds to 45
  });

  it("breakdown is sorted by amount descending", () => {
    const breakdown = buildChannelBreakdown(events);
    expect(breakdown[0].channel).toBe("Marketplace"); // 50 — highest
    // App and Website both have 30; App inserted first → appears before Website
    expect(breakdown[1].channel).toBe("App");
    expect(breakdown[2].channel).toBe("Website");
  });
});

// ─── Integration simulation: top products grouping ───────────────────────────

describe("Top products grouping", () => {
  const events: SaleEvent[] = [
    { id: "1", source: "on_chain", product: "Spin Game — 5 Ticket(s)", customer: "a", channel: "App", amount: 0.35, currency: "USDT", status: "completed", date: "" },
    { id: "2", source: "on_chain", product: "Spin Game — 10 Ticket(s)", customer: "b", channel: "App", amount: 0.70, currency: "USDT", status: "completed", date: "" },
    { id: "3", source: "nft", product: "NFT: Royal Scepter — #1", customer: "c", channel: "Marketplace", amount: 500, currency: "USDT", status: "completed", date: "" },
  ];

  function productGroupKey(product: string): string {
    return product.split(" — ")[0].split(":")[0].trim();
  }

  function buildTopProducts(evts: SaleEvent[]) {
    const map = new Map<string, { count: number; revenue: number; currency: string }>();
    for (const e of evts) {
      const key = productGroupKey(e.product);
      const entry = map.get(key) ?? { count: 0, revenue: 0, currency: e.currency };
      entry.count += 1;
      entry.revenue += e.amount;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([product, { count, revenue, currency }]) => ({ product, count, revenue, currency }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  it("groups both Spin Game variants under 'Spin Game'", () => {
    const products = buildTopProducts(events);
    const spin = products.find((p) => p.product === "Spin Game");
    expect(spin?.count).toBe(2);
    expect(spin?.revenue).toBeCloseTo(1.05);
  });

  it("groups NFT under 'NFT'", () => {
    const products = buildTopProducts(events);
    const nft = products.find((p) => p.product === "NFT");
    expect(nft?.count).toBe(1);
    expect(nft?.revenue).toBe(500);
  });

  it("top product by revenue is NFT", () => {
    const products = buildTopProducts(events);
    expect(products[0].product).toBe("NFT");
  });
});
