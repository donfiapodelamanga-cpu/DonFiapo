import { NextResponse } from "next/server";
import { POST as postExpense } from "../app/api/finance/expenses/route";
import { POST as postRevenue } from "../app/api/finance/revenues/route";
import { POST as postTransaction } from "../app/api/finance/transactions/route";
import prisma from "../lib/prisma";
import { requireAdminAuth } from "../lib/server/admin-auth";

// Auditoria 2026-06-18 — crítico #4: rotas financeiras mutáveis exigem RBAC "finance".
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    expense: { create: jest.fn() },
    revenue: { create: jest.fn() },
    transaction: { create: jest.fn() },
  },
}));

jest.mock("../lib/server/admin-auth", () => ({
  requireAdminAuth: jest.fn(),
}));

const mockedAuth = requireAdminAuth as jest.Mock;
const mockedPrisma = prisma as unknown as {
  expense: { create: jest.Mock };
  revenue: { create: jest.Mock };
  transaction: { create: jest.Mock };
};

function deny(status = 403) {
  mockedAuth.mockReturnValue({
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status }),
  });
}

function allowFinance() {
  mockedAuth.mockReturnValue({
    ok: true,
    session: { email: "finance@donfiapo.fun", role: "finance", permissions: ["finance"], iat: 1, exp: 9999999999 },
  });
}

const request = (body: unknown = {}) => ({ json: async () => body, url: "https://admin.donfiapo.fun/x" } as any);

describe("finance route RBAC", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks expense creation without finance permission", async () => {
    deny(403);
    const res = await postExpense(request({ description: "x", amount: 1 }));
    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "finance");
    expect(mockedPrisma.expense.create).not.toHaveBeenCalled();
  });

  it("blocks revenue creation without finance permission", async () => {
    deny(403);
    const res = await postRevenue(request({ amount: 1 }));
    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "finance");
    expect(mockedPrisma.revenue.create).not.toHaveBeenCalled();
  });

  it("blocks transaction creation without finance permission", async () => {
    deny(403);
    const res = await postTransaction(request({ amount: 1 }));
    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "finance");
    expect(mockedPrisma.transaction.create).not.toHaveBeenCalled();
  });

  it("allows transaction creation with finance permission", async () => {
    allowFinance();
    mockedPrisma.transaction.create.mockResolvedValue({ id: "t1" });
    const res = await postTransaction(request({ type: "deposit", amount: 5, walletId: "w1", description: "d" }));
    expect(res.status).toBe(200);
    expect(mockedPrisma.transaction.create).toHaveBeenCalled();
  });
});
