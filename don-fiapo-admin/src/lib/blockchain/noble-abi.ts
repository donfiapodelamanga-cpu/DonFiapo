/**
 * ABI (metadata) do contrato noble_affiliate (Order of Nobles)
 * Gerado manualmente a partir do código-fonte do contrato
 *
 * Funções mapeadas:
 * - get_noble_details(wallet: AccountId) → Option<Noble>
 * - add_commercial(wallet: AccountId)
 * - add_noble(noble_wallet: AccountId, solana_wallet: Vec<u8>) → Hash
 * - update_noble_status(noble_wallet: AccountId, status: NobleStatus)
 * - execute_payout(noble_wallet: AccountId)
 */

export const NOBLE_CONTRACT_ABI = {
  source: {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    language: "ink! 5.0.0",
    compiler: "rustc 1.75.0",
    build_info: { build_mode: "Release", cargo_contract_version: "4.0.0" },
  },
  contract: {
    name: "noble_affiliate",
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
        args: [{ label: "wallet", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Retorna detalhes de um Noble"],
        label: "get_noble_details",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Option"], type: 10 },
        selector: "0xa1b2c3d4",
      },
      {
        args: [{ label: "wallet", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Adiciona um comercial"],
        label: "add_commercial",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 20 },
        selector: "0xb2c3d4e5",
      },
      {
        args: [
          { label: "noble_wallet", type: { displayName: ["AccountId"], type: 0 } },
          { label: "solana_wallet", type: { displayName: ["Vec"], type: 6 } },
        ],
        default: false,
        docs: ["Adiciona um Noble"],
        label: "add_noble",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 21 },
        selector: "0xc3d4e5f6",
      },
      {
        args: [
          { label: "noble_wallet", type: { displayName: ["AccountId"], type: 0 } },
          { label: "status", type: { displayName: ["NobleStatus"], type: 7 } },
        ],
        default: false,
        docs: ["Atualiza status de um Noble"],
        label: "update_noble_status",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 20 },
        selector: "0xd4e5f6a7",
      },
      {
        args: [{ label: "noble_wallet", type: { displayName: ["AccountId"], type: 0 } }],
        default: false,
        docs: ["Executa pagamento para um Noble"],
        label: "execute_payout",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 20 },
        selector: "0xe5f6a7b8",
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
    { id: 6, type: { def: { sequence: { type: 2 } } } },
    { id: 7, type: { def: { variant: { variants: [
      { index: 0, name: "Active" },
      { index: 1, name: "Probation" },
      { index: 2, name: "Suspended" },
      { index: 3, name: "Removed" },
    ] } } } },
  ],
};

// Noble Status labels
export const NOBLE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  Active: { label: "Ativo", color: "text-green-400 bg-green-500/10 ring-green-500/30" },
  Probation: { label: "Probação", color: "text-yellow-400 bg-yellow-500/10 ring-yellow-500/30" },
  Suspended: { label: "Suspenso", color: "text-red-400 bg-red-500/10 ring-red-500/30" },
  Removed: { label: "Removido", color: "text-neutral-400 bg-neutral-500/10 ring-neutral-500/30" },
};

// Revenue sources with split details
export const REVENUE_SOURCES = [
  {
    id: 0,
    source: "ICO (Venda de NFTs)",
    taxa: "Preço em USDT (já com markup 35%)",
    split: "88% Tesouraria / 7% Parceiro / 5% Comercial",
    parceiroPct: 7,
    comercialPct: 5,
  },
  {
    id: 1,
    source: "Marketplace Fee",
    taxa: "6.0% (600 bps) $LUNES",
    split: "50% Time / 40% Staking / 10% Parceiro",
    parceiroPct: 10,
    comercialPct: 0,
  },
  {
    id: 2,
    source: "Staking: Entry Fee",
    taxa: "0.5% - 10% $USDT",
    split: "50% Time / 40% Staking / 5% Rewards / 5% Parceiro",
    parceiroPct: 5,
    comercialPct: 0,
  },
  {
    id: 3,
    source: "Gov: Criação de Proposta",
    taxa: "100 USDT + 1k FIAPO",
    split: "40% Time / 25% Staking / 20% Rewards / 5% Parceiro",
    parceiroPct: 5,
    comercialPct: 0,
  },
  {
    id: 4,
    source: "Gov: Voto",
    taxa: "10 USDT + 100 FIAPO",
    split: "40% Time / 25% Staking / 20% Rewards / 5% Parceiro",
    parceiroPct: 5,
    comercialPct: 0,
  },
];

// Revenue source labels (legacy compat)
export const REVENUE_SOURCE_LABELS: Record<number, string> = {
  0: "ICO NFT",
  1: "Marketplace Fee",
  2: "Staking Entry",
  3: "Gov Proposal",
  4: "Gov Vote",
};

// Commission split — ICO NFT sales only
// Comercial ONLY receives from ICO NFT sales
export const COMMISSION_SPLIT = {
  parceiro: "7%",
  comercial: "5%",
  total: "12%",
  nota: "Comercial só recebe da venda de NFTs (ICO)",
};

// Activation requirements
export const ACTIVATION_THRESHOLD = 10; // unique referrals to activate
export const MAINTENANCE_THRESHOLD = 2; // yearly minimum to maintain active
