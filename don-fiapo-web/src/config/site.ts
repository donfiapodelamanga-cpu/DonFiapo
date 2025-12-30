export const siteConfig = {
  name: "Don Fiapo Dela Manga",
  description: "He doesn't bark — he decrees. The blockchain now has a monarchy. Join the reign.",
  url: "https://donfiapo.com",
  ogImage: "https://donfiapo.com/og.jpg",
  links: {
    twitter: "https://twitter.com/donfiapo",
    telegram: "https://t.me/donfiapo",
    discord: "https://discord.gg/donfiapo",
    github: "https://github.com/donfiapo",
  },
  tokenomics: {
    totalSupply: "300,000,000,000",
    symbol: "$FIAPO",
    decimals: 8, // Fixed: Contract uses 8 decimals
    distribution: {
      staking: 80,   // Fundo de Staking
      airdrop: 7,    // Airdrop
      marketing: 5,  // Marketing
      charity: 5,    // Doação para caridade
      ico: 2,        // IEO/ICO
      team: 1,       // Equipe
    },
  },
  staking: {
    donBurn: { apy: 10, frequency: "daily" },
    donLunes: { apy: 6, frequency: "weekly" },
    donFiapo: { apy: 7, frequency: "monthly" },
  },
  nftPrices: {
    free: 0,
    tier2: 10,
    tier3: 30,
    tier4: 55,
    tier5: 100,
    tier6: 250,
    tier7: 500,
  },
} as const;

export type SiteConfig = typeof siteConfig;
