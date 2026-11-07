import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "@/lib/api/client";
import { POST } from "./active";

vi.mock("@/lib/api/client", async (original) => ({
  ...await original<typeof import("@/lib/api/client")>(),
  apiFetch: vi.fn(),
}));

function context(userId: string | null = "user_1", orgId: string | null = "org_new", organization: unknown = "org_new") {
  const set = vi.fn();
  return {
    set,
    ctx: {
      request: new Request("http://localhost/api/businesses/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization, business_id: "untrusted-id" }),
      }),
      locals: { auth: () => ({ userId, orgId, getToken: async () => "fresh-token" }) },
      cookies: { set },
    } as unknown as APIContext,
  };
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

describe("POST /api/businesses/active", () => {
  it("resolves the business from the active token and replaces the previous cookie", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ id: "business-new" });
    const { ctx, set } = context();
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "business-new" });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/businesses/me", { token: "fresh-token" });
    expect(set).toHaveBeenCalledWith("ol_bid", "business-new", expect.objectContaining({ httpOnly: true }));
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each([null, "org_previous"])("refuses stale or missing org claims (%s) before changing business", async (orgId) => {
    const { ctx, set } = context("user_1", orgId);
    expect((await POST(ctx)).status).toBe(409);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it("requires a signed-in session", async () => {
    const { ctx, set } = context(null);
    expect((await POST(ctx)).status).toBe(401);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it.each([null, {}, "https://example.com"])("rejects invalid organization input (%s)", async (organization) => {
    const { ctx } = context("user_1", "org_new", organization);
    expect((await POST(ctx)).status).toBe(400);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("preserves the cookie if the selected organization has no accessible business", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(404, "not found"));
    const { ctx, set } = context();
    expect((await POST(ctx)).status).toBe(404);
    expect(set).not.toHaveBeenCalled();
  });
});
