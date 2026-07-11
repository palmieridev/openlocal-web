import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIContext } from "astro";
import { forward, json, readBody } from "./bff";
import { ApiError, apiFetch } from "./client";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);

function ctx(auth: { userId?: string | null; token?: string | null }): APIContext {
  return {
    locals: {
      auth: () => ({
        userId: auth.userId ?? null,
        getToken: () => Promise.resolve(auth.token ?? null),
      }),
    },
  } as unknown as APIContext;
}

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe("json", () => {
  it("builds a JSON response with status", async () => {
    const res = json({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toBe("application/json");
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});

describe("forward", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await forward(ctx({ userId: null }), "/api/v1/products");
    expect(res.status).toBe(401);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("rejects when Clerk yields no token", async () => {
    const res = await forward(ctx({ userId: "u1", token: null }), "/api/v1/products");
    expect(res.status).toBe(401);
  });

  it("forwards with the Clerk token and returns API data", async () => {
    apiFetchMock.mockResolvedValue({ id: "p1" });
    const res = await forward(ctx({ userId: "u1", token: "tok" }), "/api/v1/products");
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/v1/products",
      expect.objectContaining({ token: "tok" }),
    );
    await expect(res.json()).resolves.toEqual({ id: "p1" });
  });

  it("returns { ok: true } for empty API responses (204)", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    const res = await forward(ctx({ userId: "u1", token: "tok" }), "/x");
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("relays ApiError status and body", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(409, "API 409 on /x", { error: "dup" }));
    const res = await forward(ctx({ userId: "u1", token: "tok" }), "/x");
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "dup" });
  });

  it("maps network failures to 502", async () => {
    apiFetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await forward(ctx({ userId: "u1", token: "tok" }), "/x");
    expect(res.status).toBe(502);
  });
});

describe("readBody", () => {
  it("re-serializes the JSON body", async () => {
    const request = new Request("http://test/", { method: "POST", body: '{"a":1}' });
    await expect(readBody(request)).resolves.toBe('{"a":1}');
  });

  it("falls back to {} for invalid JSON", async () => {
    const request = new Request("http://test/", { method: "POST", body: "nope" });
    await expect(readBody(request)).resolves.toBe("{}");
  });
});
