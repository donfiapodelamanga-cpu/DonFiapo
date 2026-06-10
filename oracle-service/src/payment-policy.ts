import { PaymentType } from './db';

const USDT_DECIMALS = 1_000_000;

const SPIN_PACKAGES = [
  { id: 'spin-1', spins: 1, priceUsdt: 1 },
  { id: 'spin-10', spins: 10, priceUsdt: 9 },
  { id: 'spin-50', spins: 50, priceUsdt: 40 },
  { id: 'spin-100', spins: 100, priceUsdt: 75 },
  { id: 'spin-500', spins: 500, priceUsdt: 300 },
] as const;

const NFT_TIERS = [
  { id: 0, priceUsdt: 0, totalMining: 560 },
  { id: 1, priceUsdt: 14, totalMining: 5_600 },
  { id: 2, priceUsdt: 41, totalMining: 16_800 },
  { id: 3, priceUsdt: 75, totalMining: 33_600 },
  { id: 4, priceUsdt: 136, totalMining: 56_000 },
  { id: 5, priceUsdt: 340, totalMining: 134_400 },
  { id: 6, priceUsdt: 680, totalMining: 280_000 },
] as const;

const STAKING_POOLS = new Set(['don-burn', 'don-lunes', 'don-fiapo']);
const ENTRY_FEE_TIERS = [
  { maxAmount: 1_000, feePercent: 2 },
  { maxAmount: 10_000, feePercent: 1 },
  { maxAmount: 100_000, feePercent: 0.5 },
  { maxAmount: 500_000, feePercent: 0.25 },
  { maxAmount: Infinity, feePercent: 0.1 },
] as const;

export class InvalidPaymentRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPaymentRequestError';
  }
}

export interface RawPaymentCreateRequest {
  lunesAccount?: unknown;
  paymentType?: unknown;
  itemAmount?: unknown;
  expectedAmount?: unknown;
  expectedSender?: unknown;
  packageId?: unknown;
  tierId?: unknown;
  quantity?: unknown;
  stakingType?: unknown;
  paymentMethod?: unknown;
  fiapoAmount?: unknown;
}

export interface NormalizedPaymentCreateRequest {
  lunesAccount: string;
  paymentType: PaymentType;
  itemAmount: number;
  expectedAmount: number;
  expectedSender?: string;
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidPaymentRequestError(`${field} is required`);
  }
  return value.trim();
}

function assertPositiveFiniteNumber(value: unknown, field: string): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new InvalidPaymentRequestError(`${field} must be a positive finite number`);
  }
  return numeric;
}

function assertPositiveInteger(value: unknown, field: string): number {
  const numeric = assertPositiveFiniteNumber(value, field);
  if (!Number.isInteger(numeric)) {
    throw new InvalidPaymentRequestError(`${field} must be a positive integer`);
  }
  return numeric;
}

function assertPositiveAtomicAmount(value: unknown, field: string): number {
  const numeric = assertPositiveFiniteNumber(value, field);
  if (!Number.isInteger(numeric)) {
    throw new InvalidPaymentRequestError(`${field} must be an integer atomic amount`);
  }
  return numeric;
}

function optionalNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function hasClientPricedField(input: RawPaymentCreateRequest): boolean {
  return (
    Object.prototype.hasOwnProperty.call(input, 'itemAmount') ||
    Object.prototype.hasOwnProperty.call(input, 'expectedAmount')
  );
}

function rejectClientPricedFields(input: RawPaymentCreateRequest): void {
  if (hasClientPricedField(input)) {
    throw new InvalidPaymentRequestError('Client supplied itemAmount/expectedAmount is not allowed for this payment type');
  }
}

function calculateStakingFeeAtomic(fiapoAmount: number): number {
  const tier = ENTRY_FEE_TIERS.find((entry) => fiapoAmount <= entry.maxAmount) ?? ENTRY_FEE_TIERS[0];
  const feeUsdt = fiapoAmount * (tier.feePercent / 100);
  return Math.round(feeUsdt * USDT_DECIMALS);
}

function resolveExpectedSender(input: RawPaymentCreateRequest): string {
  return assertNonEmptyString(input.expectedSender, 'expectedSender');
}

function normalizeSpinPurchase(input: RawPaymentCreateRequest, lunesAccount: string): NormalizedPaymentCreateRequest {
  const packageId = assertNonEmptyString(input.packageId, 'packageId');
  const spinPackage = SPIN_PACKAGES.find((pkg) => pkg.id === packageId);
  if (!spinPackage) {
    throw new InvalidPaymentRequestError('Invalid spin package');
  }

  return {
    lunesAccount,
    paymentType: 'spin_purchase',
    itemAmount: spinPackage.spins,
    expectedAmount: spinPackage.priceUsdt * USDT_DECIMALS,
    expectedSender: typeof input.expectedSender === 'string' && input.expectedSender.trim()
      ? input.expectedSender.trim()
      : undefined,
  };
}

function normalizeNftMint(input: RawPaymentCreateRequest, lunesAccount: string): NormalizedPaymentCreateRequest {
  rejectClientPricedFields(input);

  const tierId = assertPositiveInteger(input.tierId, 'tierId');
  const quantity = assertPositiveInteger(input.quantity, 'quantity');
  const tier = NFT_TIERS.find((candidate) => candidate.id === tierId);

  if (!tier || tier.priceUsdt <= 0) {
    throw new InvalidPaymentRequestError('Invalid paid NFT tier');
  }

  return {
    lunesAccount,
    paymentType: 'nft_mint',
    itemAmount: tier.totalMining * quantity,
    expectedAmount: tier.priceUsdt * quantity * USDT_DECIMALS,
    expectedSender: resolveExpectedSender(input),
  };
}

function normalizeStaking(input: RawPaymentCreateRequest, lunesAccount: string, paymentType: string): NormalizedPaymentCreateRequest {
  rejectClientPricedFields(input);

  const parts = paymentType.startsWith('staking:') ? paymentType.split(':') : [];
  const stakingType = optionalNonEmptyString(input.stakingType) ?? parts[1];
  const paymentMethod = optionalNonEmptyString(input.paymentMethod) ?? parts[2];

  if (!stakingType || !STAKING_POOLS.has(stakingType)) {
    throw new InvalidPaymentRequestError('Invalid staking type');
  }

  if (paymentMethod !== 'usdt') {
    throw new InvalidPaymentRequestError('Only Solana USDT staking payments are supported');
  }

  const fiapoAmount = assertPositiveFiniteNumber(input.fiapoAmount, 'fiapoAmount');

  return {
    lunesAccount,
    paymentType: `staking:${stakingType}:${paymentMethod}` as PaymentType,
    itemAmount: fiapoAmount,
    expectedAmount: calculateStakingFeeAtomic(fiapoAmount),
    expectedSender: resolveExpectedSender(input),
  };
}

export function normalizePaymentCreateRequest(input: RawPaymentCreateRequest): NormalizedPaymentCreateRequest {
  const lunesAccount = assertNonEmptyString(input.lunesAccount, 'lunesAccount');
  const paymentType = assertNonEmptyString(input.paymentType, 'paymentType');

  if (paymentType === 'spin_purchase') {
    return normalizeSpinPurchase(input, lunesAccount);
  }

  if (paymentType === 'nft_mint') {
    return normalizeNftMint(input, lunesAccount);
  }

  if (paymentType === 'staking' || paymentType.startsWith('staking:')) {
    return normalizeStaking(input, lunesAccount, paymentType);
  }

  throw new InvalidPaymentRequestError(`Unsupported payment type: ${paymentType}`);
}
