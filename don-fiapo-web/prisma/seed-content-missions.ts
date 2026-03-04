import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CONTENT_MISSIONS = [
  {
    id: "m-blog-article",
    name: "Write a Blog Article about Don Fiapo",
    description: "Write an original article (500+ words) about Don Fiapo on your blog, Substack, Mirror, or any platform. Must mention $FIAPO, donfiapo.fun and include accurate tokenomics.",
    type: "OFFCHAIN",
    platform: "BLOG",
    basePoints: 500,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 92,
    category: "Content",
    actionType: "ARTICLE_BLOG",
    targetUrl: "",
  },
  {
    id: "m-x-thread",
    name: "Create a Twitter/X Thread about Don Fiapo",
    description: "Write a quality thread (5+ tweets) about Don Fiapo ecosystem, tokenomics, or airdrop. Use #DonFiapo #CryptoAirdrop2026 and tag @DonFiapo.",
    type: "OFFCHAIN",
    platform: "X",
    basePoints: 400,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 91,
    category: "Content",
    actionType: "ARTICLE_CMC",
    targetUrl: "https://x.com",
  },
  {
    id: "m-instagram-reel",
    name: "Create an Instagram Reel about Don Fiapo",
    description: "Record a creative Instagram Reel mentioning Don Fiapo and $FIAPO. Tag @donfiapo and use #DonFiapo #CryptoAirdrop. Minimum 15 seconds.",
    type: "OFFCHAIN",
    platform: "INSTAGRAM",
    basePoints: 350,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 90,
    category: "Content",
    actionType: "VIDEO_TIKTOK",
    targetUrl: "https://instagram.com",
  },
  {
    id: "m-reddit-post",
    name: "Post about Don Fiapo on Reddit",
    description: "Create a quality post about Don Fiapo on r/CryptoCurrency, r/CryptoMoonShots, r/memecoins or any relevant crypto subreddit. Include $FIAPO and a link to donfiapo.fun.",
    type: "OFFCHAIN",
    platform: "REDDIT",
    basePoints: 300,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 88,
    category: "Content",
    actionType: "ARTICLE_CMC",
    targetUrl: "https://reddit.com",
  },
  {
    id: "m-instagram-story",
    name: "Post an Instagram Story about Don Fiapo",
    description: "Share an Instagram Story mentioning Don Fiapo and $FIAPO. Use #DonFiapo and tag @donfiapo. Screenshot required as proof.",
    type: "OFFCHAIN",
    platform: "INSTAGRAM",
    basePoints: 150,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 85,
    category: "Content",
    actionType: "VIDEO_TIKTOK",
    targetUrl: "https://instagram.com",
  },
  {
    id: "m-reddit-engage",
    name: "Engage in Crypto Reddit Discussions",
    description: "Comment on 3+ crypto subreddit posts mentioning Don Fiapo naturally. No spam — genuine engagement only. Link your Reddit profile.",
    type: "OFFCHAIN",
    platform: "REDDIT",
    basePoints: 150,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 65,
    category: "Community",
    actionType: "COMMENT",
    targetUrl: "https://reddit.com",
  },
  {
    id: "m-discord-join",
    name: "Join Don Fiapo Discord Server",
    description: "Join the official Don Fiapo Discord server and introduce yourself in #general. Stay active to earn your points.",
    type: "OFFCHAIN",
    platform: "DISCORD",
    basePoints: 100,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 70,
    category: "Community",
    actionType: "FOLLOW",
    targetUrl: "https://discord.gg/donfiapo",
  },
  {
    id: "m-instagram-follow",
    name: "Follow @DonFiapo on Instagram",
    description: "Follow the official Don Fiapo Instagram account and like at least 3 recent posts.",
    type: "OFFCHAIN",
    platform: "INSTAGRAM",
    basePoints: 80,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 60,
    category: "Social",
    actionType: "FOLLOW",
    targetUrl: "https://instagram.com/donfiapo",
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const m of CONTENT_MISSIONS) {
    const exists = await db.mission.findUnique({ where: { id: m.id } });
    if (exists) {
      console.log(`  SKIP: ${m.name} (already exists)`);
      skipped++;
      continue;
    }
    await db.mission.create({ data: m });
    console.log(`  OK: ${m.name} (+${m.basePoints} pts)`);
    created++;
  }

  const total = await db.mission.count();
  console.log(`\nDone: ${created} created, ${skipped} skipped. Total missions: ${total}`);
}

main()
  .catch((e) => { console.error("SEED ERROR:", e); process.exit(1); })
  .finally(() => db.$disconnect());
