// ==========================================
// Royal Missions - Type Definitions
// ==========================================

export type MissionType = "OFFCHAIN" | "ONCHAIN";
export type MissionPlatform = "X" | "TELEGRAM" | "MINIAPP" | "WALLET" | "NFT" | "SMART_CONTRACT" | "REFERRAL" | "TIKTOK" | "YOUTUBE" | "MEDIUM" | "CMC";
export type MissionAction = "FOLLOW" | "LIKE" | "REPOST" | "COMMENT" | "CONNECT_WALLET" | "STAKE" | "SWAP" | "MINT_NFT" | "VOTE" | "JOIN_GROUP" | "BUY_NFT" | "SELL_NFT" | "TRADE_NFT" | "BID_NFT" | "VIDEO_TIKTOK" | "VIDEO_YOUTUBE" | "SPIN" | "ARTICLE_MEDIUM" | "ARTICLE_CMC" | "REFER_FREE" | "REFER_NFT";
export type MissionStatus = "ACTIVE" | "PAUSED" | "DRAFT" | "ARCHIVED";
export type CompletionStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type UserRank = "PLEBEU" | "CAVALEIRO" | "NOBRE" | "GENERAL" | "ALPHA";
export type FraudSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface MissionDTO {
  id: string;
  name: string;
  description: string;
  type: MissionType;
  platform: MissionPlatform;
  basePoints: number;
  multiplier: number;
  maxCompletions: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  status: MissionStatus;
  priority: number;
  category: string | null;
  targetUrl: string | null;
  actionType: string | null;
  userStatus?: CompletionStatus | null;
  completedCount?: number;
}

// ==========================================
// Referral Milestone Types
// ==========================================
export const REFERRAL_MILESTONE_TIERS = [1, 5, 10, 30, 50, 100, 1000, 5000, 10000] as const;
export type ReferralMilestoneTier = typeof REFERRAL_MILESTONE_TIERS[number];

export interface ReferralMilestoneDTO {
  tier: number;
  name: string;
  bonusPoints: number;
  badge: string | null;
  isActive: boolean;
}

export interface ReferralMilestoneAwardDTO {
  milestoneTier: number;
  bonusPoints: number;
  awardedAt: string;
}

// Point values for referral activities
export const REFERRAL_POINTS = {
  FREE_SOCIAL_TASK: 25,   // Referred friend completes a free social task
  NFT_MINT: 150,          // Referred friend mints a paid NFT
  WALLET_CONNECT: 10,     // Referred friend connects wallet
} as const;

export interface UserScoreDTO {
  offchainScore: number;
  onchainScore: number;
  multiplier: number;
  totalScore: number;
  rank: UserRank;
  completedMissions: number;
  totalMissions: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  address: string;
  level: UserRank;
  totalScore: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  top: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalParticipants: number;
}

// Rank thresholds
export const RANK_THRESHOLDS: Record<UserRank, number> = {
  PLEBEU: 0,
  CAVALEIRO: 500,
  NOBRE: 2500,
  GENERAL: 10000,
  ALPHA: 50000,
};

// On-chain multiplier for score calculation
export const ONCHAIN_MULTIPLIER = 3;
