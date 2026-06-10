import { seedSystemWalletTemplates } from "../lib/server/seed-system-wallets";
import { SYSTEM_WALLET_TEMPLATES } from "../lib/system-wallets";

describe("seedSystemWalletTemplates", () => {
  it("upserts every system wallet template without overwriting existing addresses/status", async () => {
    const upserts: unknown[] = [];
    const prisma = {
      systemWallet: {
        upsert: jest.fn(async (args) => {
          upserts.push(args);
          return args.create;
        }),
      },
    };

    const result = await seedSystemWalletTemplates(prisma, {
      SOLANA_RECEIVER_WALLET: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    });

    expect(result.total).toBe(SYSTEM_WALLET_TEMPLATES.length);
    expect(result.activeCreated).toBeGreaterThan(0);
    expect(prisma.systemWallet.upsert).toHaveBeenCalledTimes(SYSTEM_WALLET_TEMPLATES.length);

    expect(upserts[0]).toMatchObject({
      where: { key: SYSTEM_WALLET_TEMPLATES[0].key },
      update: {
        label: SYSTEM_WALLET_TEMPLATES[0].label,
        network: SYSTEM_WALLET_TEMPLATES[0].network,
        symbol: SYSTEM_WALLET_TEMPLATES[0].symbol,
        purpose: SYSTEM_WALLET_TEMPLATES[0].purpose,
      },
    });
    expect((upserts[0] as { update: Record<string, unknown> }).update).not.toHaveProperty("address");
    expect((upserts[0] as { update: Record<string, unknown> }).update).not.toHaveProperty("isActive");
  });
});
