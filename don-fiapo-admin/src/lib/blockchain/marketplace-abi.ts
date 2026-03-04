/**
 * ABI (metadata) do contrato fiapo_marketplace
 * Gerado manualmente a partir do código-fonte do contrato
 *
 * Funções mapeadas:
 * - get_active_listings() → Vec<u64>
 * - get_active_auctions() → Vec<u64>
 * - get_active_trades() → Vec<u64>
 * - total_volume() → Balance
 * - is_ico_sales_completed() → bool
 * - payment_mode() → u8
 */

export const MARKETPLACE_CONTRACT_ABI = {
  source: {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    language: "ink! 5.0.0",
    compiler: "rustc 1.75.0",
    build_info: { build_mode: "Release", cargo_contract_version: "4.0.0" },
  },
  contract: {
    name: "fiapo_marketplace",
    version: "1.0.0",
    authors: ["Don Fiapo Team"],
  },
  spec: {
    constructors: [
      {
        args: [
          { label: "core_contract", type: { displayName: ["AccountId"], type: 0 } },
          { label: "ico_contract", type: { displayName: ["AccountId"], type: 0 } },
        ],
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
        docs: ["Retorna IDs dos listings ativos"],
        label: "get_active_listings",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Vec"], type: 12 },
        selector: "0x3a4c5d6e",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna IDs dos leilões ativos"],
        label: "get_active_auctions",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Vec"], type: 12 },
        selector: "0x4b5c6d7f",
      },
      {
        args: [],
        default: false,
        docs: ["Retorna IDs das trocas ativas"],
        label: "get_active_trades",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Vec"], type: 12 },
        selector: "0x5c6d7e8a",
      },
      {
        args: [],
        default: false,
        docs: ["Volume total negociado"],
        label: "total_volume",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Balance"], type: 5 },
        selector: "0x6d7e8f9b",
      },
      {
        args: [],
        default: false,
        docs: ["Se vendas ICO foram completadas"],
        label: "is_ico_sales_completed",
        mutates: false,
        payable: false,
        returnType: { displayName: ["bool"], type: 4 },
        selector: "0x7e8f9a0c",
      },
      {
        args: [],
        default: false,
        docs: ["Modo de pagamento"],
        label: "payment_mode",
        mutates: false,
        payable: false,
        returnType: { displayName: ["u8"], type: 2 },
        selector: "0x8f9a0b1d",
      },
      {
        args: [],
        default: false,
        docs: ["Contrato Core"],
        label: "core_contract",
        mutates: false,
        payable: false,
        returnType: { displayName: ["AccountId"], type: 0 },
        selector: "0xd45eef5d",
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
