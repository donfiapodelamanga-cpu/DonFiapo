export type OraclePaymentStatus = "pending" | "expired" | "completed";
export type StakingPaymentStatus = "pending" | "confirming" | "confirmed" | "failed";

export interface OraclePaymentCreatePayload {
  lunesAccount: string;
  paymentType: string;
  itemAmount?: number;
  expectedAmount?: number;
  expectedSender?: string;
  stakingType?: string;
  paymentMethod?: "usdt";
  fiapoAmount?: number;
  tierId?: number;
  quantity?: number;
}

export interface OraclePaymentStatusResponse {
  status?: string;
  isExpired?: boolean;
}

const ORACLE_PROXY_BASE = "/api/oracle";

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

export function oraclePaymentCreatePath(): string {
  return `${ORACLE_PROXY_BASE}/api/payment/create`;
}

export function oraclePaymentVerifyPath(): string {
  return `${ORACLE_PROXY_BASE}/api/payment/verify`;
}

export function oraclePaymentStatusPath(paymentId: string): string {
  return `${ORACLE_PROXY_BASE}/api/payment/${encodePathSegment(paymentId)}`;
}

export function oracleUsdToAtomic(usdAmount: number): number {
  if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
    throw new Error("Amount must be a positive finite number");
  }

  return Math.round(usdAmount * 1_000_000);
}

export function buildOracleStakingPaymentCreatePayload(input: {
  lunesAccount: string;
  stakingType: string;
  paymentMethod: "usdt";
  fiapoAmount: number;
  expectedSender?: string | null;
}): OraclePaymentCreatePayload {
  const payload: OraclePaymentCreatePayload = {
    lunesAccount: input.lunesAccount,
    paymentType: "staking",
    stakingType: input.stakingType,
    paymentMethod: input.paymentMethod,
    fiapoAmount: input.fiapoAmount,
  };

  if (input.expectedSender?.trim()) {
    payload.expectedSender = input.expectedSender.trim();
  }

  return payload;
}

export function buildOracleNftMintPaymentCreatePayload(input: {
  lunesAccount: string;
  tierId: number;
  quantity: number;
  expectedSender?: string | null;
}): OraclePaymentCreatePayload {
  const payload: OraclePaymentCreatePayload = {
    lunesAccount: input.lunesAccount,
    paymentType: "nft_mint",
    tierId: input.tierId,
    quantity: input.quantity,
  };

  if (input.expectedSender?.trim()) {
    payload.expectedSender = input.expectedSender.trim();
  }

  return payload;
}

export function toStakingPaymentStatus(payment: OraclePaymentStatusResponse): StakingPaymentStatus {
  if (payment.isExpired || payment.status === "expired") return "failed";
  if (payment.status === "completed") return "confirmed";
  if (payment.status === "pending") return "pending";
  return "pending";
}
