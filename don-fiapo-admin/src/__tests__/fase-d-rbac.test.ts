import { NextResponse } from "next/server";
import { PATCH as patchTokenomics } from "../app/api/admin/tokenomics/route";
import { POST as postMission } from "../app/api/admin/missions/route";
import { POST as postCollection } from "../app/api/admin/collections/route";
import prisma from "../lib/prisma";
import { requireAdminAuth } from "../lib/server/admin-auth";
import { fetchWebApi } from "../lib/server/web-api";

// Auditoria 2026-06-18 — altas #7 (tokenomics), #8 (missions), #9 (collections).
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: {
    tokenDistribution: { update: jest.fn() },
    nFTCollection: { create: jest.fn() },
  },
}));
jest.mock("../lib/server/admin-auth", () => ({ requireAdminAuth: jest.fn() }));
jest.mock("../lib/server/web-api", () => ({
  fetchWebApi: jest.fn(),
  webApiProxyErrorMessage: jest.fn(() => "proxy failed"),
  webApiProxyErrorStatus: jest.fn(() => 502),
}));

const mockedAuth = requireAdminAuth as jest.Mock;
const mockedFetch = fetchWebApi as jest.Mock;
const mp = prisma as unknown as { tokenDistribution: { update: jest.Mock }; nFTCollection: { create: jest.Mock } };

const deny = (status = 403) => mockedAuth.mockReturnValue({ ok: false, response: NextResponse.json({ error: "Forbidden" }, { status }) });
const allow = (permission: string) => mockedAuth.mockReturnValue({ ok: true, session: { email: "admin@donfiapo.fun", role: "admin_geral", permissions: [permission], iat: 1, exp: 9999999999 } });
const request = (body: unknown = {}) => ({ json: async () => body, url: "https://admin.donfiapo.fun/x" } as any);

describe("Fase D — RBAC adicional", () => {
  beforeEach(() => jest.clearAllMocks());

  it("#7 bloqueia PATCH tokenomics sem permissão finance", async () => {
    deny(403);
    const res = await patchTokenomics(request({ category: "team", distributed: 999 }));
    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "finance");
    expect(mp.tokenDistribution.update).not.toHaveBeenCalled();
  });

  it("#8 bloqueia POST missions sem permissão marketing", async () => {
    deny(403);
    const res = await postMission(request({ title: "x" }));
    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "marketing");
    expect(fetchWebApi).not.toHaveBeenCalled();
  });

  it("#9 bloqueia POST collections sem permissão collections", async () => {
    deny(403);
    const res = await postCollection(request({ name: "n", symbol: "s", createdBy: "spoof@x" }));
    expect(res.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), "collections");
    expect(mp.nFTCollection.create).not.toHaveBeenCalled();
  });

  it("#9 deriva createdBy da sessão (ignora o do body)", async () => {
    allow("collections");
    mp.nFTCollection.create.mockResolvedValue({ id: "c1" });
    const res = await postCollection(request({ name: "n", symbol: "s", createdBy: "spoof@attacker" }));
    expect(res.status).toBe(201);
    expect(mp.nFTCollection.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ createdBy: "admin@donfiapo.fun" }) })
    );
  });
});
