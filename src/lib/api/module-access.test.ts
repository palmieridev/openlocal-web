import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIContext } from "astro";
import { getServerAuth } from "./server";
import { moduleApi } from "./modules";
import { redirectUnsubscribedModule } from "./module-access";

vi.mock("./server", () => ({ getServerAuth: vi.fn() }));
vi.mock("./modules", () => ({ moduleApi: vi.fn() }));

const entitlements = vi.fn();
function context(locale: "es" | "en" = "es") {
  return {
    locals: { locale },
    cookies: {},
    redirect: vi.fn((url: string, status: number) =>
      new Response(null, { status, headers: { Location: url } }),
    ),
  } as unknown as APIContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  entitlements.mockReset();
  vi.mocked(getServerAuth).mockResolvedValue({
    userId: "user", orgId: "org", token: "token", businessId: "business",
  });
  vi.mocked(moduleApi).mockReturnValue({ entitlements } as unknown as ReturnType<typeof moduleApi>);
});

describe("unsubscribed module queue access", () => {
  it.each(["es", "en"] as const)("redirects to billing in %s even when old records can be managed", async (locale) => {
    entitlements.mockResolvedValue({ modules: { preorders: { owned: false, can_manage_existing: true } } });
    const response = await redirectUnsubscribedModule(context(locale), "preorders");
    expect(response?.status).toBe(302);
    expect(response?.headers.get("Location")).toBe(
      `${locale === "en" ? "/en" : ""}/dashboard/billing?module=preorders`,
    );
  });

  it("also guards appointments and preselects the right module", async () => {
    entitlements.mockResolvedValue({ modules: { appointments: { owned: false } } });
    const response = await redirectUnsubscribedModule(context(), "appointments");
    expect(response?.headers.get("Location")).toBe("/dashboard/billing?module=appointments");
  });

  it("keeps subscribed modules available when intake is paused or quota is exhausted", async () => {
    entitlements.mockResolvedValue({ modules: { preorders: { owned: true, enabled: false, can_accept_new: false } } });
    const ctx = context();
    expect(await redirectUnsubscribedModule(ctx, "preorders")).toBeNull();
    expect(ctx.redirect).not.toHaveBeenCalled();
  });

  it("leaves missing business/auth state to the normal setup handling", async () => {
    vi.mocked(getServerAuth).mockResolvedValue({ userId: null, orgId: null, token: null, businessId: null });
    expect(await redirectUnsubscribedModule(context(), "preorders")).toBeNull();
    expect(moduleApi).not.toHaveBeenCalled();
  });

  it("does not interpret an API outage as a missing subscription", async () => {
    entitlements.mockRejectedValue(new Error("unavailable"));
    const ctx = context();
    expect(await redirectUnsubscribedModule(ctx, "preorders")).toBeNull();
    expect(ctx.redirect).not.toHaveBeenCalled();
  });
});
