import { describe, expect, it } from "vitest";
import { authFlowLink, authReturnPath } from "./auth-return";
const origin = "https://openlocal.store";
function incoming(value: string) {
  const url = new URL("/en/login", origin); url.searchParams.set("redirect_url", value); return url;
}
describe("authentication return paths", () => {
  it("carries an English storefront through login, choice, signup, and back to login", () => {
    const destination = "/en/business/local?source=save";
    let current = incoming(destination);
    for (const path of ["/en/register", "/en/register/shopper", "/en/login"]) {
      current = new URL(authFlowLink(path, authReturnPath(current)), origin);
      expect(authReturnPath(current)).toBe(destination);
    }
  });
  it("normalizes Clerk's absolute same-origin return URL", () => {
    expect(authReturnPath(incoming(origin + "/business/local"))).toBe("/business/local");
  });
  it.each(["https://evil.example/path", "//evil.example", "/\\evil.example", "javascript:alert(1)", "relative", "/en/register/shopper", "/login", "/business/\nlocal", "https://user:pass@openlocal.store/path"])("rejects unsafe or looping destinations: %s", (value) => {
    expect(authReturnPath(incoming(value))).toBeUndefined();
  });
  it("leaves normal signup links unchanged without a return destination", () => {
    expect(authReturnPath(new URL("/register", origin))).toBeUndefined();
    expect(authFlowLink("/register/shopper", undefined)).toBe("/register/shopper");
  });
});
