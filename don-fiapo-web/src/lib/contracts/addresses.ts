/**
 * Contract Addresses Configuration
 * 
 * Endereços dos contratos Ink! do ecossistema Don Fiapo.
 * Atualize os endereços após o deploy de cada contrato.
 */

export interface ContractAddresses {
  core: string;
  ico: string;
  staking: string;
  governance: string;
  lottery: string;
  airdrop: string;
  rewards: string;
  marketplace: string;
  affiliate: string;
  spinGame: string;
  security: string;
  timelock: string;
  upgrade: string;
  oracleMultisig: string;
}

// Endereços dos contratos - substituir após deploy
export const CONTRACT_ADDRESSES: ContractAddresses = {
  // Core token contract (PSP22)
  core: process.env.NEXT_PUBLIC_CORE_CONTRACT || '',
  
  // ICO & NFT Mining
  ico: process.env.NEXT_PUBLIC_ICO_CONTRACT || '',
  
  // Staking pools
  staking: process.env.NEXT_PUBLIC_STAKING_CONTRACT || '',
  
  // Governance & Voting
  governance: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT || '',
  
  // Lottery
  lottery: process.env.NEXT_PUBLIC_LOTTERY_CONTRACT || '',
  
  // Airdrop
  airdrop: process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || '',
  
  // Rewards & Rankings
  rewards: process.env.NEXT_PUBLIC_REWARDS_CONTRACT || '',
  
  // NFT Marketplace
  marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT || '',
  
  // Affiliate system
  affiliate: process.env.NEXT_PUBLIC_AFFILIATE_CONTRACT || '',
  
  // Spin Game (Royal Wheel)
  spinGame: process.env.NEXT_PUBLIC_SPIN_GAME_CONTRACT || '',
  
  // Security module
  security: process.env.NEXT_PUBLIC_SECURITY_CONTRACT || '',
  
  // Timelock
  timelock: process.env.NEXT_PUBLIC_TIMELOCK_CONTRACT || '',
  
  // Upgrade system
  upgrade: process.env.NEXT_PUBLIC_UPGRADE_CONTRACT || '',
  
  // Oracle Multisig
  oracleMultisig: process.env.NEXT_PUBLIC_ORACLE_MULTISIG_CONTRACT || '',
};

// Helper para verificar se um contrato está configurado
export function isContractConfigured(contractName: keyof ContractAddresses): boolean {
  return !!CONTRACT_ADDRESSES[contractName] && CONTRACT_ADDRESSES[contractName].length > 0;
}

// Helper para obter endereço com validação
export function getContractAddress(contractName: keyof ContractAddresses): string {
  const address = CONTRACT_ADDRESSES[contractName];
  if (!address) {
    console.warn(`[Contracts] Address not configured for: ${contractName}`);
  }
  return address;
}

// Nomes amigáveis dos contratos
export const CONTRACT_NAMES: Record<keyof ContractAddresses, string> = {
  core: 'FIAPO Token (Core)',
  ico: 'ICO & NFT Mining',
  staking: 'Staking Pools',
  governance: 'Governance',
  lottery: 'Lottery',
  airdrop: 'Airdrop',
  rewards: 'Rewards & Rankings',
  marketplace: 'NFT Marketplace',
  affiliate: 'Affiliate System',
  spinGame: 'Royal Wheel Game',
  security: 'Security Module',
  timelock: 'Timelock',
  upgrade: 'Upgrade System',
  oracleMultisig: 'Oracle Multisig',
};
