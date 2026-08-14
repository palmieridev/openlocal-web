import type { APIContext } from "astro";
import { forward } from "@/lib/api/bff";
import { readMovementBody } from "@/lib/api/movements";

export const prerender = false;

/**
 * The API requires an `Idempotency-Key` header on stock movements and rejects
 * the request with 400 without one. Honour the caller's key when it sends one
 * (so a retry of the *same* movement collapses server-side) and mint one
 * otherwise, since a browser retry of a failed request is a new movement.
 */
export async function POST(ctx: APIContext): Promise<Response> {
  const sent = ctx.request.headers.get("Idempotency-Key")?.trim();
  const key = sent && /^[A-Za-z0-9._:-]{8,128}$/.test(sent) ? sent : crypto.randomUUID();

  return forward(ctx, "/api/v1/inventory/movements", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: await readMovementBody(ctx.request),
  });
}
