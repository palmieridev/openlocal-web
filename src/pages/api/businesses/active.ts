import type { APIContext } from "astro";
import { apiFetch, ApiError } from "@/lib/api/client";
import { json } from "@/lib/api/bff";
import { setBusinessCookie } from "@/lib/api/server";
import type { Business } from "@/types/api";

// Resolve the selected organization through the API rather than trusting a
// browser-supplied business id or retaining the previous organization's cookie.
function reply(data: unknown, status = 200) {
  const response = json(data, status);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(ctx: APIContext): Promise<Response> {
  const auth = ctx.locals.auth();
  if (!auth.userId) return reply({ error: "unauthorized" }, 401);
  const body = await ctx.request.json().catch(() => null);
  if (typeof body?.organization !== "string" || !/^org_[A-Za-z0-9]+$/.test(body.organization)) {
    return reply({ error: "invalid organization" }, 400);
  }
  // A delayed Clerk session refresh must never open the previous business.
  if (auth.orgId !== body.organization) return reply({ error: "organization not active" }, 409);
  const token = await auth.getToken();
  if (!token) return reply({ error: "unauthorized" }, 401);
  try {
    const business = await apiFetch<Business>("/api/v1/businesses/me", { token });
    setBusinessCookie(ctx.cookies, business.id);
    return reply({ id: business.id });
  } catch (err) {
    if (err instanceof ApiError) return reply({ error: "business unavailable" }, err.status);
    return reply({ error: "request failed" }, 502);
  }
}
