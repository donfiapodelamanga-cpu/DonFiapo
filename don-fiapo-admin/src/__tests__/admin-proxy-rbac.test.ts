import { NextResponse } from "next/server";
import { PATCH as patchAirdropClaims } from "../app/api/admin/airdrop/claims/route";
import { POST as postMigrationVerify } from "../app/api/admin/migrations/route";
import { POST as postMissionMilestones } from "../app/api/admin/missions/milestones/route";
import { POST as postReferralFraud } from "../app/api/admin/referrals/fraud/route";
import { requireAdminAuth } from "../lib/server/admin-auth";
import { fetchWebApi } from "../lib/server/web-api";

jest.mock("../lib/server/admin-auth", () => ({
  requireAdminAuth: jest.fn(),
}));

jest.mock("../lib/server/web-api", () => ({
  fetchWebApi: jest.fn(),
  webApiProxyErrorMessage: jest.fn(() => "proxy failed"),
  webApiProxyErrorStatus: jest.fn(() => 502),
}));

const mockedAuth = requireAdminAuth as jest.Mock;
const mockedFetchWebApi = fetchWebApi as jest.Mock;

function request(body: unknown = {}) {
  return {
    json: async () => body,
    nextUrl: { searchParams: new URLSearchParams() },
    url: "https://admin.donfiapo.fun/test",
  } as any;
}

function deny(status = 403) {
  mockedAuth.mockReturnValue({
    ok: false,
    response: NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status }),
  });
}

function allow(permission: string) {
  mockedAuth.mockReturnValue({
    ok: true,
    session: {
      email: "admin@donfiapo.fun",
      role: "admin_geral",
      permissions: [permission],
      iat: 1,
      exp: 9999999999,
    },
  });
  mockedFetchWebApi.mockResolvedValue({
    status: 200,
    json: async () => ({ ok: true }),
  });
}

describe("admin web API proxy RBAC", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks airdrop claim mutation before proxying without transactions permission", async () => {
    deny(403);

    const res = await patchAirdropClaims(request({ id: "claim-1" }));

    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "transactions");
    expect(fetchWebApi).not.toHaveBeenCalled();
  });

  it("blocks migration verification before proxying without transactions permission", async () => {
    deny(403);

    const res = await postMigrationVerify(request({ id: "migration-1", action: "approve" }));

    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "transactions");
    expect(fetchWebApi).not.toHaveBeenCalled();
  });

  it("blocks milestone mutation before proxying without marketing permission", async () => {
    deny(403);

    const res = await postMissionMilestones(request({ tier: 10 }));

    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "marketing");
    expect(fetchWebApi).not.toHaveBeenCalled();
  });

  it("blocks referral fraud mutation before proxying without marketing permission", async () => {
    deny(403);

    const res = await postReferralFraud(request({ referralId: "ref-1", action: "reject" }));

    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "marketing");
    expect(fetchWebApi).not.toHaveBeenCalled();
  });

  it("proxies authorized migration verification with protected web API headers", async () => {
    allow("transactions");

    const res = await postMigrationVerify(request({ id: "migration-1", action: "approve" }));

    expect(res.status).toBe(200);
    expect(fetchWebApi).toHaveBeenCalledWith(
      "/api/admin/migrations/verify",
      expect.objectContaining({ method: "POST" })
    );
  });
});
