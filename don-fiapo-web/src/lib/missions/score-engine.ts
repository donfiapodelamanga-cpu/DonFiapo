import { ONCHAIN_MULTIPLIER, RANK_THRESHOLDS, type UserRank } from "./types";

/**
 * Calculate total score using the dynamic scoring formula:
 * Total Score = Offchain Points + (Onchain Points x Multiplier)
 */
export function calculateTotalScore(offchainScore: number, onchainScore: number, multiplier: number = ONCHAIN_MULTIPLIER): number {
  return offchainScore + (onchainScore * multiplier);
}

/**
 * Determine user rank based on total score
 */
export function calculateRank(totalScore: number): UserRank {
  const ranks = Object.entries(RANK_THRESHOLDS)
    .sort(([, a], [, b]) => b - a) as [UserRank, number][];

  for (const [rank, threshold] of ranks) {
    if (totalScore >= threshold) {
      return rank;
    }
  }
  return "PLEBEU";
}

/**
 * Get rank multiplier bonus (higher ranks earn more per mission)
 */
export function getRankMultiplier(rank: UserRank): number {
  switch (rank) {
    case "ALPHA": return 2.0;
    case "GENERAL": return 1.5;
    case "NOBRE": return 1.25;
    case "CAVALEIRO": return 1.1;
    case "PLEBEU": return 1.0;
  }
}

/**
 * Calculate earned points for a mission completion
 */
export function calculateMissionPoints(
  basePoints: number,
  missionMultiplier: number,
  missionType: "OFFCHAIN" | "ONCHAIN",
  userRank: UserRank
): number {
  const rankBonus = getRankMultiplier(userRank);
  const typeMultiplier = missionType === "ONCHAIN" ? ONCHAIN_MULTIPLIER : 1;
  return Math.floor(basePoints * missionMultiplier * rankBonus * typeMultiplier);
}
