import type { APIContext } from "astro";
import { PUBLIC_API_BASE_URL } from "astro:env/client";
import { getServerAuth } from "./server";

const safeId = "[a-zA-Z0-9_-]+";
const rules: [RegExp, string[]][] = [
  [new RegExp(`^public/businesses/${safeId}/appointments/(services|availability)$`), ["GET"]],
  [new RegExp(`^public/businesses/${safeId}/preorders/(catalog|pickup-windows)$`), ["GET"]],
  [new RegExp(`^public/businesses/${safeId}/(appointments|preorders)$`), ["POST"]],
  [/^public\/plans$/, ["GET"]],
  [new RegExp(`^requests/${safeId}$`), ["GET"]],
  [new RegExp(`^requests/${safeId}/(cancel|access)$`), ["POST"]],
  [/^owner\/(entitlements|subscription)$/, ["GET"]],
  [/^owner\/billing\/(checkout|portal|preview|change)$/, ["POST"]],
  [/^owner\/modules\/(appointments|preorders)$/, ["PATCH"]],
  [/^owner\/(appointments|preorders)$/, ["GET", "POST"]],
  [/^owner\/(appointments|preorders)\/settings$/, ["GET", "PATCH"]],
  [/^owner\/appointments\/availability$/, ["GET"]],
  [/^owner\/preorders\/(catalog|pickup-windows)$/, ["GET"]],
  [/^owner\/(appointments|preorders)\/export$/, ["GET"]],
  [/^owner\/preorders\/summary$/, ["GET"]],
  [new RegExp(`^owner/(appointments|preorders)/${safeId}$`), ["GET", "PATCH"]],
  [new RegExp(`^owner/(appointments|preorders)/${safeId}/transitions$`), ["POST"]],
  [/^owner\/(services|appointment-resources)$/, ["GET", "POST"]],
  [new RegExp(`^owner/(services|appointment-resources)/${safeId}$`), ["PATCH"]],
  [new RegExp(`^owner/module-customers/${safeId}/history$`), ["GET"]],
];
const allowedQuery = new Set(["date", "service_id", "resource_id", "customer_id", "status", "limit", "offset", "from", "to"]);
export const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
export const managementCookie = (id: string) => `ol_request_${id}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...privateHeaders, "Content-Type": "application/json" } });
export function routeAllowed(path: string, method: string): boolean { return rules.find(([pattern]) => pattern.test(path))?.[1].includes(method) ?? false; }
export function sameOrigin(request: Request, url: URL): boolean {
  return request.headers.get("origin") === url.origin && request.headers.get("sec-fetch-site") !== "cross-site";
}
function saveCredential(ctx: APIContext, id: string, token: string) {
  ctx.cookies.set(managementCookie(id), token, { httpOnly: true, sameSite: "strict", secure: import.meta.env.PROD && process.env.OL_INSECURE_COOKIES !== "1", path: "/", maxAge: 60 * 60 * 24 * 400 });
}
export async function relayModule(ctx: APIContext): Promise<Response> {
  const path = ctx.params.path ?? "";
  const method = ctx.request.method;
  if (!routeAllowed(path, method)) return json({code: "not_found"}, 404);
  const mutation = method !== "GET";
  if (mutation && !sameOrigin(ctx.request, ctx.url)) return json({code: "forbidden"}, 403);
  let body: Record<string, unknown> | undefined;
  if (mutation) {
    if (!ctx.request.headers.get("content-type")?.startsWith("application/json")) return json({code: "invalid_request"}, 415);
    const source = await ctx.request.text();
    if (source.length > 65536) return json({code: "invalid_request"}, 413);
    try { body = JSON.parse(source); } catch { return json({code: "invalid_request"}, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({code: "invalid_request"}, 400);
  }
  const headers = new Headers({"Accept": "application/json"});
  if (body) headers.set("Content-Type", "application/json");
  const key = ctx.request.headers.get("idempotency-key");
  if (key && /^[\w-]{8,128}$/.test(key)) headers.set("Idempotency-Key", key);
  let upstream = path;
  if (path.startsWith("owner/")) {
    const {token, businessId} = await getServerAuth(ctx);
    if (!token) return json({code: "unauthorized"}, 401);
    if (!businessId) return json({code: "not_found"}, 404);
    headers.set("Authorization", `Bearer ${token}`);
    upstream = `businesses/${encodeURIComponent(businessId)}/${path.slice(6)}`;
  } else if (path.startsWith("requests/")) {
    const [, id, action] = path.split("/");
    let token = ctx.cookies.get(managementCookie(id))?.value;
    if (action === "access") {
      token = typeof body?.token === "string" ? body.token : undefined;
      if (!token || token.length < 32 || token.length > 512) return json({code: "not_found"}, 404);
    }
    if (!token) return json({code: "not_found"}, 404);
    headers.set("X-Openlocal-Management-Token", token);
    upstream = `public/requests/${id}${action === "cancel" ? "/cancel" : ""}`;
    if (action === "access") body = undefined;
  }
  const query = new URLSearchParams();
  for (const [name, value] of ctx.url.searchParams) if (allowedQuery.has(name)) query.set(name, value);
  try {
    const access = path.endsWith("/access");
    const response = await fetch(`${PUBLIC_API_BASE_URL.replace(/\/$/, "")}/api/v1/${upstream}${query.size ? `?${query}` : ""}`, {
      method: access ? "GET" : method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000), redirect: "error",
    });
    const out = new Headers(privateHeaders);
    for (const name of ["content-type", "retry-after", "idempotent-replayed", "idempotency-replayed", "content-disposition"]) {
      const value = response.headers.get(name); if (value) out.set(name, value);
    }
    if (access && response.ok) {
      saveCredential(ctx, path.split("/")[1], headers.get("X-Openlocal-Management-Token")!);
      return json({ok: true});
    }
    if (path.startsWith("public/") && method === "POST" && response.ok) {
      const data = await response.json();
      if (typeof data.management_token === "string" && typeof data.public_id === "string" && /^[\w-]+$/.test(data.public_id)) {
        saveCredential(ctx, data.public_id, data.management_token);
        const prefix = body?.locale === "en" ? "/en" : "";
        data.management_url = `${prefix}/requests/${data.public_id}#access=${encodeURIComponent(data.management_token)}`;
        delete data.management_token;
      }
      return new Response(JSON.stringify(data), {status: response.status, headers: out});
    }
    return new Response(response.status === 204 ? null : await response.text(), {status: response.status, headers: out});
  } catch { return json({code: "upstream_unavailable"}, 502); }
}
