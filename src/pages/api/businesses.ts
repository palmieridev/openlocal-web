import type { APIContext } from "astro";
import { apiFetch, ApiError } from "@/lib/api/client";
import { json, readBody } from "@/lib/api/bff";
import { setBusinessCookie } from "@/lib/api/server";
import type { Business } from "@/types/api";

export const prerender = false;

// Create a business: forwards to the API, then persists the new business id so
// the owner area can scope subsequent requests.
export async function POST(ctx: APIContext): Promise<Response> {
  const auth = ctx.locals.auth();
  if (!auth.userId) return json({ error: "unauthorized" }, 401);
  const token = await auth.getToken();
  if (!token) return json({ error: "unauthorized" }, 401);

  try {
    const business = await apiFetch<Business>("/api/v1/businesses", {
      token,
      init: { method: "POST", body: await readBody(ctx.request) },
    });
    setBusinessCookie(ctx.cookies, business.id);
    return json(business, 201);
  } catch (err) {
    if (err instanceof ApiError) return json(err.body ?? { error: err.message }, err.status);
    return json({ error: "request failed" }, 502);
  }
}
