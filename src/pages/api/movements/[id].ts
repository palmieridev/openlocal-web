import type { APIContext } from "astro";
import { forward } from "@/lib/api/bff";
import { readMovementBody } from "@/lib/api/movements";

export const prerender = false;

// PATCH /api/movements/[id] — edit an existing stock movement.
export async function PATCH(ctx: APIContext): Promise<Response> {
  return forward(ctx, `/api/v1/inventory/movements/${ctx.params.id}`, {
    method: "PATCH",
    body: await readMovementBody(ctx.request),
  });
}

// DELETE /api/movements/[id] — remove a stock movement.
export async function DELETE(ctx: APIContext): Promise<Response> {
  const businessId = ctx.url.searchParams.get("business_id") ?? "";
  const q = businessId ? `?business_id=${encodeURIComponent(businessId)}` : "";
  return forward(ctx, `/api/v1/inventory/movements/${ctx.params.id}${q}`, {
    method: "DELETE",
  });
}
