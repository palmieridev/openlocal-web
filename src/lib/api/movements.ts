const LEGACY_MOVEMENT_TYPES: Record<string, string> = {
  purchase: "IN_PURCHASE",
  production: "IN_PRODUCTION",
  sale: "OUT_SALE",
  loss: "OUT_LOSS",
};

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export interface MovementIdempotency {
  signature: string;
  key: string;
}

/** Keep one key while retrying the same logical movement request. */
export function movementIdempotency(
  signature: string,
  current?: MovementIdempotency,
): MovementIdempotency {
  if (current?.signature === signature) return current;
  return { signature, key: crypto.randomUUID() };
}

/** Validate a browser key at the BFF boundary, with a fallback for older callers. */
export function movementIdempotencyKey(request: Request): string {
  const sent = request.headers.get("Idempotency-Key")?.trim();
  return sent && IDEMPOTENCY_KEY_PATTERN.test(sent)
    ? sent
    : crypto.randomUUID();
}

function adjustmentType(quantity: unknown): "IN_ADJUSTMENT" | "OUT_ADJUSTMENT" {
  return String(quantity ?? "").trim().startsWith("-") ? "OUT_ADJUSTMENT" : "IN_ADJUSTMENT";
}

export async function readMovementBody(request: Request): Promise<string> {
  const body = await request.json().catch(() => ({}));
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const movement = body as Record<string, unknown>;
    const type = String(movement.movement_type ?? "");
    if (type === "adjustment") {
      movement.movement_type = adjustmentType(movement.quantity);
    } else if (LEGACY_MOVEMENT_TYPES[type]) {
      movement.movement_type = LEGACY_MOVEMENT_TYPES[type];
    }
  }
  return JSON.stringify(body);
}
