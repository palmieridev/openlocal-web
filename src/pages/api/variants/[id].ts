import type { APIContext } from "astro";
import { forward, readBody } from "@/lib/api/bff";
import { normalizeVariantPayload } from "@/lib/variants";

export const prerender = false;

export async function PATCH(ctx: APIContext): Promise<Response> {
  return forward(ctx, `/api/v1/variants/${ctx.params.id}`, {
    method: "PATCH",
    body: await readBody(ctx.request, normalizeVariantPayload),
  });
}

export async function DELETE(ctx: APIContext): Promise<Response> {
  const businessId = ctx.url.searchParams.get("business_id") ?? "";
  const q = businessId ? `?business_id=${encodeURIComponent(businessId)}` : "";
  return forward(ctx, `/api/v1/variants/${ctx.params.id}${q}`, {
    method: "DELETE",
  });
}
