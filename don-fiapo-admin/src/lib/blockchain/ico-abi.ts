/**
 * ABI (metadata) do contrato fiapo_ico
 * Gerado manualmente a partir do código-fonte do contrato
 * 
 * Funções mapeadas:
 * - get_stats() → ICOStats
 * - get_tier_config(tier: u8) → Option<TierConfig>
 * - get_ico_nft_configs() → Vec<TierConfig>
 * - total_nfts() → u64
 * - is_ico_active() → bool
 * - get_evolution_stats() → (u64, u64)
 * - get_rarity_stats() → Vec<(VisualRarity, u32)>
 * - get_nft(nft_id: u64) → Option<NFTData>
 * - get_user_nfts(owner: AccountId) → Vec<u64>
 * - pending_tokens(nft_id: u64) → u128
 * - pause_ico() / unpause_ico()
 * - pause_mining()
 */

export const ICO_CONTRACT_ABI = {
  source: {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    language: "ink! 5.0.0",
    compiler: "rustc 1.75.0",
    build_info: { build_mode: "Release", cargo_contract_version: "4.0.0" },
  },
  contract: {
    name: "fiapo_ico",
    version: "1.0.0",
    authors: ["Don Fiapo Team"],
  },
  spec: {
    constructors: [
      {
        args: [{ label: "core_contract", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Construtor do contrato"],
        label: "new",
        payable: false,
        returnType: { displayName: ["ink_primitives", "ConstructorResult"], type: 1 },
        selector: "0x9bae9d5e",
      },
    ],
    messages: [
      // ==================== View Functions ====================
      {
        args: [],
        default: false,
        docs: ["Retorna as estatísticas do ICO"],
        label: "get_stats",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["ICOStats"],
          type: 10,
        },
        selector: "0xc2e0f3fe",
      },
      {
        args: [{ label: "tier", type: { displayName: ["u8"], type: 2 } }],
        default: false,
        docs: ["Retorna a configuração de um tier"],
        label: "get_tier_config",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["Option"],
          type: 11,
        },
        selector: "0x7c97c376",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna todas as configurações de tiers"],
        label: "get_ico_nft_configs",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["Vec"],
          type: 12,
        },
        selector: "0xe7f4515e",
      },
      {
        args: [{ label: "nft_id", type: { displayName: ["u64"], type: 3 } }],
        default: false,
        docs: ["Retorna dados de um NFT"],
        label: "get_nft",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["Option"],
          type: 13,
        },
        selector: "0xa5e8aa3b",
      },
      {
        args: [{ label: "owner", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Retorna NFTs de um usuário"],
        label: "get_user_nfts",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["Vec"],
          type: 14,
        },
        selector: "0x7bde0627",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna o total de NFTs"],
        label: "total_nfts",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["u64"],
          type: 3,
        },
        selector: "0x44e15a37",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna se o ICO está ativo"],
        label: "is_ico_active",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["bool"],
          type: 4,
        },
        selector: "0xf3de1a41",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna estatísticas de evolução"],
        label: "get_evolution_stats",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["Tuple"],
          type: 15,
        },
        selector: "0x77e19e29",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna estatísticas de raridade"],
        label: "get_rarity_stats",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["Vec"],
          type: 16,
        },
        selector: "0x5e4530f0",
      },
      {
        args: [{ label: "nft_id", type: { displayName: ["u64"], type: 3 } }],
        default: false,
        docs: ["Calcula tokens pendentes para um NFT"],
        label: "pending_tokens",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["u128"],
          type: 5,
        },
        selector: "0x9a5fe2a7",
      },
      {
        args: [{ label: "tier", type: { displayName: ["u8"], type: 2 } }],
        default: false,
        docs: ["Retorna o preço ICO em USDT cents de um tier"],
        label: "get_tier_price_cents",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["u64"],
          type: 3,
        },
        selector: "0x1fd08dce",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna o contrato Core"],
        label: "core_contract",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["AccountId"],
          type: 0,
        },
        selector: "0xd45eef5d",
      },
      {
        args: [{ label: "nft_id", type: { displayName: ["u64"], type: 3 } }],
        default: false,
        docs: ["Retorna info do prestige bonus de um NFT"],
        label: "get_prestige_info",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["Option"],
          type: 17,
        },
        selector: "0x5d95eb5a",
      },
      {
        args: [{ label: "nft_id", type: { displayName: ["u64"], type: 3 } }],
        default: false,
        docs: ["Retorna a taxa de mineração efetiva de um NFT"],
        label: "get_effective_mining_rate",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["Option"],
          type: 18,
        },
        selector: "0xb2de6a5f",
      },
      // ==================== Admin Functions ====================
      {
        args: [],
        default: false,
        docs: ["Pausa o ICO"],
        label: "pause_ico",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["Result"],
          type: 20,
        },
        selector: "0x8d81fb25",
      },
      {
        args: [],
        default: false,
        docs: ["Despausa o ICO"],
        label: "unpause_ico",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["Result"],
          type: 20,
        },
        selector: "0xc0b54c6a",
      },
      {
        args: [],
        default: false,
        docs: ["Pausa a mineração"],
        label: "pause_mining",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["Result"],
          type: 20,
        },
        selector: "0x4a373c20",
      },
      {
        args: [{ label: "oracle", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Configura contrato Oracle"],
        label: "set_oracle_contract",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["Result"],
          type: 20,
        },
        selector: "0xf9d1d2a0",
      },
      {
        args: [{ label: "marketplace", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Configura contrato Marketplace"],
        label: "set_marketplace_contract",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["Result"],
          type: 20,
        },
        selector: "0x2e6c9e82",
      },
      {
        args: [{ label: "noble", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Configura contrato Noble"],
        label: "set_noble_contract",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["Result"],
          type: 20,
        },
        selector: "0x3c8f2d0e",
      },
      {
        args: [{ label: "new_core", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Atualiza contrato Core"],
        label: "set_core_contract",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["Result"],
          type: 20,
        },
        selector: "0x6ba2b41f",
      },
      {
        args: [{ label: "tier", type: { displayName: ["u8"], type: 2 } }],
        default: false,
        docs: ["Finaliza um tier quando atinge max_supply"],
        label: "finalize_tier",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["Result"],
          type: 20,
        },
        selector: "0x1d4b1c5e",
      },
    ],
  },
  types: [
    { id: 0, type: { def: { composite: { fields: [{ type: 1 }] } }, path: ["ink_primitives", "types", "AccountId"] } },
    { id: 1, type: { def: { array: { len: 32, type: 2 } } } },
    { id: 2, type: { def: { primitive: "u8" } } },
    { id: 3, type: { def: { primitive: "u64" } } },
    { id: 4, type: { def: { primitive: "bool" } } },
    { id: 5, type: { def: { primitive: "u128" } } },
  ],
};

// Tier names para UI
export const TIER_NAMES: Record<number, string> = {
  0: "Free",
  1: "Tier 2 ($13.50)",
  2: "Tier 3 ($40.50)",
  3: "Tier 4 ($74.25)",
  4: "Tier 5 ($135)",
  5: "Tier 6 ($337.50)",
  6: "Tier 7 ($675)",
};

export const TIER_PRICES_USD: Record<number, number> = {
  0: 0,
  1: 13.50,
  2: 40.50,
  3: 74.25,
  4: 135.00,
  5: 337.50,
  6: 675.00,
};

export const TIER_MAX_SUPPLY: Record<number, number> = {
  0: 10_000,
  1: 50_000,
  2: 40_000,
  3: 30_000,
  4: 20_000,
  5: 5_000,
  6: 2_000,
};

export const TIER_TOKENS_PER_NFT: Record<number, number> = {
  0: 560,
  1: 5_600,
  2: 16_800,
  3: 33_600,
  4: 56_000,
  5: 134_400,
  6: 280_000,
};

export const TIER_DAILY_RATE: Record<number, number> = {
  0: 5,
  1: 50,
  2: 150,
  3: 300,
  4: 500,
  5: 1_200,
  6: 2_500,
};

// Rarity labels
export const RARITY_NAMES: Record<number, string> = {
  0: "Common",
  1: "Uncommon",
  2: "Rare",
  3: "Epic",
  4: "Legendary",
};

export const RARITY_COLORS: Record<string, string> = {
  Common: "text-neutral-400",
  Uncommon: "text-green-400",
  Rare: "text-blue-400",
  Epic: "text-purple-400",
  Legendary: "text-yellow-400",
};
