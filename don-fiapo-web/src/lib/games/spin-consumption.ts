import { NoSpinBalanceError, getSpinBalanceForUser } from "./spin-balance";

export interface SpinPrizeForConsumption {
  index: number;
  label: string;
  sublabel: string;
  tier: string;
}

type SpinTransactionClient = {
  spinResult: {
    count(args: { where: { userId: string } }): Promise<number>;
    create(args: {
      data: {
        userId: string;
        prizeIndex: number;
        prizeLabel: string;
        prizeSublabel: string;
        tier: string;
      };
    }): Promise<unknown>;
  };
  spinPurchase: {
    aggregate(args: {
      where: { userId: string; status: "CONFIRMED" };
      _sum: { spins: true };
    }): Promise<{ _sum: { spins: number | null } }>;
  };
};

type TransactionRunner = {
  $transaction<T>(fn: (tx: SpinTransactionClient) => Promise<T>): Promise<T>;
};

export async function consumeSpinForPrize(
  db: TransactionRunner,
  userId: string,
  prize: SpinPrizeForConsumption,
) {
  return db.$transaction(async (tx) => {
    const balance = await getSpinBalanceForUser(tx, userId);

    if (balance.spinBalance <= 0) {
      throw new NoSpinBalanceError(balance.spinBalance);
    }

    const spinResult = await tx.spinResult.create({
      data: {
        userId,
        prizeIndex: prize.index,
        prizeLabel: prize.label,
        prizeSublabel: prize.sublabel,
        tier: prize.tier,
      },
    });

    return {
      spinResult,
      spinBalanceBefore: balance.spinBalance,
      spinBalanceAfter: Math.max(0, balance.spinBalance - 1),
    };
  });
}
