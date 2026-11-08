import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/astro/server", () => ({
  createRouteMatcher: (patterns: string[]) => (request: Request) =>
    patterns.some((pattern) => new RegExp(`^${pattern}$`).test(new URL(request.url).pathname)),
  clerkMiddleware: (handler: Function) => async (ctx: any, next: Function) =>
    (await handler(ctx.locals.auth, ctx)) ?? next(),
}));

import { onRequest } from "./middleware";

async function visit(path: string, userId: string | null, orgId: string | null = null, locale = "es") {
  const url = new URL(path, "http://localhost:4321");
  const next = vi.fn(async () => new Response("page"));
  const context = {
    url,
    request: new Request(url),
    locals: { locale, auth: () => ({ userId, orgId, redirectToSignIn: () => Response.redirect(new URL("/login", url)) }) },
    redirect: (location: string) => Response.redirect(new URL(location, url)),
  };
  const response = await onRequest(context as never, next);
  if (!response) throw new Error("Middleware did not return a response");
  return { response, next };
}

describe("personal and business route access", () => {
  it.each(["/account", "/account/profile", "/dashboard", "/onboarding", "/admin", "/admin/activity", "/admin/businesses/id"])("requires sign-in for %s", async (path) => {
    const { response, next } = await visit(path, null);
    expect(response.headers.get("Location")).toBe("http://localhost:4321/login");
    expect(next).not.toHaveBeenCalled();
  });
  it("preserves the English return path after locale rewriting", async () => {
    const { response } = await visit("/account/profile", null, null, "en");
    const location = new URL(response.headers.get("Location")!);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("redirect_url")).toBe("/en/account/profile");
  });
  it.each([null, "org_1"])("allows any signed-in user into their personal area (org %s)", async (orgId) => {
    const { next } = await visit("/account", "user_1", orgId);
    expect(next).toHaveBeenCalled();
  });
  it("sends a user without an active business to their account", async () => {
    const { response, next } = await visit("/dashboard/products", "user_1", null, "en");
    expect(response.headers.get("Location")).toBe("http://localhost:4321/en/account");
    expect(next).not.toHaveBeenCalled();
  });
  it("allows business members into the dashboard", async () => {
    expect((await visit("/dashboard", "user_1", "org_1")).next).toHaveBeenCalled();
  });
  it("allows a personal account to register a business", async () => {
    expect((await visit("/onboarding", "user_1")).next).toHaveBeenCalled();
  });
  it("keeps marketplace browsing public", async () => {
    expect((await visit("/marketplace", null)).next).toHaveBeenCalled();
  });
  it.each([null, "org_1"])("allows an admin request without requiring organization selection (org %s)", async (orgId) => {
    const { response, next } = await visit("/admin", "user_platform", orgId);
    // The page's Go API read still checks the platform allowlist.
    expect(next).toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
  it("preserves the localized admin return URL and marks its redirect private", async () => {
    const { response } = await visit("/admin/activity?business_id=business", null, null, "en");
    const location = new URL(response.headers.get("Location")!);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("redirect_url")).toBe("/en/admin/activity?business_id=business");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
