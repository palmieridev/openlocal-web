import type { APIContext } from "astro";
import { forward, readBody } from "@/lib/api/bff";

export const prerender = false;

export async function POST(ctx: APIContext): Promise<Response> {
  return forward(ctx, "/api/v1/inventory/movements", {
    method: "POST",
    body: await readBody(ctx.request),
  });
}
