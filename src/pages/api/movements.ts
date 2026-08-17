import type { APIContext } from "astro";
import { forward } from "@/lib/api/bff";
import { movementIdempotencyKey, readMovementBody } from "@/lib/api/movements";

export const prerender = false;

/**
 * The API requires an `Idempotency-Key` header on stock movements and rejects
 * the request with 400 without one. Honour the caller's key when it sends one
 * (so a retry of the *same* movement collapses server-side) and mint one as a
 * compatibility fallback for older callers that do not send the header.
 */
export async function POST(ctx: APIContext): Promise<Response> {
  const key = movementIdempotencyKey(ctx.request);

  return forward(ctx, "/api/v1/inventory/movements", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: await readMovementBody(ctx.request),
  });
}
