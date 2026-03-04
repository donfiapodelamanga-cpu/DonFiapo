export const siteConfig = {
  name: "Don Fiapo De la Manga",
  description: "He doesn't bark — he decrees. The blockchain now has a monarchy. Join the reign.",
  url: "https://donfiapo.fun",
  ogImage: "https://donfiapo.fun/og.jpg",
  links: {
    twitter: "https://x.com/DonFiapo",
    telegram: "https://t.me/donfiapodela",
    github: "https://github.com/donfiapodelamanga-cpu/DonFiapo",
    soquest: "https://soquest.xyz/space/donfiapo",
    medium: "https://medium.com/@donfiapodelamanga",
    solsale: "https://solsale.app/presale/2m8QMqiJW1iKv4W3eFbBujKHD9yHVYX1qiVPnPrDGGJP",
  },
  icoLaunchDate: "2026-02-27T12:00:00Z", // Fixed launch date for countdown (30 days from Jan 28)
  tokenomics: {
    totalSupply: "600,000,000,000",
    symbol: "$FIAPO",
    decimals: 8, // Fixed: Contract uses 8 decimals
    distribution: {
      presale: 25,      // Pré-venda (150B)
      staking: 51.67,   // Fundo de Staking (310B)
      airdrop: 5.08,    // Airdrop (30.5B)
      marketing: 3.42,  // Marketing (20.5B)
      charity: 3.42,    // Doação para caridade (20.5B)
      ico: 10.67,       // IEO/ICO (64B)
      team: 0.75,       // Equipe (4.5B)
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
