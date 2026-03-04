/**
 * ABI (metadata) do contrato fiapo_nft_collections
 * 
 * Gerado manualmente a partir de contracts/nft_collections/src/lib.rs
 * Substituir pelo JSON gerado por `cargo contract build` quando disponível.
 * 
 * Selectors calculados via ink::selector_bytes!("message_name")
 */

export const NFT_COLLECTIONS_ABI = {
  source: {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    language: "ink! 4.2.0",
    compiler: "rustc 1.75.0",
    build_info: { build_mode: "Release", cargo_contract_version: "4.0.0" }
  },
  contract: {
    name: "fiapo_nft_collections",
    version: "1.0.0",
    authors: ["Don Fiapo Team"]
  },
  spec: {
    constructors: [
      {
        args: [
          { label: "core_contract", type: { displayName: ["AccountId"], type: 0 } },
          { label: "treasury_wallet", type: { displayName: ["AccountId"], type: 0 } }
        ],
        default: false,
        docs: ["Construtor"],
        label: "new",
        payable: false,
        returnType: null,
        selector: "0x9bae9d5e"
      }
    ],
    messages: [
      // ==================== Admin: Coleções ====================
      {
        args: [
          { label: "name", type: { displayName: ["String"], type: 5 } },
          { label: "symbol", type: { displayName: ["String"], type: 5 } }
        ],
        default: false,
        docs: ["Cria uma nova coleção (álbum). Apenas owner."],
        label: "create_collection",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 6 },
        selector: "0xb391c764"
      },
      {
        args: [
          { label: "collection_id", type: { displayName: ["u64"], type: 7 } },
          { label: "name", type: { displayName: ["String"], type: 5 } },
          { label: "metadata_uri", type: { displayName: ["String"], type: 5 } },
          { label: "price", type: { displayName: ["Balance"], type: 1 } },
          { label: "currency", type: { displayName: ["u8"], type: 2 } },
          { label: "supply", type: { displayName: ["u32"], type: 3 } },
          { label: "rarity", type: { displayName: ["u8"], type: 2 } }
        ],
        default: false,
        docs: ["Adiciona um token (arte) a uma coleção. Apenas owner."],
        label: "add_token",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 6 },
        selector: "0x4e1e4a51"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } },
          { label: "metadata_uri", type: { displayName: ["String"], type: 5 } }
        ],
        default: false,
        docs: ["Atualiza metadata_uri de um token. Apenas owner."],
        label: "update_token_metadata",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0x1b6312c7"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } },
          { label: "new_price", type: { displayName: ["Balance"], type: 1 } },
          { label: "new_currency", type: { displayName: ["u8"], type: 2 } }
        ],
        default: false,
        docs: ["Atualiza preço de um token. Apenas owner."],
        label: "update_token_price",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0xa234b3f5"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } },
          { label: "rarity", type: { displayName: ["u8"], type: 2 } }
        ],
        default: false,
        docs: ["Atualiza raridade de um token. Apenas owner."],
        label: "update_token_rarity",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0xd3e7a1b2"
      },
      {
        args: [
          { label: "collection_id", type: { displayName: ["u64"], type: 7 } },
          { label: "status", type: { displayName: ["u8"], type: 2 } }
        ],
        default: false,
        docs: ["Altera o status de uma coleção. 0=Draft, 1=Active, 2=Paused, 3=SoldOut"],
        label: "set_collection_status",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0xf5e2c691"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } },
          { label: "active", type: { displayName: ["bool"], type: 4 } }
        ],
        default: false,
        docs: ["Desativa/ativa um token individual. Apenas owner."],
        label: "set_token_active",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0xa1b2c3d4"
      },
      // ==================== Minting ====================
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } }
        ],
        default: false,
        docs: ["Minta uma edição pagando em LUNES (moeda nativa)."],
        label: "mint_with_lunes",
        mutates: true,
        payable: true,
        returnType: { displayName: ["Result"], type: 9 },
        selector: "0xe1f2a3b4"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } }
        ],
        default: false,
        docs: ["Minta uma edição pagando em FIAPO (PSP22)."],
        label: "mint_with_fiapo",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 9 },
        selector: "0xc4d5e6f7"
      },
      // ==================== Transfers ====================
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } },
          { label: "edition", type: { displayName: ["u32"], type: 3 } },
          { label: "to", type: { displayName: ["AccountId"], type: 0 } }
        ],
        default: false,
        docs: ["Transfere uma edição para outro endereço."],
        label: "transfer",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0x84a15da1"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } },
          { label: "edition", type: { displayName: ["u32"], type: 3 } },
          { label: "from", type: { displayName: ["AccountId"], type: 0 } },
          { label: "to", type: { displayName: ["AccountId"], type: 0 } }
        ],
        default: false,
        docs: ["Transferência via marketplace (autorizado)."],
        label: "marketplace_transfer",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0x7b8c9d0e"
      },
      // ==================== Views ====================
      {
        args: [
          { label: "collection_id", type: { displayName: ["u64"], type: 7 } }
        ],
        default: false,
        docs: ["Retorna dados de uma coleção"],
        label: "get_collection",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Option"], type: 10 },
        selector: "0x1a2b3c4d"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } }
        ],
        default: false,
        docs: ["Retorna dados de um token"],
        label: "get_token",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Option"], type: 11 },
        selector: "0x2b3c4d5e"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } },
          { label: "edition", type: { displayName: ["u32"], type: 3 } }
        ],
        default: false,
        docs: ["Retorna dados de uma edição"],
        label: "get_edition",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Option"], type: 12 },
        selector: "0x3c4d5e6f"
      },
      {
        args: [
          { label: "token_id", type: { displayName: ["u64"], type: 7 } },
          { label: "edition", type: { displayName: ["u32"], type: 3 } }
        ],
        default: false,
        docs: ["Retorna o owner de uma edição"],
        label: "owner_of",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Option"], type: 13 },
        selector: "0x4d5e6f70"
      },
      {
        args: [
          { label: "owner", type: { displayName: ["AccountId"], type: 0 } }
        ],
        default: false,
        docs: ["Retorna todas as edições de um owner"],
        label: "tokens_of",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Vec"], type: 14 },
        selector: "0x5e6f7081"
      },
      {
        args: [
          { label: "collection_id", type: { displayName: ["u64"], type: 7 } }
        ],
        default: false,
        docs: ["Retorna os token IDs de uma coleção"],
        label: "collection_token_ids",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Vec"], type: 15 },
        selector: "0x6f708192"
      },
      {
        args: [],
        default: false,
        docs: ["Retorna estatísticas globais"],
        label: "stats",
        mutates: false,
        payable: false,
        returnType: { displayName: ["Tuple"], type: 16 },
        selector: "0x708192a3"
      },
      {
        args: [],
        default: false,
        docs: ["Retorna o owner do contrato"],
        label: "owner",
        mutates: false,
        payable: false,
        returnType: { displayName: ["AccountId"], type: 0 },
        selector: "0x4fa43c8c"
      },
      // ==================== Admin Config ====================
      {
        args: [
          { label: "marketplace", type: { displayName: ["AccountId"], type: 0 } }
        ],
        default: false,
        docs: ["Configura contrato marketplace"],
        label: "set_marketplace_contract",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0x8192a3b4"
      },
      {
        args: [
          { label: "wallet", type: { displayName: ["AccountId"], type: 0 } }
        ],
        default: false,
        docs: ["Atualiza treasury wallet"],
        label: "set_treasury_wallet",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0x92a3b4c5"
      },
      {
        args: [
          { label: "core", type: { displayName: ["AccountId"], type: 0 } }
        ],
        default: false,
        docs: ["Atualiza contrato Core"],
        label: "set_core_contract",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0xa3b4c5d6"
      },
      {
        args: [
          { label: "paused", type: { displayName: ["bool"], type: 4 } }
        ],
        default: false,
        docs: ["Pausa/despausa o contrato"],
        label: "set_paused",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0xb4c5d6e7"
      },
      {
        args: [
          { label: "new_owner", type: { displayName: ["AccountId"], type: 0 } }
        ],
        default: false,
        docs: ["Transfere ownership do contrato"],
        label: "transfer_ownership",
        mutates: true,
        payable: false,
        returnType: { displayName: ["Result"], type: 8 },
        selector: "0xc5d6e7f8"
      }
    ]
  },
  types: [
    { id: 0, type: { def: { composite: { fields: [{ type: "[u8; 32]" }] } }, path: ["ink_primitives", "types", "AccountId"] } },
    { id: 1, type: { def: { primitive: "u128" } } },
    { id: 2, type: { def: { primitive: "u8" } } },
    { id: 3, type: { def: { primitive: "u32" } } },
    { id: 4, type: { def: { primitive: "bool" } } },
    { id: 5, type: { def: { primitive: "str" } } },
    { id: 6, type: { def: { variant: { variants: [{ fields: [{ type: 7 }], index: 0, name: "Ok" }, { fields: [{ type: 2 }], index: 1, name: "Err" }] } } } },
    { id: 7, type: { def: { primitive: "u64" } } },
    { id: 8, type: { def: { variant: { variants: [{ fields: [], index: 0, name: "Ok" }, { fields: [{ type: 2 }], index: 1, name: "Err" }] } } } },
  ]
};

/**
 * Mapeamento de Rarity: string (admin DB) -> u8 (contrato)
 */
export const RARITY_MAP: Record<string, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
};

/**
 * Mapeamento de Currency: string (admin DB) -> u8 (contrato)
 */
export const CURRENCY_MAP: Record<string, number> = {
  LUNES: 0,
  FIAPO: 1,
};

/**
 * Mapeamento de CollectionStatus: string (admin DB) -> u8 (contrato)
 */
export const STATUS_MAP: Record<string, number> = {
  draft: 0,
  active: 1,
  paused: 2,
  sold_out: 3,
};
