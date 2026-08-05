import { afterEach, describe, expect, it, vi } from "vitest";
import type { AstroCookies } from "astro";
import { setBusinessCookie, BUSINESS_COOKIE, getServerAuth } from "./server";
import { ApiError } from "./client";

/** Minimal AstroCookies stub capturing the last set() options. */
function cookieSpy() {
  const set = vi.fn();
  return { cookies: { set } as unknown as AstroCookies, set };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Auth context stub: a stored cookie value plus a signed-in Clerk session. */
function authCtx(storedBusinessId: string | null) {
  const set = vi.fn();
  const del = vi.fn();
  return {
    ctx: {
      locals: {
        auth: () => ({ userId: "user_1", orgId: "org_1", getToken: async () => "tok" }),
      },
      cookies: {
        get: () => (storedBusinessId ? { value: storedBusinessId } : undefined),
        set,
        delete: del,
      },
    } as never,
    set,
    del,
  };
}

describe("setBusinessCookie", () => {
  it("stores the id under BUSINESS_COOKIE, httpOnly + lax", () => {
    const { cookies, set } = cookieSpy();
    setBusinessCookie(cookies, "biz1");
    expect(set).toHaveBeenCalledWith(
      BUSINESS_COOKIE,
      "biz1",
      expect.objectContaining({ path: "/", httpOnly: true, sameSite: "lax" }),
    );
  });

  it("sets Secure in a prod build", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("OL_INSECURE_COOKIES", "");
    const { cookies, set } = cookieSpy();
    setBusinessCookie(cookies, "biz1");
    expect(set.mock.calls[0][2]).toMatchObject({ secure: true });
  });

  it("drops Secure when OL_INSECURE_COOKIES=1 (http dev env)", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("OL_INSECURE_COOKIES", "1");
    const { cookies, set } = cookieSpy();
    setBusinessCookie(cookies, "biz1");
    expect(set.mock.calls[0][2]).toMatchObject({ secure: false });
  });

  it("never sets Secure outside a prod build", () => {
    vi.stubEnv("PROD", false);
    const { cookies, set } = cookieSpy();
    setBusinessCookie(cookies, "biz1");
    expect(set.mock.calls[0][2]).toMatchObject({ secure: false });
  });
});

describe("getServerAuth — resolving the active business", () => {
  /** Fake the API: map "METHOD path" prefixes to a status + body. */
  function mockApi(handler: (path: string) => { ok: boolean; status?: number; body?: unknown }) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const { ok, status = ok ? 200 : 403, body = {} } = handler(String(url));
        return {
          ok,
          status,
          json: async () => body,
        } as unknown as Response;
      }),
    );
  }

  it("keeps a stored id that still resolves, without re-resolving", async () => {
    mockApi(() => ({ ok: true, body: { id: "biz-1" } }));
    const { ctx, set } = authCtx("biz-1");
    const auth = await getServerAuth(ctx);
    expect(auth.businessId).toBe("biz-1");
    expect(set).not.toHaveBeenCalled();
  });

  it("resolves via /businesses/me when no id is stored", async () => {
    mockApi(() => ({ ok: true, body: { id: "biz-2" } }));
    const { ctx, set } = authCtx(null);
    const auth = await getServerAuth(ctx);
    expect(auth.businessId).toBe("biz-2");
    expect(set).toHaveBeenCalledWith(BUSINESS_COOKIE, "biz-2", expect.anything());
  });

  // Regression: the API answers 403 (never 404) for an unknown or inaccessible
  // business, so a stale cookie used to strand the owner area on its error
  // state forever. A failing stored id must be re-resolved.
  it("re-resolves a stale stored id that the API rejects with 403", async () => {
    mockApi((url) =>
      url.includes("/businesses/me")
        ? { ok: true, body: { id: "biz-current" } }
        : { ok: false, status: 403, body: { error: "forbidden" } },
    );
    const { ctx, set } = authCtx("biz-stale");
    const auth = await getServerAuth(ctx);
    expect(auth.businessId).toBe("biz-current");
    expect(set).toHaveBeenCalledWith(BUSINESS_COOKIE, "biz-current", expect.anything());
  });

  it("keeps the stored id when re-resolution also fails (transient outage)", async () => {
    mockApi(() => ({ ok: false, status: 403 }));
    const { ctx } = authCtx("biz-stale");
    const auth = await getServerAuth(ctx);
    // Better a retry next request than cutting the owner off over a blip.
    expect(auth.businessId).toBe("biz-stale");
  });

  it("returns no business when none is stored and none can be resolved", async () => {
    mockApi(() => ({ ok: false, status: 404 }));
    const { ctx } = authCtx(null);
    const auth = await getServerAuth(ctx);
    expect(auth.businessId).toBeNull();
  });
});
