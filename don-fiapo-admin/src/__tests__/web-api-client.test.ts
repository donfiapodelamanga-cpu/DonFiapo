import {
  WebApiConfigError,
  buildWebApiUrl,
  createWebApiHeaders,
  resolveWebApiBaseUrl,
} from "../lib/server/web-api";

describe("admin web API integration config", () => {
  it("uses the production public web API when WEB_API_URL is not configured", () => {
    expect(resolveWebApiBaseUrl({ nodeEnv: "production" })).toBe("https://donfiapo.fun");
  });

  it("keeps localhost as the development fallback", () => {
    expect(resolveWebApiBaseUrl({ nodeEnv: "development" })).toBe("http://localhost:3000");
  });

  it("normalizes configured base URLs and joins API paths", () => {
    const url = buildWebApiUrl("/api/admin/spin/stats?status=ACTIVE", {
      webApiUrl: "https://donfiapo.fun/",
      nodeEnv: "production",
    });

    expect(url).toBe("https://donfiapo.fun/api/admin/spin/stats?status=ACTIVE");
  });

  it("adds x-admin-key for protected admin proxy calls", () => {
    const headers = createWebApiHeaders({
      adminApiKey: "admin-secret",
      nodeEnv: "production",
      headers: { "Content-Type": "application/json" },
    });

    expect(headers.get("x-admin-key")).toBe("admin-secret");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("fails fast when protected admin proxy calls have no production ADMIN_API_KEY", () => {
    expect(() => createWebApiHeaders({ nodeEnv: "production" })).toThrow(WebApiConfigError);
  });
});
