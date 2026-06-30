import type { AstroCookies } from "astro";
import { apiFetch, ApiError } from "./client";
import type { Business } from "@/types/api";

/**
 * Cookie holding the active business id. Set at onboarding (the API has no
 * "resolve my business" endpoint yet), read on every owner-area request.
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
 *
 * The business id lives in a cookie, which can go stale (e.g. the business was
 * deleted in Clerk/the DB but the browser still holds `ol_bid`). To avoid
 * trapping the owner in a broken panel, we validate the id against the API: if
 * the business no longer exists (404) we drop the cookie and report
 * `businessId: null` so pages fall back to onboarding.
 *
 * We do NOT drop the cookie on 403. Right after onboarding the freshly-activated
 * Clerk org claim hasn't propagated to the SSR token yet, so the validation GET
 * transiently 403s; clearing here would bounce the owner straight back to the
 * onboarding form (losing the business they just created). 403 = keep the id and
 * let the page show its retry/NeedsSetup state instead.
 */
export async function getServerAuth(ctx: AuthCtx): Promise<ServerAuth> {
  const auth = ctx.locals.auth();
  const userId = auth.userId ?? null;
  const token = userId ? await auth.getToken() : null;
  let businessId = ctx.cookies.get(BUSINESS_COOKIE)?.value ?? null;

  if (token && businessId) {
    try {
      await apiFetch<Business>(`/api/v1/businesses/${businessId}`, { token });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        clearBusinessCookie(ctx.cookies);
        businessId = null;
      }
      // Other failures (403 org-claim race, API down, network) keep the id so
      // the page can show its retry/NeedsSetup state instead of bouncing to
      // onboarding.
    }
  }

  return { userId, orgId: auth.orgId, token, businessId };
}

export function setBusinessCookie(cookies: AstroCookies, businessId: string): void {
  cookies.set(BUSINESS_COOKIE, businessId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function clearBusinessCookie(cookies: AstroCookies): void {
  cookies.delete(BUSINESS_COOKIE, { path: "/" });
}
