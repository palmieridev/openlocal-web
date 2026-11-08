import type { APIContext } from "astro";
import { afterEach, describe, expect, it, vi } from "vitest";
import { relayAdmin } from "./admin-relay";
const business = "11111111-1111-4111-8111-111111111111",
  grant = "22222222-2222-4222-8222-222222222222";
const input = {
  module: "appointments",
  tier: "business",
  starts_at: "2026-11-10T00:00:00Z",
  indefinite: true,
  internal_reason: "Private assistance",
};
function context(
  options: {
    path?: string;
    method?: string;
    body?: unknown;
    user?: string | null;
    token?: string | null;
    origin?: string;
    query?: string;
    contentType?: string;
  } = {},
) {
  const method = options.method ?? "POST";
  const url = new URL(
    "https://openlocal.test/api/admin/" +
      (options.path ?? `businesses/${business}/grants`) +
      (options.query ?? ""),
  );
  return {
    url,
    params: { path: options.path ?? `businesses/${business}/grants` },
    request: new Request(url, {
      method,
      headers: {
        Origin: options.origin ?? url.origin,
        "Content-Type": options.contentType ?? "application/json",
        "X-OL-Locale": "en",
      },
      ...(method === "GET"
        ? {}
        : { body: JSON.stringify(options.body ?? input) }),
    }),
    locals: {
      auth: () => ({
        userId: options.user === undefined ? "user_admin" : options.user,
        orgId: null,
        orgRole: "org:admin",
        getToken: async () =>
          options.token === undefined ? "verified-session" : options.token,
      }),
    },
    cookies: {
      get: () => {
        throw new Error("must not read business cookies");
      },
    },
  } as unknown as APIContext;
}
afterEach(() => vi.unstubAllGlobals());
describe("private grant BFF", () => {
  it("forwards a verified session without org/cookie and preserves 201", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ id: grant, business_id: business }, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await relayAdmin(context());
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).pathname).toBe(
      `/api/v1/admin/businesses/${business}/grants`,
    );
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer verified-session",
    );
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
  });
  it.each([{ user: null }, { token: null }])(
    "rejects missing sessions before calling Go",
    async (options) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      expect((await relayAdmin(context(options))).status).toBe(401);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("handles expired Clerk token retrieval", async () => {
    const ctx = context();
    ctx.locals.auth = (() => {
      throw new Error("expired");
    }) as App.Locals["auth"];
    expect((await relayAdmin(ctx)).status).toBe(401);
  });
  it.each([401, 403, 404, 409, 429, 500, 503])(
    "preserves upstream %s without leaking raw private errors or success",
    async (status) => {
      const fetch = vi.fn(async () =>
        Response.json(
          { error: "SQL private reason leaked", code: "internal" },
          { status },
        ),
      );
      vi.stubGlobal("fetch", fetch);
      const response = await relayAdmin(
        context({
          path: `businesses/${business}/grants/${grant}/revoke`,
          body: { version: 1, internal_reason: "End access" },
        }),
      );
      expect(response.status).toBe(status);
      expect(await response.text()).not.toContain("SQL");
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );
  it("does not treat organization admin roles as authorization", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ code: "platform_admin_required" }, { status: 403 }),
    );
    vi.stubGlobal("fetch", fetch);
    expect((await relayAdmin(context())).status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps both business and grant IDs for authoritative cross-business denial", async () => {
    const other = "33333333-3333-4333-8333-333333333333";
    const fetch = vi.fn(async () => Response.json({}, { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await relayAdmin(
          context({
            path: `businesses/${other}/grants/${grant}/extend`,
            body: { version: 3, indefinite: true, internal_reason: "Extend" },
          }),
        )
      ).status,
    ).toBe(404);
    expect(String((fetch.mock.calls[0] as unknown as [string])[0])).toContain(
      `/businesses/${other}/grants/${grant}/extend`,
    );
  });
  it.each([
    { origin: "https://attacker.test" },
    { body: { ...input, unexpected: true } },
    { body: [] },
    { body: { ...input, internal_reason: " " } },
    { contentType: "text/plain" },
    {
      path: `businesses/${business}/grants/${grant}/revoke`,
      body: { version: 0, internal_reason: "Reason" },
    },
    { path: `businesses/${business}/grants/${grant}/edit` },
    { path: `businesses/00000000-0000-0000-0000-000000000000/grants` },
  ])(
    "rejects unsafe paths, CSRF and invalid payloads before forwarding %j",
    async (options) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      expect(
        (await relayAdmin(context(options))).status,
      ).toBeGreaterThanOrEqual(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("rejects malformed JSON and cross-site fetch metadata", async () => {
    for (const malformed of [true, false]) {
      const ctx = context();
      ctx.request = malformed
        ? new Request(ctx.url, {
            method: "POST",
            headers: {
              Origin: ctx.url.origin,
              "Content-Type": "application/json",
            },
            body: "{",
          })
        : new Request(ctx.request, {
            headers: {
              Origin: ctx.url.origin,
              "Content-Type": "application/json",
              "Sec-Fetch-Site": "cross-site",
            },
          });
      expect((await relayAdmin(ctx)).status).toBe(malformed ? 400 : 403);
    }
  });
  it("uses offset pagination for history and rejects unknown query keys", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ items: [], limit: 10, offset: 20 }),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await relayAdmin(
      context({
        method: "GET",
        path: `businesses/${business}/grants/${grant}/history`,
        query: "?limit=10&offset=20",
      }),
    );
    expect(response.status).toBe(200);
    expect(String((fetch.mock.calls[0] as unknown as [string])[0])).toContain(
      "?limit=10&offset=20",
    );
    expect(
      (
        await relayAdmin(
          context({ method: "GET", query: "?business_id=another" }),
        )
      ).status,
    ).toBe(400);
  });
  it("returns an outage error when mutation outcome is unknown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection lost");
      }),
    );
    expect((await relayAdmin(context())).status).toBe(502);
  });
});
