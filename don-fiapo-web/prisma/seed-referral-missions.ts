import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const REFERRAL_MISSIONS = [
  // ═══════════════════════════════════════════════════════════
  // CORE INVITE MISSIONS (highest priority — top of the list)
  // ═══════════════════════════════════════════════════════════
  {
    id: "m-refer-free",
    name: "Invite a Friend (Free Sign-up)",
    description: "Share your referral link and earn 25 points when your friend connects their wallet and completes a social task. The more friends you invite, the more you earn!",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 25,
    multiplier: 1.5,
    maxCompletions: 10000,
    isActive: true,
    status: "ACTIVE",
    priority: 200,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "",
  },
  {
    id: "m-refer-nft",
    name: "Invite a Friend who Mints an NFT",
    description: "Earn 150 bonus points when a friend you invited mints any Royal NFT! Higher tier NFTs = bigger rewards for both of you. Share your link and build your court.",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 150,
    multiplier: 1.5,
    maxCompletions: 10000,
    isActive: true,
    status: "ACTIVE",
    priority: 199,
    category: "Referral",
    actionType: "REFER_NFT",
    targetUrl: "",
  },
  {
    id: "m-refer-wallet",
    name: "Invite a Friend to Connect Wallet",
    description: "Earn 10 points instantly when someone you invited connects their Lunes wallet for the first time. Every new noble in the kingdom counts!",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 10,
    multiplier: 1.0,
    maxCompletions: 10000,
    isActive: true,
    status: "ACTIVE",
    priority: 198,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "",
  },

  // ═══════════════════════════════════════════════════════════
  // SHARING MISSIONS (spread the word)
  // ═══════════════════════════════════════════════════════════
  {
    id: "m-share-x-profile",
    name: "Share Your X Profile with Referral Link",
    description: "Post your Don Fiapo referral link on your X (Twitter) bio or in a tweet. Screenshot required as proof. Help grow the kingdom!",
    type: "OFFCHAIN",
    platform: "X",
    basePoints: 50,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 195,
    category: "Referral",
    actionType: "COMMENT",
    targetUrl: "https://x.com",
  },
  {
    id: "m-share-telegram-channel",
    name: "Share Don Fiapo in a Telegram Group",
    description: "Share the Don Fiapo Telegram channel (t.me/donfiapodela) or your referral link in 3+ active Telegram crypto groups. Screenshot required.",
    type: "OFFCHAIN",
    platform: "TELEGRAM",
    basePoints: 60,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 194,
    category: "Referral",
    actionType: "COMMENT",
    targetUrl: "https://t.me/donfiapodela",
  },
  {
    id: "m-share-referral-link",
    name: "Share Your Referral Link on Social Media",
    description: "Post your unique Don Fiapo referral link on any social media (Instagram, Facebook, Discord, Reddit, etc). Submit a screenshot as proof.",
    type: "OFFCHAIN",
    platform: "MINIAPP",
    basePoints: 40,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 193,
    category: "Referral",
    actionType: "FOLLOW",
    targetUrl: "",
  },

  // ═══════════════════════════════════════════════════════════
  // MILESTONE MISSIONS (escalating rewards for invite goals)
  // Based on REFERRAL_MILESTONE_TIERS: 1, 5, 10, 30, 50, 100, 1000, 5000, 10000
  // ═══════════════════════════════════════════════════════════
  {
    id: "m-milestone-1",
    name: "Primeiro Arauto — Invite 1 Friend",
    description: "Your first referral! Welcome your first noble to the Kingdom. You are now a Herald of Don Fiapo.",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 50,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 190,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:1",
  },
  {
    id: "m-milestone-5",
    name: "Mensageiro Real — Invite 5 Friends",
    description: "5 nobles recruited! You are now a Royal Messenger. The court recognizes your influence.",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 200,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 189,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:5",
  },
  {
    id: "m-milestone-10",
    name: "Embaixador — Invite 10 Friends",
    description: "10 nobles in your court! You've earned the title of Ambassador. Your word carries weight in the Kingdom.",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 500,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 188,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:10",
  },
  {
    id: "m-milestone-30",
    name: "Capitão de Recrutamento — Invite 30 Friends",
    description: "30 recruits! You are now a Recruitment Captain. The Don acknowledges your strategic importance.",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 1500,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 187,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:30",
  },
  {
    id: "m-milestone-50",
    name: "General da Expansão — Invite 50 Friends",
    description: "50 warriors! You command a small army. The Expansion General title is yours. Massive bonus unlocked!",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 3000,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 186,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:50",
  },
  {
    id: "m-milestone-100",
    name: "Conquistador — Invite 100 Friends",
    description: "100 nobles under your banner! You are a true Conqueror. The Kingdom trembles at your influence. Legendary reward!",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 7500,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 185,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:100",
  },
  {
    id: "m-milestone-1000",
    name: "Lorde do Reino — Invite 1,000 Friends",
    description: "1,000 souls! You are a Lord of the Kingdom. Your influence is unmatched. 50,000 bonus points!",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 50000,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 184,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:1000",
  },
  {
    id: "m-milestone-5000",
    name: "Grão-Mestre — Invite 5,000 Friends",
    description: "5,000 nobles! The Grand Master title is bestowed upon you. 200,000 bonus points! You are building an empire.",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 200000,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 183,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:5000",
  },
  {
    id: "m-milestone-10000",
    name: "Imperador Supremo — Invite 10,000 Friends",
    description: "10,000 subjects! You ARE the Kingdom. The Supreme Emperor title + 500,000 points. Only legends reach this tier.",
    type: "OFFCHAIN",
    platform: "REFERRAL",
    basePoints: 500000,
    multiplier: 1.0,
    maxCompletions: 1,
    isActive: true,
    status: "ACTIVE",
    priority: 182,
    category: "Referral",
    actionType: "REFER_FREE",
    targetUrl: "milestone:10000",
  },
];

async function main() {
  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const m of REFERRAL_MISSIONS) {
    const exists = await db.mission.findUnique({ where: { id: m.id } });
    if (exists) {
      // Update priority and category if it exists but with wrong values
      if (exists.priority !== m.priority || exists.category !== m.category) {
        await db.mission.update({
          where: { id: m.id },
          data: { priority: m.priority, category: m.category, description: m.description },
        });
        console.log(`  UPD: ${m.name} (priority ${exists.priority} → ${m.priority})`);
        updated++;
      } else {
        console.log(`  SKIP: ${m.name} (already exists)`);
        skipped++;
      }
      continue;
    }
    await db.mission.create({ data: m });
    console.log(`  OK: ${m.name} (+${m.basePoints} pts, priority ${m.priority})`);
    created++;
  }

  // Also update the old m-invite-friend to have referral category and high priority
  const oldInvite = await db.mission.findUnique({ where: { id: "m-invite-friend" } });
  if (oldInvite && oldInvite.priority < 100) {
    await db.mission.update({
      where: { id: "m-invite-friend" },
      data: {
        priority: 197,
        category: "Referral",
        platform: "REFERRAL",
        actionType: "REFER_FREE",
        description: "Refer a new user who connects their wallet. Share your unique referral link and earn points for every friend who joins the Kingdom!",
      },
    });
    console.log(`  UPD: m-invite-friend (moved to Referral, priority → 197)`);
    updated++;
  }

  // Seed referral milestones into the ReferralMilestone table too
  const milestones = [
    { tier: 1,     name: "Primeiro Arauto",          bonusPoints: 50,     badge: "herald" },
    { tier: 5,     name: "Mensageiro Real",           bonusPoints: 200,    badge: "messenger" },
    { tier: 10,    name: "Embaixador",                bonusPoints: 500,    badge: "ambassador" },
    { tier: 30,    name: "Capitão de Recrutamento",   bonusPoints: 1500,   badge: "captain" },
    { tier: 50,    name: "General da Expansão",       bonusPoints: 3000,   badge: "general" },
    { tier: 100,   name: "Conquistador",              bonusPoints: 7500,   badge: "conqueror" },
    { tier: 1000,  name: "Lorde do Reino",            bonusPoints: 50000,  badge: "lord" },
    { tier: 5000,  name: "Grão-Mestre",               bonusPoints: 200000, badge: "grandmaster" },
    { tier: 10000, name: "Imperador Supremo",         bonusPoints: 500000, badge: "emperor" },
  ];

  let milestonesCreated = 0;
  for (const m of milestones) {
    try {
      const exists = await db.referralMilestone.findUnique({ where: { tier: m.tier } });
      if (!exists) {
        await db.referralMilestone.create({ data: m });
        milestonesCreated++;
      }
    } catch {
      // Table might not exist yet — skip silently
    }
  }
  if (milestonesCreated > 0) {
    console.log(`  Milestones: ${milestonesCreated} seeded into ReferralMilestone table`);
  }

  const total = await db.mission.count();
  console.log(`\nDone: ${created} created, ${updated} updated, ${skipped} skipped. Total missions: ${total}`);
}

main()
  .catch((e) => { console.error("SEED ERROR:", e); process.exit(1); })
  .finally(() => db.$disconnect());
