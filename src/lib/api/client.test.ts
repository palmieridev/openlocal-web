import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, authedApi, publicApi } from "./client";

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  const { jsonBody, ...rest } = response;
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(jsonBody),
    ...rest,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("returns parsed JSON on 2xx", async () => {
    mockFetch({ jsonBody: { id: "b1" } });
    await expect(apiFetch("/api/v1/businesses/b1")).resolves.toEqual({ id: "b1" });
  });

  it("sends Authorization and Content-Type headers", async () => {
    const fetchMock = mockFetch({ jsonBody: {} });
    await apiFetch("/x", { token: "tok", init: { method: "POST", body: "{}" } });
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws ApiError with status and body on non-2xx", async () => {
    mockFetch({ ok: false, status: 422, jsonBody: { error: "bad" } });
    const err = (await apiFetch("/x").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.body).toEqual({ error: "bad" });
  });

  it("tolerates non-JSON error bodies", async () => {
    mockFetch({ ok: false, status: 502, json: () => Promise.reject(new Error("html")) });
    const err = (await apiFetch("/x").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.body).toBeUndefined();
  });

  it("returns undefined on 204", async () => {
    mockFetch({ status: 204, json: () => Promise.reject(new Error("no body")) });
    await expect(apiFetch("/x")).resolves.toBeUndefined();
  });

  it("drops empty query params", async () => {
    const fetchMock = mockFetch({ jsonBody: [] });
    await apiFetch("/x", { query: { q: "", city: undefined, limit: 5 } });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/x\?limit=5$/);
  });
});

describe("publicApi (error swallowing)", () => {
  it("falls back to [] when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(publicApi.listBusinesses()).resolves.toEqual([]);
    warn.mockRestore();
  });

  it("falls back to null for a missing business (404)", async () => {
    mockFetch({ ok: false, status: 404 });
    await expect(publicApi.getBusiness("nope")).resolves.toBeNull();
  });
});

describe("authedApi", () => {
  it("scopes requests with business_id and clamps limit to 100", async () => {
    const fetchMock = mockFetch({ jsonBody: [] });
    await authedApi("tok", "biz1").listProducts(500);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("business_id=biz1");
    expect(url).toContain("limit=100");
  });

  it("throws instead of swallowing errors", async () => {
    mockFetch({ ok: false, status: 403, jsonBody: { error: "forbidden" } });
    await expect(authedApi("tok", "biz1").listProducts()).rejects.toBeInstanceOf(ApiError);
  });
});
