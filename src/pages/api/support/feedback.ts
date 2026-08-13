import type { APIContext } from "astro";
import { apiFetch, ApiError } from "@/lib/api/client";
import { json } from "@/lib/api/bff";
import { isLocale, useT, type Locale } from "@/i18n";

export const prerender = false;

/** Mirrors the Go endpoint's bounds so bad input never reaches it. */
const DOC_ID_MAX = 128;
const COMMENT_MAX = 1000;
const PATH_MAX = 256;

const DOC_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

/**
 * Support-article feedback. Anonymous by design — the support centre is public,
 * so this route does not require a Clerk session and simply relays to the Go
 * API's public (rate-limited) endpoint.
 *
 * `/api/*` carries no locale, so the widget posts its page locale in the body,
 * the same convention `ImageUploader` uses for `/api/upload`.
 */
export async function POST(ctx: APIContext): Promise<Response> {
  const body: unknown = await ctx.request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "bad request" }, 400);
  }

  const payload = body as Record<string, unknown>;
  const locale: Locale = isLocale(payload.locale)
    ? payload.locale
    : ctx.locals.locale;
  const t = useT(locale).support.feedback;

  const docId = text(payload.doc_id, DOC_ID_MAX);
  if (!docId || !DOC_ID.test(docId)) {
    return json({ error: t.error }, 400);
  }

  const verdict = payload.verdict;
  if (verdict !== "up" && verdict !== "down") {
    return json({ error: t.error }, 400);
  }

  const comment = text(payload.comment, COMMENT_MAX);
  const path = text(payload.path, PATH_MAX);

  try {
    const data = await apiFetch<{ id: string }>(
      "/api/v1/public/support/feedback",
      {
        init: {
          method: "POST",
          body: JSON.stringify({
            doc_id: docId,
            locale,
            verdict,
            comment,
            path: path?.startsWith("/") ? path : null,
          }),
        },
      },
    );
    return json(data ?? { ok: true }, 201);
  } catch (err) {
    // The answer is worth little enough that a failed relay should not shout at
    // the visitor beyond the widget's inline message.
    const status = err instanceof ApiError ? err.status : 502;
    return json({ error: t.error }, status >= 500 ? 502 : status);
  }
}
