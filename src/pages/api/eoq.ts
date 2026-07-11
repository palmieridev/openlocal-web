import type { APIContext } from "astro";
import { forward } from "@/lib/api/bff";

export const prerender = false;

// EOQ recommendation: /api/eoq?business_id=&variant_id=&period_days=&estimated_order_cost=&estimated_holding_cost_percent=
export async function GET(ctx: APIContext): Promise<Response> {
  const qs = ctx.url.searchParams.toString();
  return forward(ctx, `/api/v1/analytics/eoq?${qs}`);
}
