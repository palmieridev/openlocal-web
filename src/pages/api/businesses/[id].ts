import type { APIContext } from "astro";
import { forward, readBody } from "@/lib/api/bff";

export const prerender = false;

export async function PATCH(ctx: APIContext): Promise<Response> {
  return forward(ctx, `/api/v1/businesses/${ctx.params.id}`, {
    method: "PATCH",
    body: await readBody(ctx.request),
  });
}
