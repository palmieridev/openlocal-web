import type { APIContext } from "astro";
import { forward } from "@/lib/api/bff";
import { readMovementBody } from "@/lib/api/movements";

export const prerender = false;

export async function POST(ctx: APIContext): Promise<Response> {
  return forward(ctx, "/api/v1/inventory/movements", {
    method: "POST",
    body: await readMovementBody(ctx.request),
  });
}
