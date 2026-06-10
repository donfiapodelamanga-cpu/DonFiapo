export const SYSTEM_WALLET_TEMPLATES = [
  { key: "spin_fiapo", label: "Spin FIAPO Pool", network: "lunes", symbol: "FIAPO", purpose: "Distribuição de prêmios FIAPO do Spin Game" },
  { key: "spin_usdt", label: "Spin USDT Pool", network: "solana", symbol: "USDT", purpose: "Distribuição de prêmios USDT do Spin Game (SPL token na Solana)" },
  { key: "spin_lunes", label: "Spin LUNES Pool", network: "lunes", symbol: "LUNES", purpose: "Distribuição de prêmios LUNES do Spin Game" },
  { key: "spin_revenue", label: "Spin Revenue", network: "solana", symbol: "USDT", purpose: "Recebimento da receita de vendas de pacotes de spin (USDT Solana)" },
  { key: "treasury_solana", label: "Treasury Solana", network: "solana", symbol: "USDT", purpose: "Carteira principal da tesouraria na Solana" },
  { key: "ico_receiver", label: "ICO Receiver (Solana)", network: "solana", symbol: "USDT", purpose: "Recebimento de pagamentos USDT da ICO" },
  { key: "migration_treasury", label: "Migration Treasury", network: "solana", symbol: "USDT", purpose: "Carteira de recebimento da migração Solana -> Lunes" },
  { key: "treasury_lunes", label: "Treasury Lunes", network: "lunes", symbol: "LUNES", purpose: "Carteira principal da tesouraria na Lunes Network" },
  { key: "airdrop_distribution_lunes", label: "Airdrop Distribution (Early Bird)", network: "lunes", symbol: "LUNES", purpose: "100.000 LUNES distribuídos entre os 30.000 primeiros usuários que completarem atividades" },
  { key: "mission_rewards_pool", label: "Mission Rewards Pool", network: "lunes", symbol: "LUNES", purpose: "Distribui recompensas LUNES de missões completadas" },
] as const;

export const SYSTEM_WALLET_NETWORKS = ["lunes", "solana"] as const;
export const SYSTEM_WALLET_SYMBOLS = ["FIAPO", "USDT", "USDC", "LUNES", "SOL"] as const;

export type SystemWalletNetwork = typeof SYSTEM_WALLET_NETWORKS[number];
export type SystemWalletSymbol = typeof SYSTEM_WALLET_SYMBOLS[number];
export type SystemWalletTemplate = typeof SYSTEM_WALLET_TEMPLATES[number];

export interface SystemWalletInput {
  key?: unknown;
  label?: unknown;
  address?: unknown;
  network?: unknown;
  symbol?: unknown;
  purpose?: unknown;
  isActive?: unknown;
  updatedBy?: unknown;
}

export interface NormalizedSystemWalletInput {
  key: string;
  label: string;
  address: string;
  network: string;
  symbol: string;
  purpose: string | null;
  isActive: boolean;
  updatedBy: string | null;
}

export interface SystemWalletValidationResult {
  valid: boolean;
  errors: string[];
  wallet: NormalizedSystemWalletInput;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown, defaultValue: boolean): boolean {
  return typeof value === "boolean" ? value : defaultValue;
}

function normalizeNetwork(value: unknown): string {
  const raw = stringValue(value).toLowerCase();
  if (raw === "lunes network") return "lunes";
  return raw;
}

export function normalizeSystemWalletInput(input: SystemWalletInput): NormalizedSystemWalletInput {
  const purpose = stringValue(input.purpose);
  const updatedBy = stringValue(input.updatedBy);

  return {
    key: stringValue(input.key).toLowerCase().replace(/[^a-z0-9_]/g, ""),
    label: stringValue(input.label),
    address: stringValue(input.address),
    network: normalizeNetwork(input.network),
    symbol: stringValue(input.symbol).toUpperCase(),
    purpose: purpose || null,
    isActive: booleanValue(input.isActive, true),
    updatedBy: updatedBy || null,
  };
}

export function isKnownSystemWalletKey(key: string): boolean {
  return SYSTEM_WALLET_TEMPLATES.some((template) => template.key === key);
}

export function isSystemWalletNetwork(value: string): value is SystemWalletNetwork {
  return SYSTEM_WALLET_NETWORKS.includes(value as SystemWalletNetwork);
}

export function isSystemWalletSymbol(value: string): value is SystemWalletSymbol {
  return SYSTEM_WALLET_SYMBOLS.includes(value as SystemWalletSymbol);
}

export function isSystemWalletAddressValid(address: string, network: string): boolean {
  if (!address) return false;

  if (network === "solana") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  if (network === "lunes") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(address);
  }

  return false;
}

export function validateSystemWalletInput(input: SystemWalletInput): SystemWalletValidationResult {
  const wallet = normalizeSystemWalletInput(input);
  const errors: string[] = [];

  if (!/^[a-z0-9_]{3,64}$/.test(wallet.key)) {
    errors.push("Invalid wallet key");
  }

  if (!wallet.label) {
    errors.push("Label is required");
  }

  if (!isSystemWalletNetwork(wallet.network)) {
    errors.push("Invalid network");
  }

  if (!isSystemWalletSymbol(wallet.symbol)) {
    errors.push("Invalid symbol");
  }

  if (wallet.isActive && !isSystemWalletAddressValid(wallet.address, wallet.network)) {
    errors.push(`Invalid ${wallet.network || "system"} wallet address`);
  }

  return { valid: errors.length === 0, errors, wallet };
}

function envAddress(env: Record<string, string | undefined>, key: string): string {
  const lookup: Record<string, string[]> = {
    spin_fiapo: ["SYSTEM_WALLET_SPIN_FIAPO", "NEXT_PUBLIC_SPIN_FIAPO_WALLET"],
    spin_usdt: ["SYSTEM_WALLET_SPIN_USDT", "NEXT_PUBLIC_SPIN_USDT_WALLET"],
    spin_lunes: ["SYSTEM_WALLET_SPIN_LUNES", "NEXT_PUBLIC_SPIN_LUNES_WALLET"],
    spin_revenue: ["SYSTEM_WALLET_SPIN_REVENUE", "SPIN_REVENUE_SOLANA_WALLET", "NEXT_PUBLIC_SPIN_REVENUE_WALLET", "NEXT_PUBLIC_TREASURY_SOLANA"],
    treasury_solana: ["SYSTEM_WALLET_TREASURY_SOLANA", "NEXT_PUBLIC_TREASURY_SOLANA", "SOLANA_RECEIVER_WALLET"],
    ico_receiver: ["SYSTEM_WALLET_ICO_RECEIVER", "NEXT_PUBLIC_SOLANA_RECEIVER", "SOLANA_RECEIVER_WALLET"],
    migration_treasury: ["SYSTEM_WALLET_MIGRATION_TREASURY", "NEXT_PUBLIC_TREASURY_SOLANA", "SOLANA_RECEIVER_WALLET"],
    treasury_lunes: ["SYSTEM_WALLET_TREASURY_LUNES"],
    airdrop_distribution_lunes: ["SYSTEM_WALLET_AIRDROP_DISTRIBUTION_LUNES"],
    mission_rewards_pool: ["SYSTEM_WALLET_MISSION_REWARDS_POOL"],
  };

  for (const envKey of lookup[key] ?? []) {
    const value = env[envKey]?.trim();
    if (value) return value;
  }

  return "";
}

export function buildSystemWalletSeedRows(env: Record<string, string | undefined>) {
  return SYSTEM_WALLET_TEMPLATES.map((template) => {
    const address = envAddress(env, template.key);
    const isActive = isSystemWalletAddressValid(address, template.network);

    return {
      key: template.key,
      label: template.label,
      address: isActive ? address : "",
      network: template.network,
      symbol: template.symbol,
      purpose: template.purpose,
      isActive,
      updatedBy: "seed",
    };
  });
}
