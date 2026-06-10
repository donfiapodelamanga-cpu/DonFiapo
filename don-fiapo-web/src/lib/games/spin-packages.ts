export const SPIN_PACKAGES = [
  { id: "spin-1", spins: 1, priceUsdt: 1 },
  { id: "spin-10", spins: 10, priceUsdt: 9 },
  { id: "spin-50", spins: 50, priceUsdt: 40 },
  { id: "spin-100", spins: 100, priceUsdt: 75 },
  { id: "spin-500", spins: 500, priceUsdt: 300 },
] as const;

export type SpinPackage = (typeof SPIN_PACKAGES)[number];

export class InvalidSpinPackageError extends Error {
  constructor(packageId: unknown) {
    super(`Invalid spin package: ${String(packageId)}`);
    this.name = "InvalidSpinPackageError";
  }
}

export function getSpinPackage(packageId: unknown): SpinPackage {
  if (typeof packageId !== "string") {
    throw new InvalidSpinPackageError(packageId);
  }

  const spinPackage = SPIN_PACKAGES.find((pkg) => pkg.id === packageId);
  if (!spinPackage) {
    throw new InvalidSpinPackageError(packageId);
  }

  return spinPackage;
}

export function rejectClientPricedSpinPurchase(body: Record<string, unknown>) {
  const clientControlledFields = ["spins", "price", "priceUsdt", "payToAddress"];
  const suppliedFields = clientControlledFields.filter((field) => Object.prototype.hasOwnProperty.call(body, field));

  if (suppliedFields.length > 0) {
    throw new Error(`Client-priced spin purchases are not allowed: ${suppliedFields.join(", ")}`);
  }
}
