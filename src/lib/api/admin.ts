import { apiFetch, ApiError } from "./client";
import type { AdminActivity, AdminBusiness, AdminBusinessDetail, AdminPage } from "@/types/admin";

type Filters = Record<string, string | undefined>;

/** Only SSR callers supply the verified session token; no active business cookie. */
export function adminApi(token: string) {
  const read = <T>(path: string, query?: Filters) => apiFetch<T>(`/api/v1/admin${path}`, {
    token,
    query,
    init: { cache: "no-store", signal: AbortSignal.timeout(10_000) },
  });
  return {
    businesses: (query: Filters) => read<AdminPage<AdminBusiness>>("/businesses", query),
    business: (id: string) => read<AdminBusinessDetail>(`/businesses/${encodeURIComponent(id)}`),
    activity: (query: Filters) => read<AdminPage<AdminActivity>>("/activity", query),
  };
}

export type AdminError = "invalid" | "signedOut" | "forbidden" | "notFound" | "rateLimited" | "unavailable";
type ReadResult<T> = { data: T; error: null } | { data: null; error: AdminError };
interface Context {
  locals: App.Locals;
  response: { status?: number; headers: Headers };
}

/** The Go API's allowlist is authoritative. A failed read never becomes an empty success. */
export async function readAdmin<T>(ctx: Context, load: (api: ReturnType<typeof adminApi>) => Promise<T>): Promise<ReadResult<T>> {
  ctx.response.headers.set("Cache-Control", "private, no-store");
  ctx.response.headers.set("X-Robots-Tag", "noindex, nofollow");
  ctx.response.headers.set("Referrer-Policy", "no-referrer");
  try {
    const auth = ctx.locals.auth();
    const token = auth.userId ? await auth.getToken() : null;
    if (!token) {
      ctx.response.status = 401;
      return { data: null, error: "signedOut" };
    }
    return { data: await load(adminApi(token)), error: null };
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 503;
    const errors: Record<number, AdminError> = { 400: "invalid", 401: "signedOut", 403: "forbidden", 404: "notFound", 429: "rateLimited" };
    ctx.response.status = errors[status] ? status : 503;
    return { data: null, error: errors[status] ?? "unavailable" };
  }
}
