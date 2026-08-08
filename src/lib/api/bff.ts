import type { APIContext } from "astro";
import { apiFetch, ApiError } from "./client";

/** JSON Response helper. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Forward a request to the Openlocal API with the caller's Clerk token.
 * Keeps the token server-side and avoids browser CORS to the Go service.
 */
export async function forward(
  ctx: APIContext,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const auth = ctx.locals.auth();
  if (!auth.userId) return json({ error: "unauthorized" }, 401);
  const token = await auth.getToken();
  if (!token) return json({ error: "unauthorized" }, 401);

  try {
    const data = await apiFetch<unknown>(path, { token, init });
    return json(data ?? { ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return json(err.body ?? { error: err.message }, err.status);
    }
    return json({ error: "request failed" }, 502);
  }
}

/** Read and JSON-encode a request body for forwarding. */
export async function readBody(
  request: Request,
  transform: (body: unknown) => unknown = (body) => body,
): Promise<string> {
  const body = await request.json().catch(() => ({}));
  return JSON.stringify(transform(body));
}
