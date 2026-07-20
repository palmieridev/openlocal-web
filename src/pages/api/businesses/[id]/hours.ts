import type { APIContext } from "astro";
import { forward, readBody } from "@/lib/api/bff";

export const prerender = false;

export async function GET(ctx: APIContext): Promise<Response> {
  return forward(ctx, `/api/v1/businesses/${ctx.params.id}/hours`);
}

/** Replaces the whole weekly schedule (the API upserts all seven days). */
export async function PUT(ctx: APIContext): Promise<Response> {
  return forward(ctx, `/api/v1/businesses/${ctx.params.id}/hours`, {
    method: "PUT",
    body: await readBody(ctx.request),
  });
}
