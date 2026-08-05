import type { AstroCookies } from "astro";
import { apiFetch } from "./client";
import type { Business } from "@/types/api";

/**
 * Cookie holding the active business id. It is set at onboarding and refreshed
 * from /businesses/me on new browsers/devices.
 */
export const BUSINESS_COOKIE = "ol_bid";

interface AuthCtx {
  locals: App.Locals;
  cookies: AstroCookies;
}

export interface ServerAuth {
  userId: string | null;
  orgId: string | null | undefined;
  token: string | null;
  businessId: string | null;
}

/**
 * Resolve Clerk identity/token + the active business id from a page/endpoint.
 */
export async function getServerAuth(ctx: AuthCtx): Promise<ServerAuth> {
  const auth = ctx.locals.auth();
  const userId = auth.userId ?? null;
  const token = userId ? await auth.getToken() : null;
  let businessId = ctx.cookies.get(BUSINESS_COOKIE)?.value ?? null;

  // A stored id can go stale (org switched, business deleted, cookie from
  // another environment). The API answers 403 — not 404 — for both unknown and
  // inaccessible businesses, so trusting the cookie until a 404 arrives would
  // strand the owner area on its error state forever. Re-resolve instead.
  let storedIdFailed = false;
  if (token && businessId) {
    try {
      await apiFetch<Business>(`/api/v1/businesses/${businessId}`, { token });
    } catch {
      storedIdFailed = true;
    }
  }

  if (token && (!businessId || storedIdFailed)) {
    try {
      const business = await apiFetch<Business>("/api/v1/businesses/me", { token });
      businessId = business.id;
      setBusinessCookie(ctx.cookies, business.id);
    } catch {
      // Couldn't resolve a business at all: 403 = no active Clerk org claim
      // (can be a transient claim race), 404 = none linked, or the API is down.
      // Keep any previously stored id so a blip doesn't cut the owner off from
      // their own data — the next request retries this same path.
    }
  }

  return { userId, orgId: auth.orgId, token, businessId };
}

/**
 * Whether to set the Secure flag on the business cookie. Normally on in prod
 * builds, but the k8s dev environment serves a production build over plain HTTP
 * (http://openlocal-dev.home) — Secure would make the browser drop `ol_bid` and
 * break the owner area. Set OL_INSECURE_COOKIES=1 there to opt out.
 */
function useSecureCookie(): boolean {
  return import.meta.env.PROD && process.env.OL_INSECURE_COOKIES !== "1";
}

export function setBusinessCookie(cookies: AstroCookies, businessId: string): void {
  cookies.set(BUSINESS_COOKIE, businessId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie(),
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function clearBusinessCookie(cookies: AstroCookies): void {
  cookies.delete(BUSINESS_COOKIE, { path: "/" });
}
