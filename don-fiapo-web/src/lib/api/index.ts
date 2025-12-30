/**
 * Don Fiapo API
 * 
 * Central export for all API functionality
 */

export { API_CONFIG } from './config';
export * from './contract';
export { CONTRACT_ABI } from './contract-abi';
export * from './oracle';
export * from './ranking';
export * from './governance';
export {
  getAffiliateInfo as getAffiliateInfoV2,
  getAffiliateStats,
  getReferrals,
  getAffiliateLeaderboard,
  isAffiliateRegistered,
  validateReferralCode,
  type AffiliateInfo as AffiliateInfoV2,
  type AffiliateStats,
  type ReferralRecord,
  type AffiliateLeaderboard,
} from './affiliate';
