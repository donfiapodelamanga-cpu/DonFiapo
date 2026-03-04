import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding Royal Missions...");

  // Create Reward Pools
  const offchainPool = await db.rewardPool.upsert({
    where: { id: "pool-offchain" },
    update: {},
    create: {
      id: "pool-offchain",
      name: "Social Growth Pool",
      type: "OFFCHAIN",
      totalAmount: 6_300_000_000, // 20% of 31.5B airdrop
      isActive: true,
    },
  });

  const onchainPool = await db.rewardPool.upsert({
    where: { id: "pool-onchain" },
    update: {},
    create: {
      id: "pool-onchain",
      name: "On-chain Activity Pool",
      type: "ONCHAIN",
      totalAmount: 25_200_000_000, // 80% of 31.5B airdrop
      isActive: true,
    },
  });

  // ── Early Bird Pool: 100k LUNES for first 30,000 users ──────────────────
  await db.rewardPool.upsert({
    where: { id: "pool-early-bird" },
    update: {},
    create: {
      id: "pool-early-bird",
      name: "Early Bird Distribution",
      type: "EARLY_BIRD",
      totalAmount: 100_000,       // 100,000 LUNES
      isActive: true,
      maxSlots: 30_000,           // First 30,000 users
      linesPerSlot: 100_000 / 30_000, // ≈ 3.333 LUNES per slot
    },
  });
  console.log("  ✅ EARLY_BIRD | 100,000 LUNES → 30,000 slots (≈3.33 LUNES each)");

  // Off-chain Missions (Social Growth)
  const offchainMissions = [
    {
      id: "m-follow-x",
      name: "Follow @DonFiapo on X",
      description: "Join the royal court on X to stay updated with the latest decrees.",
      type: "OFFCHAIN",
      platform: "X",
      basePoints: 50,
      multiplier: 1.0,
      actionType: "FOLLOW",
      targetUrl: "https://x.com/DonFiapo",
      rewardPoolId: offchainPool.id,
    },
    {
      id: "m-like-x",
      name: "Like Pinned Post on X",
      description: "Show your support by liking the official pinned announcement.",
      type: "OFFCHAIN",
      platform: "X",
      basePoints: 30,
      multiplier: 1.0,
      actionType: "LIKE",
      targetUrl: "https://x.com/DonFiapo",
      rewardPoolId: offchainPool.id,
    },
    {
      id: "m-repost-x",
      name: "Repost the Royal Decree",
      description: "Spread the word — repost our pinned tweet to earn points.",
      type: "OFFCHAIN",
      platform: "X",
      basePoints: 75,
      multiplier: 1.0,
      actionType: "REPOST",
      targetUrl: "https://x.com/DonFiapo",
      rewardPoolId: offchainPool.id,
    },
    {
      id: "m-comment-x",
      name: "Comment with #DonFiapo",
      description: "Leave a comment containing #DonFiapo on the pinned post.",
      type: "OFFCHAIN",
      platform: "X",
      basePoints: 60,
      multiplier: 1.0,
      actionType: "COMMENT",
      requiredKeyword: "#DonFiapo",
      targetUrl: "https://x.com/DonFiapo",
      rewardPoolId: offchainPool.id,
    },
    {
      id: "m-join-telegram",
      name: "Join Telegram Kingdom",
      description: "Enter the official Don Fiapo Telegram group.",
      type: "OFFCHAIN",
      platform: "TELEGRAM",
      basePoints: 50,
      multiplier: 1.0,
      actionType: "JOIN_GROUP",
      targetUrl: "https://t.me/DonFiapo",
      rewardPoolId: offchainPool.id,
    },
    {
      id: "m-invite-friend",
      name: "Invite a Friend",
      description: "Refer a new user who connects their wallet. Repeatable up to 50x!",
      type: "OFFCHAIN",
      platform: "MINIAPP",
      basePoints: 100,
      multiplier: 1.5,
      maxCompletions: 50,
      actionType: "FOLLOW",
      rewardPoolId: offchainPool.id,
    },

    // ── UGC: TikTok Videos ────────────────────────────────────────────────
    {
      id: "m-tiktok-short",
      name: "Create a TikTok Short about Don Fiapo",
      description: "Record a short TikTok video (15–60s) reviewing or showcasing Don Fiapo. Submit the link for admin review. Approved within 7 days.",
      type: "OFFCHAIN",
      platform: "TIKTOK",
      basePoints: 1200,
      multiplier: 3.0,
      actionType: "VIDEO_TIKTOK",
      targetUrl: "https://www.tiktok.com",
      rewardPoolId: offchainPool.id,
    },
    {
      id: "m-tiktok-review",
      name: "Create a Full TikTok Review of Don Fiapo",
      description: "Record a detailed TikTok review (60s+) covering the project, NFTs or tokenomics. Higher rewards for quality content.",
      type: "OFFCHAIN",
      platform: "TIKTOK",
      basePoints: 2500,
      multiplier: 3.5,
      actionType: "VIDEO_TIKTOK",
      targetUrl: "https://www.tiktok.com",
      rewardPoolId: offchainPool.id,
    },

    // ── UGC: YouTube Videos ───────────────────────────────────────────────
    {
      id: "m-youtube-short",
      name: "Create a YouTube Short about Don Fiapo",
      description: "Post a YouTube Short (up to 60s) about Don Fiapo. Submit the link and receive points after admin review within 7 days.",
      type: "OFFCHAIN",
      platform: "YOUTUBE",
      basePoints: 1500,
      multiplier: 3.0,
      actionType: "VIDEO_YOUTUBE",
      targetUrl: "https://www.youtube.com",
      rewardPoolId: offchainPool.id,
    },
    {
      id: "m-youtube-review",
      name: "Create a YouTube Review of Don Fiapo",
      description: "Publish a full YouTube video review (3min+) of the Don Fiapo project. The most valuable UGC quest in the kingdom!",
      type: "OFFCHAIN",
      platform: "YOUTUBE",
      basePoints: 5000,
      multiplier: 4.0,
      actionType: "VIDEO_YOUTUBE",
      targetUrl: "https://www.youtube.com",
      rewardPoolId: offchainPool.id,
    },

    // ── UGC: Medium Articles ──────────────────────────────────────────────
    {
      id: "m-medium-article",
      name: "Write a Medium Article about Don Fiapo",
      description: "Publish an article on Medium covering the Don Fiapo project — tokenomics, NFTs, roadmap, or your personal take. Minimum 500 words. Submit the link for admin review within 7 days.",
      type: "OFFCHAIN",
      platform: "MEDIUM",
      basePoints: 3000,
      multiplier: 3.5,
      actionType: "ARTICLE_MEDIUM",
      targetUrl: "https://medium.com",
      rewardPoolId: offchainPool.id,
    },

    // ── UGC: CoinMarketCap ────────────────────────────────────────────────
    {
      id: "m-cmc-article",
      name: "Post about Don Fiapo on CoinMarketCap",
      description: "Create a community post or article about Don Fiapo on CoinMarketCap. Share your analysis, price prediction, or project overview. Submit the CMC link for admin review.",
      type: "OFFCHAIN",
      platform: "CMC",
      basePoints: 3500,
      multiplier: 4.0,
      actionType: "ARTICLE_CMC",
      targetUrl: "https://coinmarketcap.com",
      rewardPoolId: offchainPool.id,
    },
  ];

  // On-chain Missions (High Priority)
  const onchainMissions = [
    // ── Wallet Connection ──────────────────────────────────────────────────
    {
      id: "m-connect-wallet",
      name: "Connect Lunes Wallet",
      description: "Link your Lunes wallet to prove you're a real holder.",
      type: "ONCHAIN",
      platform: "WALLET",
      basePoints: 200,
      multiplier: 1.0,
      actionType: "CONNECT_WALLET",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-connect-solana",
      name: "Connect Solana Wallet",
      description: "Link your Solana wallet for cross-chain airdrop eligibility.",
      type: "ONCHAIN",
      platform: "WALLET",
      basePoints: 200,
      multiplier: 1.0,
      actionType: "CONNECT_WALLET",
      rewardPoolId: onchainPool.id,
    },

    // ── NFT Mint — Free ────────────────────────────────────────────────────
    {
      id: "m-mint-nft-free",
      name: "Mint a Free NFT (The Shovel)",
      description: "Mint the free Tier 0 NFT — The Shovel of the Commoner Miner. No cost, just loyalty!",
      type: "ONCHAIN",
      platform: "NFT",
      basePoints: 300,
      multiplier: 1.5,
      actionType: "MINT_NFT",
      targetUrl: "nft:0",
      rewardPoolId: onchainPool.id,
    },

    // ── NFT Mint — Paid Tiers ──────────────────────────────────────────────
    {
      id: "m-mint-nft-bronze",
      name: "Mint a Bronze NFT (The Pickaxe)",
      description: "Mint a Tier 1 Bronze NFT — The Pickaxe of the Royal Guard. Costs 10 USDT.",
      type: "ONCHAIN",
      platform: "NFT",
      basePoints: 500,
      multiplier: 2.0,
      actionType: "MINT_NFT",
      targetUrl: "nft:1",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-mint-nft-silver",
      name: "Mint a Silver NFT (The Crown Lantern)",
      description: "Mint a Tier 2 Silver NFT — The Crown Lantern. Costs 25 USDT.",
      type: "ONCHAIN",
      platform: "NFT",
      basePoints: 750,
      multiplier: 2.5,
      actionType: "MINT_NFT",
      targetUrl: "nft:2",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-mint-nft-gold",
      name: "Mint a Gold NFT (The Gilded Compass)",
      description: "Mint a Tier 3 Gold NFT — The Gilded Compass of the Kingdom. Costs 50 USDT.",
      type: "ONCHAIN",
      platform: "NFT",
      basePoints: 1000,
      multiplier: 3.0,
      actionType: "MINT_NFT",
      targetUrl: "nft:3",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-mint-nft-platinum",
      name: "Mint a Platinum NFT (The Royal Treasure Map)",
      description: "Mint a Tier 4 Platinum NFT — The Royal Treasure Map. Costs 100 USDT.",
      type: "ONCHAIN",
      platform: "NFT",
      basePoints: 1500,
      multiplier: 3.5,
      actionType: "MINT_NFT",
      targetUrl: "nft:4",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-mint-nft-diamond",
      name: "Mint a Diamond NFT (The Golden Mango Eye)",
      description: "Mint a Tier 5 Diamond NFT — The Golden Mango Eye. Costs 250 USDT.",
      type: "ONCHAIN",
      platform: "NFT",
      basePoints: 2500,
      multiplier: 4.0,
      actionType: "MINT_NFT",
      targetUrl: "nft:5",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-mint-nft-legendary",
      name: "Mint a Legendary NFT (The Fiapo Royal Scepter)",
      description: "Mint the ultimate Tier 6 Legendary NFT — The Fiapo Royal Scepter. Costs 500 USDT. Only true royalty dares.",
      type: "ONCHAIN",
      platform: "NFT",
      basePoints: 5000,
      multiplier: 5.0,
      actionType: "MINT_NFT",
      targetUrl: "nft:6",
      rewardPoolId: onchainPool.id,
    },

    // ── Staking ───────────────────────────────────────────────────────────
    {
      id: "m-stake-don-burn",
      name: "Stake in Don Burn Pool",
      description: "Stake any amount of $FIAPO in the Don Burn pool (30-day lock, up to 300% APY).",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 600,
      multiplier: 2.5,
      actionType: "STAKE",
      targetUrl: "stake:don-burn",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-stake-don-lunes",
      name: "Stake in Don Lunes Pool",
      description: "Stake any amount of $FIAPO in the Don Lunes pool (60-day lock, up to 37% APY).",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 700,
      multiplier: 2.5,
      actionType: "STAKE",
      targetUrl: "stake:don-lunes",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-stake-don-fiapo",
      name: "Stake in Don Fiapo Pool",
      description: "Stake any amount of $FIAPO in the Don Fiapo pool (90-day lock, up to 70% APY). The crown rewards patience.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 800,
      multiplier: 3.0,
      actionType: "STAKE",
      targetUrl: "stake:don-fiapo",
      rewardPoolId: onchainPool.id,
    },

    // ── Spin Game ─────────────────────────────────────────────────────────
    {
      id: "m-spin-game",
      name: "Spin the Royal Wheel",
      description: "Try your luck! Play the Spin Game at least once to earn your royal fortune.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 400,
      multiplier: 2.0,
      actionType: "SPIN",
      targetUrl: "https://donfiapo.com/games/spin",
      rewardPoolId: onchainPool.id,
    },

    // ── Marketplace: SELL tiers ───────────────────────────────────────────
    {
      id: "m-sell-1",
      name: "First Royal Listing",
      description: "List your first Don Fiapo NFT on the marketplace. Every merchant begins with a single stall.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 400,
      multiplier: 2.0,
      actionType: "SELL_NFT",
      targetUrl: "marketplace:sell:1",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-sell-3",
      name: "Market Apprentice",
      description: "List 3 NFTs on the marketplace. Prove you are a serious trader in the royal economy.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 800,
      multiplier: 2.5,
      actionType: "SELL_NFT",
      targetUrl: "marketplace:sell:3",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-sell-10",
      name: "Royal Merchant",
      description: "List 10 NFTs on the marketplace. You have earned your place among the kingdom's elite traders.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 2000,
      multiplier: 3.5,
      actionType: "SELL_NFT",
      targetUrl: "marketplace:sell:10",
      rewardPoolId: onchainPool.id,
    },

    // ── Marketplace: BUY tiers ────────────────────────────────────────────
    {
      id: "m-buy-1",
      name: "First Royal Purchase",
      description: "Buy your first NFT from the marketplace. Welcome to the collector's guild!",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 500,
      multiplier: 2.0,
      actionType: "BUY_NFT",
      targetUrl: "marketplace:buy:1",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-buy-3",
      name: "NFT Collector",
      description: "Own 3 Don Fiapo NFTs. A true collector of royal assets.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 1000,
      multiplier: 2.5,
      actionType: "BUY_NFT",
      targetUrl: "marketplace:buy:3",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-buy-7",
      name: "Royal Patron",
      description: "Own 7 Don Fiapo NFTs. Your royal collection commands the respect of all nobles.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 2500,
      multiplier: 3.0,
      actionType: "BUY_NFT",
      targetUrl: "marketplace:buy:7",
      rewardPoolId: onchainPool.id,
    },

    // ── Marketplace: TRADE tiers ──────────────────────────────────────────
    {
      id: "m-trade-1",
      name: "First Noble Trade",
      description: "Create or accept your first peer-to-peer NFT trade. Loyalty is forged in exchange.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 600,
      multiplier: 2.5,
      actionType: "TRADE_NFT",
      targetUrl: "marketplace:trade:1",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-trade-5",
      name: "Trusted Broker",
      description: "Complete 5 NFT trades on the marketplace. The kingdom trusts your word.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 1500,
      multiplier: 3.0,
      actionType: "TRADE_NFT",
      targetUrl: "marketplace:trade:5",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-trade-15",
      name: "Grand Exchange Master",
      description: "Complete 15 NFT trades. You are the backbone of the royal marketplace economy.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 4000,
      multiplier: 4.0,
      actionType: "TRADE_NFT",
      targetUrl: "marketplace:trade:15",
      rewardPoolId: onchainPool.id,
    },

    // ── Marketplace: BID (Auction) tiers ──────────────────────────────────
    {
      id: "m-bid-1",
      name: "First Royal Bid",
      description: "Lead at least 1 auction as the highest bidder. May the boldest noble win!",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 350,
      multiplier: 2.0,
      actionType: "BID_NFT",
      targetUrl: "marketplace:bid:1",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-bid-3",
      name: "Auction Hunter",
      description: "Lead 3 auctions simultaneously. You have a sharp eye for royal treasures.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 900,
      multiplier: 2.5,
      actionType: "BID_NFT",
      targetUrl: "marketplace:bid:3",
      rewardPoolId: onchainPool.id,
    },
    {
      id: "m-bid-10",
      name: "Auction Sovereign",
      description: "Dominate 10 auctions as the highest bidder. The entire marketplace bows to your wealth.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 3000,
      multiplier: 3.5,
      actionType: "BID_NFT",
      targetUrl: "marketplace:bid:10",
      rewardPoolId: onchainPool.id,
    },

    // ── Other on-chain ────────────────────────────────────────────────────
    {
      id: "m-vote-governance",
      name: "Vote on Governance",
      description: "Cast a vote on any active DAO proposal.",
      type: "ONCHAIN",
      platform: "SMART_CONTRACT",
      basePoints: 350,
      multiplier: 2.5,
      actionType: "VOTE",
      rewardPoolId: onchainPool.id,
    },
  ];

  const allMissions = [...offchainMissions, ...onchainMissions];

  for (const mission of allMissions) {
    await db.mission.upsert({
      where: { id: mission.id },
      update: {
        name: mission.name,
        description: mission.description,
        basePoints: mission.basePoints,
        multiplier: mission.multiplier,
        targetUrl: mission.targetUrl ?? null,
        actionType: mission.actionType ?? null,
      },
      create: {
        id: mission.id,
        name: mission.name,
        description: mission.description,
        type: mission.type,
        platform: mission.platform,
        basePoints: mission.basePoints,
        multiplier: mission.multiplier,
        maxCompletions: (mission as any).maxCompletions ?? 1,
        isActive: true,
        targetUrl: mission.targetUrl ?? null,
        requiredKeyword: (mission as any).requiredKeyword ?? null,
        actionType: mission.actionType ?? null,
        rewardPoolId: mission.rewardPoolId,
      },
    });
    console.log(`  ✅ ${mission.type} | ${mission.name}`);
  }

  console.log(`\nSeeded ${allMissions.length} missions (${offchainMissions.length} off-chain, ${onchainMissions.length} on-chain)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
