import { afterEach, describe, expect, it, vi } from "vitest";
import { readAdmin } from "./admin";
import { adminHref } from "@/lib/admin";

afterEach(() => vi.unstubAllGlobals());

function context(userId: string | null = "user_platform", token: string | null = "session-token") {
  const getToken = vi.fn(async () => token);
  return {
    locals: { auth: () => ({ userId, orgId: null, getToken }) } as unknown as App.Locals,
    response: { status: 200, headers: new Headers() },
    getToken,
    // A poisoned/stale active-business cookie must have no effect on admin reads.
    cookies: { get: () => { throw new Error("Admin must not resolve a business cookie"); } },
  };
}

describe("private admin reads", () => {
  it("uses a signed-in session without an active org and sends only the admin search request", async () => {
    const page = { items: [], next_cursor: null, limit: 25 };
    const fetch = vi.fn(async () => Response.json(page));
    vi.stubGlobal("fetch", fetch);
    const ctx = context();
    const result = await readAdmin(ctx, (api) => api.businesses({ q: "Bakery & café", cursor: "opaque+cursor" }));
    expect(result).toEqual({ data: page, error: null });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/v1/admin/businesses");
    expect(parsed.searchParams.get("q")).toBe("Bakery & café");
    expect(parsed.searchParams.get("cursor")).toBe("opaque+cursor");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer session-token");
    expect(init.cache).toBe("no-store");
    expect(ctx.response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each([[null, "token"], ["user_platform", null]])("rejects missing identity/token without an API call", async (userId, token) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const ctx = context(userId, token);
    expect(await readAdmin(ctx, (api) => api.businesses({}))).toEqual({ data: null, error: "signedOut" });
    expect(ctx.response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [400, "invalid"], [401, "signedOut"], [403, "forbidden"], [404, "notFound"],
    [429, "rateLimited"], [500, "unavailable"], [503, "unavailable"],
  ] as const)("preserves safe failure semantics for API %s", async (status, error) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "private internal detail" }, { status })));
    const ctx = context();
    const result = await readAdmin(ctx, (api) => api.business("business-id"));
    expect(result).toEqual({ data: null, error });
    expect(ctx.response.status).toBe(status >= 500 ? 503 : status);
    expect(JSON.stringify(result)).not.toContain("private internal detail");
    expect(ctx.response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(ctx.response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(ctx.response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("fails closed when the backend cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network failure"); }));
    const ctx = context();
    expect(await readAdmin(ctx, (api) => api.activity({}))).toEqual({ data: null, error: "unavailable" });
    expect(ctx.response.status).toBe(503);
  });
});

describe("admin navigation", () => {
  it("preserves locale, filters and opaque cursors without interpreting their contents as navigation", () => {
    const url = new URL(adminHref("en", "/admin/activity", {
      business_id: "business", action: "grant.created&actor_user_id=other", cursor: "opaque+/=", unused: "",
    }), "https://openlocal.store");
    expect(url.pathname).toBe("/en/admin/activity");
    expect([...url.searchParams.keys()]).toEqual(["business_id", "action", "cursor"]);
    expect(url.searchParams.get("action")).toBe("grant.created&actor_user_id=other");
    expect(url.searchParams.get("cursor")).toBe("opaque+/=");
  });
});
