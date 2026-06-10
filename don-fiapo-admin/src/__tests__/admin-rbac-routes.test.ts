import { NextResponse } from "next/server";
import { GET as getSystemWallets, POST as postSystemWallet } from "../app/api/admin/wallets/route";
import { GET as getFinanceWallets, POST as postFinanceWallet } from "../app/api/finance/wallets/route";
import prisma from "../lib/prisma";
import { requireAdminAuth } from "../lib/server/admin-auth";

jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    systemWallet: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    wallet: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("../lib/server/admin-auth", () => ({
  requireAdminAuth: jest.fn(),
}));

const mockedAuth = requireAdminAuth as jest.Mock;
const mockedPrisma = prisma as unknown as {
  systemWallet: {
    findMany: jest.Mock;
    upsert: jest.Mock;
  };
  wallet: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
};

function deny(status = 403) {
  mockedAuth.mockReturnValue({
    ok: false,
    response: NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status }),
  });
}

function allowFinance(email = "finance@donfiapo.fun") {
  mockedAuth.mockReturnValue({
    ok: true,
    session: {
      email,
      role: "finance",
      permissions: ["finance"],
      iat: 1,
      exp: 9999999999,
    },
  });
}

describe("admin route RBAC", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks system wallet listing without finance permission", async () => {
    deny(403);

    const res = await getSystemWallets({} as any);

    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "finance");
    expect(mockedPrisma.systemWallet.findMany).not.toHaveBeenCalled();
  });

  it("uses the authenticated admin email when saving system wallets", async () => {
    allowFinance("finance@donfiapo.fun");
    mockedPrisma.systemWallet.upsert.mockResolvedValue({ key: "spin_revenue" });

    const res = await postSystemWallet({
      json: async () => ({
        key: "spin_revenue",
        label: "Spin Revenue",
        address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        network: "solana",
        symbol: "USDT",
        isActive: true,
        updatedBy: "attacker@donfiapo.fun",
      }),
    } as any);

    expect(res.status).toBe(200);
    expect(mockedPrisma.systemWallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ updatedBy: "finance@donfiapo.fun" }),
        create: expect.objectContaining({ updatedBy: "finance@donfiapo.fun" }),
      })
    );
  });

  it("blocks finance wallet reads without finance permission", async () => {
    deny(401);

    const res = await getFinanceWallets({} as any);

    expect(res.status).toBe(401);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "finance");
    expect(mockedPrisma.wallet.findMany).not.toHaveBeenCalled();
  });

  it("blocks finance wallet creation without finance permission", async () => {
    deny(403);

    const res = await postFinanceWallet({ json: async () => ({}) } as any);

    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "finance");
    expect(mockedPrisma.wallet.create).not.toHaveBeenCalled();
  });
});
