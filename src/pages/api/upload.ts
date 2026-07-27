import type { APIContext } from "astro";
import { put } from "@vercel/blob";
import { BLOB_READ_WRITE_TOKEN } from "astro:env/server";
import { getServerAuth } from "@/lib/api/server";
import { json } from "@/lib/api/bff";
import { imageExtension, validateImageUpload } from "@/lib/upload";

export const prerender = false;

/**
 * Upload an image to Vercel Blob and return its public URL. The token is a plain
 * bearer credential to the Blob API, so this works both on Vercel and from the
 * k8s dev deployment as long as BLOB_READ_WRITE_TOKEN is set at runtime.
 *
 * The caller persists the returned URL by saving the owning resource (e.g. the
 * business cover_image_url on the settings form) — this route only stores bytes.
 */
export async function POST(ctx: APIContext): Promise<Response> {
  const { userId, businessId } = await getServerAuth(ctx);
  if (!userId) return json({ error: "unauthorized" }, 401);
  if (!businessId) {
    return json({ error: "Configura tu negocio antes de subir imágenes." }, 400);
  }
  if (!BLOB_READ_WRITE_TOKEN) {
    return json({ error: "El almacenamiento de imágenes no está configurado." }, 503);
  }

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "No se recibió ninguna imagen." }, 400);
  }

  const problem = validateImageUpload(file);
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
    return json({ error: "No se pudo subir la imagen. Intenta de nuevo." }, 502);
  }
}
