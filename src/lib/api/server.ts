import type { AstroCookies } from "astro";
import { apiFetch, ApiError } from "./client";
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

  if (token && businessId) {
    try {
      await apiFetch<Business>(`/api/v1/businesses/${businessId}`, { token });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        clearBusinessCookie(ctx.cookies);
        businessId = null;
      }
      // Other failures (403 org-claim race, API down, network) keep the id.
    }
  }

  if (token && !businessId) {
    try {
      const business = await apiFetch<Business>("/api/v1/businesses/me", { token });
      businessId = business.id;
      setBusinessCookie(ctx.cookies, business.id);
    } catch {
      // 403 = no active Clerk org claim, 404 = no linked business, network/API
      // failures should all leave owner pages in their setup/error fallback.
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
