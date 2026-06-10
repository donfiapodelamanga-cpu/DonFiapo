export interface PayoutWalletRecord {
  address: string;
  network: string;
  isPrimary?: boolean | null;
}

export function selectPayoutWallet(wallets: PayoutWalletRecord[], network: string): string | null {
  const normalizedNetwork = network.trim().toUpperCase();
  const matchingWallets = wallets.filter((wallet) => wallet.network.trim().toUpperCase() === normalizedNetwork);

  if (matchingWallets.length === 0) return null;

  const primaryWallet = matchingWallets.find((wallet) => wallet.isPrimary);
  return primaryWallet?.address ?? matchingWallets[0].address;
}
