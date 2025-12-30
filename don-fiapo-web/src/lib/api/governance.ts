/**
 * Governance API Service
 * 
 * Handles communication with the Don Fiapo governance system
 */

import { initializeContract } from './contract';

// ============ Types ============

export type ProposalType = 
  | 'ConfigChange'
  | 'Emergency'
  | 'Upgrade'
  | 'SystemWalletChange'
  | 'PauseSystem'
  | 'ExchangeListing'
  | 'InfluencerMarketing'
  | 'AcceleratedBurn'
  | 'ListingDonation'
  | 'MarketingDonation';

export type ProposalStatus = 'Active' | 'Approved' | 'Rejected' | 'Executed' | 'Expired';

export type VoteType = 'For' | 'Against' | 'Abstain';

export interface Proposal {
  id: number;
  proposer: string;
  proposalType: ProposalType;
  title: string;
  description: string;
  createdAt: number;
  votingStart: number;
  votingEnd: number;
  executionTime: number;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  executed: boolean;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  rejectedProposals: number;
  totalVoters: number;
  totalGovernors: number;
  quorumPercentage: number;
  votingPeriodDays: number;
  timelockPeriodDays: number;
}

export interface GovernanceConfig {
  minGovernors: number;
  quorumBps: number;
  votingPeriod: number;
  timelockPeriod: number;
  proposalLifetime: number;
  minProposalPaymentUsdt: bigint;
  minProposalPaymentFiapo: bigint;
  minVotePaymentUsdt: bigint;
  minVotePaymentFiapo: bigint;
  minStakingForProposal: bigint;
  minStakingForVote: bigint;
}

export interface UserVote {
  proposalId: number;
  vote: VoteType;
  weight: number;
  timestamp: number;
}

// ============ Mock Data ============

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 1,
    proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    proposalType: 'ConfigChange',
    title: "Increase Staking APY to 12%",
    description: "Proposal to increase the maximum APY for Don Fiapo staking pool from 10% to 12% to incentivize more participation.",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    votingStart: Date.now() - 5 * 24 * 60 * 60 * 1000,
    votingEnd: Date.now() + 2 * 24 * 60 * 60 * 1000,
    executionTime: Date.now() + 4 * 24 * 60 * 60 * 1000,
    status: 'Active',
    votesFor: 2450000,
    votesAgainst: 890000,
    votesAbstain: 120000,
    executed: false,
  },
  {
    id: 2,
    proposer: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    proposalType: 'ConfigChange',
    title: "Add New NFT Tier - Emperor",
    description: "Create a new ultra-rare Emperor tier NFT with exclusive benefits including 50,000 FIAPO/day mining rate and VIP governance voting power.",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    votingStart: Date.now() - 3 * 24 * 60 * 60 * 1000,
    votingEnd: Date.now() + 4 * 24 * 60 * 60 * 1000,
    executionTime: Date.now() + 6 * 24 * 60 * 60 * 1000,
    status: 'Active',
    votesFor: 1890000,
    votesAgainst: 1200000,
    votesAbstain: 50000,
    executed: false,
  },
  {
    id: 3,
    proposer: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",
    proposalType: 'AcceleratedBurn',
    title: "Accelerate Burn Rate by 50%",
    description: "Increase the burn rate from 30% to 45% of transaction fees for the next 30 days to reduce circulating supply faster.",
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    votingStart: Date.now() - 15 * 24 * 60 * 60 * 1000,
    votingEnd: Date.now() - 8 * 24 * 60 * 60 * 1000,
    executionTime: Date.now() - 6 * 24 * 60 * 60 * 1000,
    status: 'Executed',
    votesFor: 3200000,
    votesAgainst: 800000,
    votesAbstain: 200000,
    executed: true,
  },
  {
    id: 4,
    proposer: "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
    proposalType: 'ExchangeListing',
    title: "Partnership with DEX Jupiter",
    description: "Approve strategic partnership with Jupiter DEX for improved liquidity and cross-chain swaps integration.",
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    votingStart: Date.now() - 20 * 24 * 60 * 60 * 1000,
    votingEnd: Date.now() - 13 * 24 * 60 * 60 * 1000,
    executionTime: Date.now() - 11 * 24 * 60 * 60 * 1000,
    status: 'Rejected',
    votesFor: 1100000,
    votesAgainst: 2900000,
    votesAbstain: 150000,
    executed: false,
  },
  {
    id: 5,
    proposer: "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL",
    proposalType: 'InfluencerMarketing',
    title: "Marketing Campaign with Crypto Influencer",
    description: "Allocate 5,000 USDT from marketing fund for promotional content with a verified crypto influencer on YouTube (500k+ subscribers).",
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    votingStart: Date.now() - 25 * 24 * 60 * 60 * 1000,
    votingEnd: Date.now() - 18 * 24 * 60 * 60 * 1000,
    executionTime: Date.now() - 16 * 24 * 60 * 60 * 1000,
    status: 'Executed',
    votesFor: 2800000,
    votesAgainst: 600000,
    votesAbstain: 100000,
    executed: true,
  },
];

const MOCK_STATS: GovernanceStats = {
  totalProposals: 24,
  activeProposals: 2,
  passedProposals: 18,
  rejectedProposals: 4,
  totalVoters: 1234,
  totalGovernors: 5,
  quorumPercentage: 60,
  votingPeriodDays: 7,
  timelockPeriodDays: 2,
};

const MOCK_CONFIG: GovernanceConfig = {
  minGovernors: 3,
  quorumBps: 6000,
  votingPeriod: 7 * 24 * 60 * 60,
  timelockPeriod: 2 * 24 * 60 * 60,
  proposalLifetime: 30 * 24 * 60 * 60,
  minProposalPaymentUsdt: BigInt(1000) * BigInt(10 ** 6),
  minProposalPaymentFiapo: BigInt(1000) * BigInt(10 ** 8),
  minVotePaymentUsdt: BigInt(100) * BigInt(10 ** 6),
  minVotePaymentFiapo: BigInt(100) * BigInt(10 ** 8),
  minStakingForProposal: BigInt(1000) * BigInt(10 ** 8),
  minStakingForVote: BigInt(100) * BigInt(10 ** 8),
};

// ============ API Functions ============

/**
 * Get all proposals with optional filter
 */
export async function getProposals(filter?: ProposalStatus): Promise<Proposal[]> {
  try {
    const contract = await initializeContract();
    
    if (!contract) {
      console.log('[Governance] Using mock data');
      if (filter) {
        return MOCK_PROPOSALS.filter(p => p.status === filter);
      }
      return MOCK_PROPOSALS;
    }

    const { result, output } = await contract.query.getProposals(
      contract.address,
      { gasLimit: -1 },
      filter
    );

    if (result.isOk && output) {
      return (output.toJSON() as any[]).map(parseProposal);
    }

    return filter ? MOCK_PROPOSALS.filter(p => p.status === filter) : MOCK_PROPOSALS;
  } catch (error) {
    console.error('[Governance] Error fetching proposals:', error);
    return filter ? MOCK_PROPOSALS.filter(p => p.status === filter) : MOCK_PROPOSALS;
  }
}

/**
 * Get a single proposal by ID
 */
export async function getProposal(id: number): Promise<Proposal | null> {
  try {
    const contract = await initializeContract();
    
    if (!contract) {
      return MOCK_PROPOSALS.find(p => p.id === id) || null;
    }

    const { result, output } = await contract.query.getProposal(
      contract.address,
      { gasLimit: -1 },
      id
    );

    if (result.isOk && output) {
      return parseProposal(output.toJSON());
    }

    return MOCK_PROPOSALS.find(p => p.id === id) || null;
  } catch (error) {
    console.error('[Governance] Error fetching proposal:', error);
    return MOCK_PROPOSALS.find(p => p.id === id) || null;
  }
}

/**
 * Get governance statistics
 */
export async function getGovernanceStats(): Promise<GovernanceStats> {
  try {
    const contract = await initializeContract();
    
    if (!contract) {
      return MOCK_STATS;
    }

    const { result, output } = await contract.query.getGovernanceStats(
      contract.address,
      { gasLimit: -1 }
    );

    if (result.isOk && output) {
      return parseGovernanceStats(output.toJSON());
    }

    return MOCK_STATS;
  } catch (error) {
    console.error('[Governance] Error fetching stats:', error);
    return MOCK_STATS;
  }
}

/**
 * Get governance configuration
 */
export async function getGovernanceConfig(): Promise<GovernanceConfig> {
  try {
    const contract = await initializeContract();
    
    if (!contract) {
      return MOCK_CONFIG;
    }

    const { result, output } = await contract.query.getGovernanceConfig(
      contract.address,
      { gasLimit: -1 }
    );

    if (result.isOk && output) {
      return parseGovernanceConfig(output.toJSON());
    }

    return MOCK_CONFIG;
  } catch (error) {
    console.error('[Governance] Error fetching config:', error);
    return MOCK_CONFIG;
  }
}

/**
 * Check if user can create proposal
 */
export async function canCreateProposal(address: string): Promise<{
  canCreate: boolean;
  reason?: string;
  requiredStaking: bigint;
  requiredPayment: bigint;
}> {
  try {
    const contract = await initializeContract();
    const config = await getGovernanceConfig();
    
    if (!contract) {
      return {
        canCreate: true,
        requiredStaking: config.minStakingForProposal,
        requiredPayment: config.minProposalPaymentUsdt,
      };
    }

    const { result, output } = await contract.query.canCreateProposal(
      contract.address,
      { gasLimit: -1 },
      address
    );

    if (result.isOk && output) {
      const data = output.toJSON() as any;
      return {
        canCreate: data.canCreate || data.can_create,
        reason: data.reason,
        requiredStaking: BigInt(data.requiredStaking || data.required_staking || 0),
        requiredPayment: BigInt(data.requiredPayment || data.required_payment || 0),
      };
    }

    return {
      canCreate: true,
      requiredStaking: config.minStakingForProposal,
      requiredPayment: config.minProposalPaymentUsdt,
    };
  } catch (error) {
    console.error('[Governance] Error checking proposal eligibility:', error);
    return {
      canCreate: false,
      reason: 'Error checking eligibility',
      requiredStaking: BigInt(0),
      requiredPayment: BigInt(0),
    };
  }
}

/**
 * Check if user can vote
 */
export async function canVote(address: string, proposalId: number): Promise<{
  canVote: boolean;
  reason?: string;
  hasVoted: boolean;
  voteWeight: number;
}> {
  try {
    const contract = await initializeContract();
    
    if (!contract) {
      return {
        canVote: true,
        hasVoted: false,
        voteWeight: 1,
      };
    }

    const { result, output } = await contract.query.canVote(
      contract.address,
      { gasLimit: -1 },
      address,
      proposalId
    );

    if (result.isOk && output) {
      const data = output.toJSON() as any;
      return {
        canVote: data.canVote || data.can_vote,
        reason: data.reason,
        hasVoted: data.hasVoted || data.has_voted,
        voteWeight: data.voteWeight || data.vote_weight || 1,
      };
    }

    return {
      canVote: true,
      hasVoted: false,
      voteWeight: 1,
    };
  } catch (error) {
    console.error('[Governance] Error checking vote eligibility:', error);
    return {
      canVote: false,
      reason: 'Error checking eligibility',
      hasVoted: false,
      voteWeight: 0,
    };
  }
}

/**
 * Get user's vote on a proposal
 */
export async function getUserVote(address: string, proposalId: number): Promise<UserVote | null> {
  try {
    const contract = await initializeContract();
    
    if (!contract) {
      return null;
    }

    const { result, output } = await contract.query.getVote(
      contract.address,
      { gasLimit: -1 },
      proposalId,
      address
    );

    if (result.isOk && output) {
      const data = output.toJSON() as any;
      if (data) {
        return {
          proposalId,
          vote: data.vote,
          weight: data.weight,
          timestamp: data.timestamp,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Governance] Error fetching user vote:', error);
    return null;
  }
}

/**
 * Check if an address is a governor
 */
export async function isGovernor(address: string): Promise<boolean> {
  try {
    const contract = await initializeContract();
    
    if (!contract) {
      return false;
    }

    const { result, output } = await contract.query.isGovernor(
      contract.address,
      { gasLimit: -1 },
      address
    );

    if (result.isOk && output) {
      return output.toJSON() as boolean;
    }

    return false;
  } catch (error) {
    console.error('[Governance] Error checking governor status:', error);
    return false;
  }
}

// ============ Helper Functions ============

function parseProposal(data: any): Proposal {
  return {
    id: data.id || 0,
    proposer: data.proposer || '',
    proposalType: data.proposalType || data.proposal_type || 'ConfigChange',
    title: data.title || data.description?.substring(0, 50) || 'Untitled Proposal',
    description: data.description || '',
    createdAt: data.createdAt || data.created_at || Date.now(),
    votingStart: data.votingStart || data.voting_start || Date.now(),
    votingEnd: data.votingEnd || data.voting_end || Date.now(),
    executionTime: data.executionTime || data.execution_time || Date.now(),
    status: data.status || 'Active',
    votesFor: data.votesFor || data.votes_for || 0,
    votesAgainst: data.votesAgainst || data.votes_against || 0,
    votesAbstain: data.votesAbstain || data.votes_abstain || 0,
    executed: data.executed || false,
  };
}

function parseGovernanceStats(data: any): GovernanceStats {
  return {
    totalProposals: data.totalProposals || data.total_proposals || 0,
    activeProposals: data.activeProposals || data.active_proposals || 0,
    passedProposals: data.passedProposals || data.passed_proposals || 0,
    rejectedProposals: data.rejectedProposals || data.rejected_proposals || 0,
    totalVoters: data.totalVoters || data.total_voters || 0,
    totalGovernors: data.totalGovernors || data.total_governors || 0,
    quorumPercentage: data.quorumPercentage || data.quorum_percentage || 60,
    votingPeriodDays: data.votingPeriodDays || data.voting_period_days || 7,
    timelockPeriodDays: data.timelockPeriodDays || data.timelock_period_days || 2,
  };
}

function parseGovernanceConfig(data: any): GovernanceConfig {
  return {
    minGovernors: data.minGovernors || data.min_governors || 3,
    quorumBps: data.quorumBps || data.quorum_bps || 6000,
    votingPeriod: data.votingPeriod || data.voting_period || 604800,
    timelockPeriod: data.timelockPeriod || data.timelock_period || 172800,
    proposalLifetime: data.proposalLifetime || data.proposal_lifetime || 2592000,
    minProposalPaymentUsdt: BigInt(data.minProposalPaymentUsdt || data.min_proposal_payment_usdt || 0),
    minProposalPaymentFiapo: BigInt(data.minProposalPaymentFiapo || data.min_proposal_payment_fiapo || 0),
    minVotePaymentUsdt: BigInt(data.minVotePaymentUsdt || data.min_vote_payment_usdt || 0),
    minVotePaymentFiapo: BigInt(data.minVotePaymentFiapo || data.min_vote_payment_fiapo || 0),
    minStakingForProposal: BigInt(data.minStakingForProposal || data.min_staking_for_proposal || 0),
    minStakingForVote: BigInt(data.minStakingForVote || data.min_staking_for_vote || 0),
  };
}
