import type { APIContext } from "astro";
import { forward } from "@/lib/api/bff";

export const prerender = false;

// Barcode/SKU lookup for the scanner. /api/lookup?barcode=...&business_id=...
export async function GET(ctx: APIContext): Promise<Response> {
  const sp = ctx.url.searchParams;
  const businessId = sp.get("business_id") ?? "";
  const barcode = sp.get("barcode");
  const sku = sp.get("sku");
  const q = `business_id=${encodeURIComponent(businessId)}`;

  if (barcode) {
    return forward(ctx, `/api/v1/variants/by-barcode/${encodeURIComponent(barcode)}?${q}`);
  }
  if (sku) {
    return forward(ctx, `/api/v1/variants/by-sku/${encodeURIComponent(sku)}?${q}`);
  }
  return new Response(JSON.stringify({ error: "barcode or sku required" }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}
