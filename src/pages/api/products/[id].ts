import type { APIContext } from "astro";
import { forward, readBody } from "@/lib/api/bff";

export const prerender = false;

export async function PATCH(ctx: APIContext): Promise<Response> {
  return forward(ctx, `/api/v1/products/${ctx.params.id}`, {
    method: "PATCH",
    body: await readBody(ctx.request),
  });
}

export async function DELETE(ctx: APIContext): Promise<Response> {
  const businessId = ctx.url.searchParams.get("business_id") ?? "";
  return forward(ctx, `/api/v1/products/${ctx.params.id}?business_id=${businessId}`, {
    method: "DELETE",
  });
}
