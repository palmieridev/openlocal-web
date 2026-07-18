import { afterEach, describe, expect, it, vi } from "vitest";
import type { AstroCookies } from "astro";
import { setBusinessCookie, BUSINESS_COOKIE } from "./server";

/** Minimal AstroCookies stub capturing the last set() options. */
function cookieSpy() {
  const set = vi.fn();
  return { cookies: { set } as unknown as AstroCookies, set };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

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
