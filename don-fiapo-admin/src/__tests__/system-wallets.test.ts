import {
  SYSTEM_WALLET_TEMPLATES,
  buildSystemWalletSeedRows,
  normalizeSystemWalletInput,
  validateSystemWalletInput,
} from "../lib/system-wallets";

describe("SystemWallet domain rules", () => {
  it("includes every wallet key consumed by the web app integrations", () => {
    const keys = SYSTEM_WALLET_TEMPLATES.map((template) => template.key);

    expect(keys).toEqual(expect.arrayContaining([
      "spin_fiapo",
      "spin_usdt",
      "spin_lunes",
      "spin_revenue",
      "treasury_solana",
      "ico_receiver",
      "migration_treasury",
      "airdrop_distribution_lunes",
      "mission_rewards_pool",
    ]));
  });

  it("normalizes admin input before persistence", () => {
    const normalized = normalizeSystemWalletInput({
      key: " Spin_Revenue ",
      label: " Spin Revenue ",
      address: " 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU ",
      network: "Solana",
      symbol: "usdt",
      purpose: " Revenue wallet ",
      isActive: true,
      updatedBy: " admin@donfiapo.fun ",
    });

    expect(normalized).toMatchObject({
      key: "spin_revenue",
      label: "Spin Revenue",
      address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      network: "solana",
      symbol: "USDT",
      purpose: "Revenue wallet",
      isActive: true,
      updatedBy: "admin@donfiapo.fun",
    });
  });

  it("rejects active Solana wallets with invalid addresses", () => {
    const result = validateSystemWalletInput({
      key: "spin_revenue",
      label: "Spin Revenue",
      address: "not-a-wallet",
      network: "solana",
      symbol: "USDT",
      isActive: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid solana wallet address");
  });

  it("allows inactive template rows without a configured address", () => {
    const result = validateSystemWalletInput({
      key: "spin_revenue",
      label: "Spin Revenue",
      address: "",
      network: "solana",
      symbol: "USDT",
      isActive: false,
    });

    expect(result.valid).toBe(true);
  });

  it("builds inactive seed rows when public wallet env vars are absent", () => {
    const rows = buildSystemWalletSeedRows({});
    const spinRevenue = rows.find((row) => row.key === "spin_revenue");

    expect(spinRevenue).toMatchObject({
      key: "spin_revenue",
      address: "",
      isActive: false,
    });
  });

  it("uses production Solana receiver env as fallback for public treasury wallets", () => {
    const rows = buildSystemWalletSeedRows({
      SOLANA_RECEIVER_WALLET: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    });

    expect(rows.find((row) => row.key === "treasury_solana")).toMatchObject({
      address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      isActive: true,
    });
    expect(rows.find((row) => row.key === "ico_receiver")).toMatchObject({
      address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      isActive: true,
    });
  });
});
