import type { APIContext } from "astro";
import { PUBLIC_API_BASE_URL } from "astro:env/client";
import { privateHeaders, sameOrigin } from "./module-relay";
import {
  grantId,
  grantPage,
  validateGrant,
  type GrantAction,
} from "@/lib/grants";
import { useT } from "@/i18n";

/** Narrow same-origin BFF. Clerk verifies the session; Go authorizes every operation. */
export async function relayAdmin(ctx: APIContext): Promise<Response> {
  const t = useT(
    ctx.request.headers.get("x-ol-locale") === "en" ? "en" : "es",
  ).admin;
  const json = (data: unknown, status: number) =>
    Response.json(data, { status, headers: privateHeaders });
  const fail = (status: number) => {
    const errors: Record<number, keyof typeof t.errors> = {
      400: "invalid",
      401: "signedOut",
      403: "forbidden",
      404: "notFound",
      413: "invalid",
      415: "invalid",
      429: "rateLimited",
    };
    const key = errors[status] ?? "unavailable";
    return json(
      {
        error: status === 409
          ? t.grants.conflict
          : key === "invalid"
            ? t.grants.invalid
            : t.errors[key],
        code: status === 409 ? "version_conflict" : key,
      },
      status,
    );
  };
  const path = ctx.params.path ?? "";
  const match =
    /^businesses\/([^/]+)\/grants(?:\/([^/]+)\/(extend|revoke|history))?$/.exec(
      path,
    );
  if (!match || !grantId(match[1]) || (match[2] && !grantId(match[2])))
    return fail(404);
  const method = ctx.request.method;
  if (
    !(method === "GET"
      ? !match[3] || match[3] === "history"
      : method === "POST" && match[3] !== "history")
  )
    return fail(404);
  if (method === "POST" && !sameOrigin(ctx.request, ctx.url)) return fail(403);
  let token: string | null;
  try {
    const auth = ctx.locals.auth();
    token = auth.userId ? await auth.getToken() : null;
  } catch {
    return fail(401);
  }
  if (!token) return fail(401);
  let body: string | undefined;
  const query = new URLSearchParams();
  try {
    if (method === "POST") {
      if (
        ctx.request.headers.get("content-type")?.split(";")[0].trim() !==
        "application/json"
      )
        return fail(415);
      const source = await ctx.request.text();
      if (new TextEncoder().encode(source).length > 65536) return fail(413);
      body = JSON.stringify(
        validateGrant(
          JSON.parse(source),
          (match[3] ?? "create") as GrantAction,
        ),
      );
    } else {
      if (
        [...ctx.url.searchParams.keys()].some(
          (key) => !["limit", "offset"].includes(key),
        )
      )
        return fail(400);
      const page = grantPage(ctx.url.searchParams);
      query.set("limit", String(page.limit));
      query.set("offset", String(page.offset));
    }
  } catch {
    return fail(400);
  }
  try {
    const response = await fetch(
      `${PUBLIC_API_BASE_URL.replace(/\/$/, "")}/api/v1/admin/${path}${query.size ? "?" + query : ""}`,
      {
        method,
        body,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return fail(response.status);
    return json(await response.json(), response.status);
  } catch {
    return fail(502);
  }
}
