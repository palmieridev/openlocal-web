const LEGACY_MOVEMENT_TYPES: Record<string, string> = {
  purchase: "IN_PURCHASE",
  production: "IN_PRODUCTION",
  sale: "OUT_SALE",
  loss: "OUT_LOSS",
};

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
