import { NextResponse } from "next/server";

/**
 * GET /api/admin/infrastructure
 * Returns infrastructure contracts status and config
 * On-chain queries will be added once contracts are deployed
 */
export async function GET() {
  const ORACLE_CONTRACT = process.env.ORACLE_CONTRACT || "";
  const SECURITY_CONTRACT = process.env.SECURITY_CONTRACT || "";
  const TIMELOCK_CONTRACT = process.env.TIMELOCK_CONTRACT || "";
  const UPGRADE_CONTRACT = process.env.UPGRADE_CONTRACT || "";

  // Summary of all contract deployment status
  const allContracts = [
    { name: "Core (PSP22)", address: process.env.LUNES_CORE_CONTRACT || "", category: "token" },
    { name: "ICO", address: process.env.ICO_CONTRACT || "", category: "product" },
    { name: "Staking", address: process.env.STAKING_CONTRACT || "", category: "product" },
    { name: "Marketplace", address: process.env.MARKETPLACE_CONTRACT || "", category: "product" },
    { name: "NFT Collections", address: process.env.NFT_COLLECTIONS_CONTRACT || "", category: "product" },
    { name: "Airdrop", address: process.env.AIRDROP_CONTRACT || "", category: "product" },
    { name: "Governance", address: process.env.GOVERNANCE_CONTRACT || "", category: "governance" },
    { name: "Rewards", address: process.env.REWARDS_CONTRACT || "", category: "product" },
    { name: "Lottery", address: process.env.LOTTERY_CONTRACT || "", category: "product" },
    { name: "Affiliate", address: process.env.AFFILIATE_CONTRACT || "", category: "product" },
    { name: "Noble", address: process.env.NOBLE_CONTRACT || "", category: "product" },
    { name: "Oracle Multisig", address: ORACLE_CONTRACT, category: "infra" },
    { name: "Security", address: SECURITY_CONTRACT, category: "infra" },
    { name: "Timelock", address: TIMELOCK_CONTRACT, category: "infra" },
    { name: "Upgrade", address: UPGRADE_CONTRACT, category: "infra" },
  ];

  const deployed = allContracts.filter(c => !!c.address).length;
  const total = allContracts.length;

  return NextResponse.json({
    summary: {
      totalContracts: total,
      deployed,
      pending: total - deployed,
      healthPercent: Math.round((deployed / total) * 100),
    },
    contracts: allContracts.map(c => ({
      ...c,
      deployed: !!c.address,
      addressShort: c.address ? `${c.address.slice(0, 8)}...${c.address.slice(-6)}` : "—",
    })),
    oracle: {
      configured: !!ORACLE_CONTRACT,
      contractAddress: ORACLE_CONTRACT,
      name: "Oracle Multisig",
      description: "Consenso multi-oracle para confirmação de pagamentos Solana (USDT/USDC)",
      features: [
        "M de N confirmações para processar pagamento",
        "Suporta: Staking Entry, NFT Purchase, Lottery Ticket, Spin Game, Governance",
        "Máximo 10 oracles simultâneos",
        "Pagamentos expiram automaticamente",
      ],
      linkedContracts: ["ICO", "Staking", "Lottery", "Spin Game", "Governance"],
    },
    security: {
      configured: !!SECURITY_CONTRACT,
      contractAddress: SECURITY_CONTRACT,
      name: "Security",
      description: "Proteções compartilhadas contra reentrância, rate limiting e blacklist",
      config: {
        reentrancyProtection: true,
        rateLimiting: true,
        maxOpsPerWindow: 100,
        windowDuration: "1 minuto",
        emergencyPause: false,
      },
      features: [
        "Proteção contra reentrância por contrato",
        "Rate limiting por conta (100 ops/min)",
        "Whitelist (sem rate limit) e Blacklist (bloqueio total)",
        "Pausa de emergência global",
        "Contratos autorizados registrados",
      ],
    },
    timelock: {
      configured: !!TIMELOCK_CONTRACT,
      contractAddress: TIMELOCK_CONTRACT,
      name: "Timelock",
      description: "Delay obrigatório para operações críticas — proteção contra ações maliciosas",
      delays: [
        { operation: "Transfer Ownership", delay: "48 horas" },
        { operation: "Config Change", delay: "24 horas" },
        { operation: "Contract Upgrade", delay: "72 horas" },
        { operation: "Wallet Change", delay: "24 horas" },
        { operation: "Tokenomics Change", delay: "48 horas" },
        { operation: "Fee Change", delay: "12 horas" },
        { operation: "Emergency Action", delay: "1 hora" },
      ],
      expiration: "7 dias",
    },
    upgrade: {
      configured: !!UPGRADE_CONTRACT,
      contractAddress: UPGRADE_CONTRACT,
      name: "Upgrade Manager",
      description: "Sistema de upgrade seguro com proxy pattern, multisig e versionamento",
      config: {
        minUpgradeDelay: "72 horas",
        upgradeExpiration: "7 dias",
        minApprovals: 2,
        rollbackAllowed: true,
      },
      flow: ["Proposta → Aprovações (mín 2) → Timelock (72h) → Execução → Histórico de versões"],
    },
  });
}
