export const FREE_SPINS = 3;

type SpinDbClient = {
  spinResult: {
    count(args: { where: { userId: string } }): Promise<number>;
  };
  spinPurchase: {
    aggregate(args: {
      where: { userId: string; status: "CONFIRMED" };
      _sum: { spins: true };
    }): Promise<{ _sum: { spins: number | null } }>;
  };
};

export class NoSpinBalanceError extends Error {
  constructor(public readonly spinBalance: number) {
    super("No spins available");
    this.name = "NoSpinBalanceError";
  }
}

export function calculateSpinBalance({
  freeSpins = FREE_SPINS,
  purchasedSpins,
  usedSpins,
}: {
  freeSpins?: number;
  purchasedSpins: number | null | undefined;
  usedSpins: number | null | undefined;
}) {
  return Math.max(0, freeSpins + (purchasedSpins ?? 0) - (usedSpins ?? 0));
}

export async function getSpinBalanceForUser(db: SpinDbClient, userId: string) {
  const [totalSpins, purchasedSpins] = await Promise.all([
    db.spinResult.count({ where: { userId } }),
    db.spinPurchase
      .aggregate({
        where: { userId, status: "CONFIRMED" },
        _sum: { spins: true },
      })
      .then((result) => result._sum.spins ?? 0),
  ]);

  return {
    freeSpins: FREE_SPINS,
    purchasedSpins,
    totalSpins,
    spinBalance: calculateSpinBalance({ purchasedSpins, usedSpins: totalSpins }),
  };
}

export async function ensureSpinBalanceForUser(db: SpinDbClient, userId: string) {
  const balance = await getSpinBalanceForUser(db, userId);

  if (balance.spinBalance <= 0) {
    throw new NoSpinBalanceError(balance.spinBalance);
  }

  return balance;
}
