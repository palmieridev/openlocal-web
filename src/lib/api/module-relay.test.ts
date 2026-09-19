import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIContext } from "astro";
import { relayModule, managementCookie } from "./module-relay";
import { getServerAuth } from "./server";
vi.mock("./server", () => ({ getServerAuth: vi.fn() }));
const fetchMock = vi.fn();
function context(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const url = new URL(`http://localhost:4321/api/modules/${path}`);
  return {
    params: { path },
    url,
    request: new Request(url, {
      method,
      headers: {
        Origin: url.origin,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    cookies: { get: vi.fn(), set: vi.fn() },
    locals: {},
  } as unknown as APIContext;
}
describe("module BFF", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(getServerAuth).mockResolvedValue({
      userId: "owner",
      orgId: "org",
      businessId: "shop",
      token: "owner-secret",
    });
  });
  it("never forwards browser credentials to public routes", async () => {
    fetchMock.mockResolvedValue(
      new Response("[]", { headers: { "Content-Type": "application/json" } }),
    );
    const ctx = context(
      "public/businesses/shop/appointments/services",
      "GET",
      undefined,
      {
        Authorization: "Bearer attacker",
        "X-Openlocal-Management-Token": "unrelated",
      },
    );
    const response = await relayModule(ctx);
    expect(response.status).toBe(200);
    const outgoing = fetchMock.mock.calls[0][1].headers as Headers;
    expect(outgoing.has("Authorization")).toBe(false);
    expect(outgoing.has("X-Openlocal-Management-Token")).toBe(false);
    expect(getServerAuth).not.toHaveBeenCalled();
  });
  it("resolves owner business server-side", async () => {
    fetchMock.mockResolvedValue(new Response('{"items":[]}'));
    await relayModule(context("owner/appointments"));
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/businesses/shop/appointments",
    );
    expect(
      (fetchMock.mock.calls[0][1].headers as Headers).get("Authorization"),
    ).toBe("Bearer owner-secret");
  });
  it("requires an authenticated owner", async () => {
    vi.mocked(getServerAuth).mockResolvedValue({
      userId: null,
      orgId: null,
      businessId: null,
      token: null,
    });
    expect((await relayModule(context("owner/appointments"))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests before authentication or upstream writes", async () => {
    expect(
      (
        await relayModule(
          context(
            "owner/appointments",
            "POST",
            {},
            { Origin: "https://other.example" },
          ),
        )
      ).status,
    ).toBe(403);
    expect(getServerAuth).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("preserves creation semantics while placing management secrets in a scoped cookie", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          public_id: "request-123",
          reference: "OL-1",
          management_token: "a".repeat(43),
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Replayed": "true",
          },
        },
      ),
    );
    const ctx = context(
      "public/businesses/shop/preorders",
      "POST",
      { locale: "en" },
      { "Idempotency-Key": "test-retry-key" },
    );
    const response = await relayModule(ctx);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(response.headers.get("Idempotency-Replayed")).toBe("true");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(body.management_token).toBeUndefined();
    expect(body.management_url).toMatch(/^\/en\/requests\/request-123#access=/);
    expect(ctx.cookies.set).toHaveBeenCalledWith(
      managementCookie("request-123"),
      "a".repeat(43),
      expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
    );
    expect(
      (fetchMock.mock.calls[0][1].headers as Headers).get("Idempotency-Key"),
    ).toBe("test-retry-key");
  });
  it("validates a recovery token before installing the cookie", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"code":"not_found"}', { status: 404 }),
    );
    const ctx = context("requests/request-123/access", "POST", {
      token: "b".repeat(43),
    });
    expect((await relayModule(ctx)).status).toBe(404);
    expect(ctx.cookies.set).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });
  it("cannot use another request's cookie", async () => {
    const ctx = context("requests/other");
    vi.mocked(ctx.cookies.get).mockImplementation((name) =>
      name === managementCookie("first")
        ? ({ value: "secret" } as never)
        : undefined,
    );
    expect((await relayModule(ctx)).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("only issues a recovery link after revalidating the request cookie", async () => {
    const ctx = context("requests/request-123/recovery", "POST", {});
    vi.mocked(ctx.cookies.get).mockReturnValue({ value: "private-access" } as never);
    fetchMock.mockResolvedValueOnce(new Response('{"public_id":"request-123"}', {status: 200}));
    const response = await relayModule(ctx);
    expect(await response.json()).toEqual({ access: "private-access", public_id: "request-123" });
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    fetchMock.mockResolvedValueOnce(new Response('{"code":"not_found"}', {status: 404}));
    const denied = await relayModule(contextWithCookie());
    expect(denied.status).toBe(404);
    expect(await denied.text()).not.toContain("private-access");
    function contextWithCookie() { const ctx = context("requests/request-123/recovery", "POST", {}); vi.mocked(ctx.cookies.get).mockReturnValue({value: "private-access"} as never); return ctx; }
  });
  it("preserves typed conflict and throttling responses", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"code":"rate_limited"}', {
        status: 429,
        headers: { "Retry-After": "30", "Content-Type": "application/json" },
      }),
    );
    const response = await relayModule(context("owner/preorders"));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(await response.json()).toEqual({ code: "rate_limited" });
  });
  it("blocks invalid bodies and nonallowlisted route methods", async () => {
    expect(
      (await relayModule(context("owner/appointments", "POST", []))).status,
    ).toBe(400);
    expect(
      (await relayModule(context("owner/preorders/export", "PATCH", {})))
        .status,
    ).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
