import { buildSystemWalletSeedRows } from "../system-wallets";

interface SystemWalletUpsertClient {
  systemWallet: {
    upsert(args: {
      where: { key: string };
      update: {
        label: string;
        network: string;
        symbol: string;
        purpose: string;
      };
      create: ReturnType<typeof buildSystemWalletSeedRows>[number];
    }): Promise<unknown>;
  };
}

export async function seedSystemWalletTemplates(
  prisma: SystemWalletUpsertClient,
  env: Record<string, string | undefined> = process.env,
) {
  const rows = buildSystemWalletSeedRows(env);

  for (const wallet of rows) {
    await prisma.systemWallet.upsert({
      where: { key: wallet.key },
      update: {
        label: wallet.label,
        network: wallet.network,
        symbol: wallet.symbol,
        purpose: wallet.purpose,
      },
      create: wallet,
    });
  }

  return {
    total: rows.length,
    activeCreated: rows.filter((row) => row.isActive).length,
  };
}
