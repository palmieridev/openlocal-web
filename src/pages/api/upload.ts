import type { APIContext } from "astro";
import { put } from "@vercel/blob";
import { BLOB_READ_WRITE_TOKEN } from "astro:env/server";
import { getServerAuth } from "@/lib/api/server";
import { json } from "@/lib/api/bff";
import { imageExtension, validateImageUpload } from "@/lib/upload";
import { isLocale, useT, type Locale } from "@/i18n";

export const prerender = false;

/**
 * Upload an image to Vercel Blob and return its public URL. The token is a plain
 * bearer credential to the Blob API, so this works both on Vercel and from the
 * k8s dev deployment as long as BLOB_READ_WRITE_TOKEN is set at runtime.
 *
 * The caller persists the returned URL by saving the owning resource (e.g. the
 * business cover_image_url on the settings form) — this route only stores bytes.
 *
 * `/api/*` is never locale-prefixed, so the uploader sends its page locale as a
 * form field: these messages are rendered verbatim by the control that called
 * this route, and would otherwise always come back in Spanish.
 */
export async function POST(ctx: APIContext): Promise<Response> {
  const { userId, businessId } = await getServerAuth(ctx);
  if (!userId) return json({ error: "unauthorized" }, 401);

  // Resolved again after the body is read; the early failures use the default.
  let locale: Locale = ctx.locals.locale;
  const t = () => useT(locale).upload;

  if (!businessId) {
    return json({ error: t().needsBusiness }, 400);
  }
  if (!BLOB_READ_WRITE_TOKEN) {
    return json({ error: t().storageUnavailable }, 503);
  }

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return json({ error: t().badRequest }, 400);
  }

  const sent = form.get("locale");
  if (isLocale(sent)) locale = sent;

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: t().noImage }, 400);
  }

  const problem = validateImageUpload(file, locale);
  if (problem) return json({ error: problem }, 400);

  // Scope the path to the business and label it by kind (cover, …). A random
  // suffix keeps a new upload from being cached behind the old URL.
  const ext = imageExtension(file.type);
  const kind = String(form.get("kind") ?? "image").replace(/[^a-z]/g, "") || "image";
  const pathname = `businesses/${businessId}/${kind}.${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      contentType: file.type,
    });
    return json({ url: blob.url });
  } catch (err) {
    console.warn("[openlocal-upload]", err instanceof Error ? err.message : err);
    return json({ error: t().uploadRetry }, 502);
  }
}
