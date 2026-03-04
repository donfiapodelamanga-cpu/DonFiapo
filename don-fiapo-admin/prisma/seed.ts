import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding data...");

    // 1. Create Branches
    const brasil = await prisma.branch.upsert({
        where: { id: "hq-brasil" },
        update: {},
        create: {
            id: "hq-brasil",
            name: "Sede Brasil (São Paulo)",
            location: "São Paulo, BR",
        },
    });

    const dubai = await prisma.branch.upsert({
        where: { id: "hq-dubai" },
        update: {},
        create: {
            id: "hq-dubai",
            name: "Sede Dubai (Global)",
            location: "Dubai, UAE",
        },
    });

    const europe = await prisma.branch.upsert({
        where: { id: "hq-europe" },
        update: {},
        create: {
            id: "hq-europe",
            name: "Sede Europa (Lisboa)",
            location: "Lisboa, PT",
        },
    });

    // 2. Create Initial Wallets
    await prisma.wallet.upsert({
        where: { address: "5F3sa2UjX8yWp3nQ" },
        update: {},
        create: {
            name: "Lunes Mainnet",
            address: "5F3sa2UjX8yWp3nQ",
            symbol: "LUNES",
            network: "Lunes",
            branchId: brasil.id,
        },
    });

    await prisma.wallet.upsert({
        where: { address: "5R3xa2VjK8zWp4nQ" },
        update: {},
        create: {
            name: "Fiapo Reserve",
            address: "5R3xa2VjK8zWp4nQ",
            symbol: "FIAPO",
            network: "Lunes",
            branchId: brasil.id,
        },
    });

    await prisma.wallet.upsert({
        where: { address: "Ep9kZ42nQ8wS1mP" },
        update: {},
        create: {
            name: "Solana USDT",
            address: "Ep9kZ42nQ8wS1mP",
            symbol: "USDT",
            network: "Solana",
            branchId: dubai.id,
        },
    });

    // 3. Create Campaigns
    const campaigns = [
      {
        name: "Lançamento Token Fiapo",
        type: "Social Media",
        status: "active",
        reach: 125000,
        clicks: 8750,
        conversions: 1245,
        budget: 50000,
        spent: 32500,
        startDate: new Date("2026-01-15"),
        endDate: new Date("2026-03-15"),
      },
      {
        name: "Influenciadores Crypto",
        type: "Influencer",
        status: "active",
        reach: 85000,
        clicks: 5200,
        conversions: 890,
        budget: 35000,
        spent: 28000,
        startDate: new Date("2026-01-20"),
        endDate: new Date("2026-02-20"),
      },
      {
        name: "Google Ads - Staking",
        type: "PPC",
        status: "paused",
        reach: 45000,
        clicks: 3200,
        conversions: 420,
        budget: 20000,
        spent: 15000,
        startDate: new Date("2026-01-10"),
        endDate: new Date("2026-02-10"),
      },
    ];

    for (const campaign of campaigns) {
      await prisma.campaign.upsert({
        where: { id: campaign.name },
        update: {},
        create: campaign,
      });
    }

    // 4. Create Partners
    const partners = [
      {
        name: "Crypto Exchange Brasil",
        type: "Exchange",
        status: "active",
        commission: "5%",
        revenue: 450000,
        sales: 1250,
        joinedAt: new Date("2025-08-15"),
        contact: "parcerias@cryptoexchange.br",
      },
      {
        name: "Influencer Tech Network",
        type: "Marketing",
        status: "active",
        commission: "10%",
        revenue: 285000,
        sales: 890,
        joinedAt: new Date("2025-09-20"),
        contact: "contato@influencertech.com",
      },
      {
        name: "NFT Marketplace Global",
        type: "Marketplace",
        status: "active",
        commission: "2.5%",
        revenue: 650000,
        sales: 2100,
        joinedAt: new Date("2025-06-10"),
        contact: "partnerships@nftglobal.com",
      },
    ];

    for (const partner of partners) {
      await prisma.partner.create({
        data: partner,
      });
    }

    // 5. Create Sales
    const sales = [
      {
        product: "Token Fiapo - Pacote 1000",
        customer: "João Silva",
        amount: 5000,
        status: "completed",
        channel: "Website",
        date: new Date("2026-02-01T10:30:00Z"),
      },
      {
        product: "NFT - The Royal Scepter",
        customer: "Maria Santos",
        amount: 25000,
        status: "completed",
        channel: "Marketplace",
        date: new Date("2026-02-01T09:15:00Z"),
      },
      {
        product: "Staking - 6 Meses",
        customer: "Ana Oliveira",
        amount: 10000,
        status: "pending",
        channel: "App",
        date: new Date("2026-01-31T14:20:00Z"),
      },
      {
        product: "Token Fiapo - Pacote 5000",
        customer: "Carlos Ferreira",
        amount: 20000,
        status: "completed",
        channel: "Parceiro",
        date: new Date("2026-01-30T11:00:00Z"),
      },
    ];

    for (const sale of sales) {
      await prisma.sale.create({
        data: sale,
      });
    }

    // 6. Create Nobles
    const nobles = [
      {
        name: "Ricardo Nobre",
        email: "ricardo@example.com",
        tier: "Gold",
        status: "active",
        walletAddress: "5F3sa2UjX8yWp3nQaBcDeFgH",
        totalSales: 125000,
        referralCode: "RICARDO2025",
      },
      {
        name: "Fernanda Real",
        email: "fernanda@example.com",
        tier: "Platinum",
        status: "active",
        walletAddress: "5R3xa2VjK8zWp4nQiJkLmNoP",
        totalSales: 450000,
        referralCode: "FERNANDA2025",
      },
      {
        name: "Carlos Silva",
        email: "carlos@example.com",
        tier: "Silver",
        status: "active",
        walletAddress: "5G7yb2CkD4eRs6tUvWxYzAbC",
        totalSales: 25000,
      },
    ];

    for (const noble of nobles) {
      await prisma.noble.upsert({
        where: { email: noble.email },
        update: {},
        create: noble,
      });
    }

    // 7. Create Token Distribution (Tokenomics Tracking)
    const distributions = [
      { category: "presale", label: "Pré-venda", planned: 150, percentage: 25, status: "in_progress", notes: "150Bi via GemPad (Solana) — migração para Lunes em andamento" },
      { category: "staking", label: "Fundo de Staking", planned: 310, percentage: 51.67, status: "pending", notes: "310Bi — liberação linear em 5 anos" },
      { category: "ico", label: "IEO/ICO", planned: 64, percentage: 10.67, status: "pending", notes: "64Bi — desbloqueado para venda pública" },
      { category: "airdrop", label: "Airdrop", planned: 30.5, percentage: 5.08, status: "pending", notes: "30.5Bi — distribuição baseada em pontos" },
      { category: "marketing", label: "Marketing", planned: 20.5, percentage: 3.42, status: "pending", notes: "20.5Bi — campanhas e parcerias" },
      { category: "charity", label: "Caridade", planned: 20.5, percentage: 3.42, status: "pending", notes: "20.5Bi — controlado pela governança" },
      { category: "team", label: "Equipe", planned: 4.5, percentage: 0.75, status: "pending", notes: "4.5Bi — cliff 2 anos, vesting 3 anos" },
    ];

    for (const dist of distributions) {
      await prisma.tokenDistribution.upsert({
        where: { category: dist.category },
        update: { planned: dist.planned, percentage: dist.percentage, notes: dist.notes },
        create: dist,
      });
    }

    console.log("Seeding completed successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
