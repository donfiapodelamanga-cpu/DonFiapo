/**
 * Contracts Module
 * 
 * Exportações centralizadas para todos os clientes de contratos.
 */

// Configuração de endereços
export * from './addresses';

// Cliente base
export * from './client';

// Clientes específicos
export * as CoreClient from './core-client';
export * as StakingClient from './staking-client';
export * as ICOClient from './ico-client';

// Spin Game (classe legada)
export { SpinGameClient } from './spin-game-client';

// Re-export types
export type { ContractAddresses } from './addresses';
export type { StakingPosition, StakingPoolInfo } from './staking-client';
export type { NFTData, NFTConfig, ICOStats } from './ico-client';
