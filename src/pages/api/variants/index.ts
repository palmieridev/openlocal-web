import type { APIContext } from "astro";
import { forward, readBody } from "@/lib/api/bff";

export const prerender = false;

// GET /api/variants?product_id=&business_id= — list a product's variants.
export async function GET(ctx: APIContext): Promise<Response> {
  const productId = ctx.url.searchParams.get("product_id") ?? "";
  const businessId = ctx.url.searchParams.get("business_id") ?? "";
  const q = new URLSearchParams({ business_id: businessId });
  return forward(ctx, `/api/v1/products/${encodeURIComponent(productId)}/variants?${q}`);
}

// POST /api/variants — create a variant.
export async function POST(ctx: APIContext): Promise<Response> {
  return forward(ctx, "/api/v1/variants", {
    method: "POST",
    body: await readBody(ctx.request),
  });
}
