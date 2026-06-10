/**
 * ABI (metadata) do contrato fiapo_staking
 * Gerado manualmente a partir do código-fonte do contrato
 *
 * Funções mapeadas:
 * - get_stats() → StakingStats
 * - core_contract() → AccountId
 * - pending_rewards(position_id: u64) → Balance
 * - calculate_entry_fee(fiapo_amount: Balance) → EntryFeeResult
 * - get_user_positions(user: AccountId) → Vec<u64>
 * - pause()
 */

export const STAKING_CONTRACT_ABI = {
  source: {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    language: "ink! 5.0.0",
    compiler: "rustc 1.75.0",
    build_info: { build_mode: "Release", cargo_contract_version: "4.0.0" },
  },
  contract: {
    name: "fiapo_staking",
    version: "1.0.0",
    authors: ["Don Fiapo Team"],
  },
  spec: {
    constructors: [
      {
        args: [{ label: "core_contract", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: [],
        label: "new",
        payable: false,
        returnType: { displayName: ["ink_primitives", "ConstructorResult"], type: 1 },
        selector: "0x9bae9d5e",
      },
    ],
    messages: [
      {
        args: [],
        default: false,
        docs: ["Retorna estatísticas do staking"],
        label: "get_stats",
        mutates: false,
        payable: false,
        returnType: { displayName: ["StakingStats"], type: 10 },
        selector: "0xc2e0f3fe",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna o contrato Core"],
        label: "core_contract",
        mutates: false,
        payable: false,
        returnType: { displayName: ["AccountId"], type: 0 },
        selector: "0xd45eef5d",
      },
      {
        args: [{ label: "position_id", type: { displayName: ["u64"], type: 3 } }],
        default: false,
        docs: ["Retorna rewards pendentes de uma posição"],
        label: "pending_rewards",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Balance"], type: 5 },
        selector: "0x94ca1360",
      },
      {
        args: [{ label: "fiapo_amount", type: { displayName: ["Balance"], type: 5 } }],
        default: false,
        docs: ["Calcula taxa de entrada"],
        label: "calculate_entry_fee",
        mutates: false,
        payable: false,
        returnType: { displayName: ["EntryFeeResult"], type: 11 },
        selector: "0xa1b2c3d4",
      },
      {
        args: [{ label: "user", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Retorna posições de um usuário"],
        label: "get_user_positions",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Vec"], type: 12 },
        selector: "0x7bde0627",
      },
      {
        args: [],
        default: false,
        docs: ["Pausa o staking"],
        label: "pause",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 20 },
        selector: "0x8456cb72",
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

// Pool names para UI
export const POOL_NAMES: Record<number, string> = {
  0: "Don Burn",
  1: "Don Lunes",
  2: "Don Fiapo",
};

export const POOL_CONFIGS = {
  0: { name: "Don Burn", apyRange: "10-300%", frequency: "Diário", minDays: 30, color: "red" },
  1: { name: "Don Lunes", apyRange: "6-37%", frequency: "Semanal", minDays: 60, color: "blue" },
  2: { name: "Don Fiapo", apyRange: "7-70%", frequency: "Mensal", minDays: 90, color: "yellow" },
};

export const POOL_COLORS: Record<number, { bg: string; border: string; text: string; ring: string }> = {
  0: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", ring: "ring-red-500/30" },
  1: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", ring: "ring-blue-500/30" },
  2: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", ring: "ring-yellow-500/30" },
};
