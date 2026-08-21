import { describe, expect, it } from "vitest";
import {
  movementIdempotency,
  movementIdempotencyKey,
  readMovementBody,
} from "./movements";

function req(body: unknown): Request {
  return new Request("http://test/api/movements", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("readMovementBody", () => {
  it("maps legacy movement types to API enums", async () => {
    const out = JSON.parse(await readMovementBody(req({ movement_type: "purchase" })));
    expect(out.movement_type).toBe("IN_PURCHASE");
  });

  it("keeps already-valid API enums untouched", async () => {
    const out = JSON.parse(await readMovementBody(req({ movement_type: "OUT_SALE" })));
    expect(out.movement_type).toBe("OUT_SALE");
  });

  it("splits adjustment by quantity sign", async () => {
    const positive = JSON.parse(
      await readMovementBody(req({ movement_type: "adjustment", quantity: "5" })),
    );
    expect(positive.movement_type).toBe("IN_ADJUSTMENT");

    const negative = JSON.parse(
      await readMovementBody(req({ movement_type: "adjustment", quantity: "-3" })),
    );
    expect(negative.movement_type).toBe("OUT_ADJUSTMENT");
  });

  it("serializes {} for invalid JSON bodies", async () => {
    const bad = new Request("http://test/api/movements", { method: "POST", body: "not json" });
    await expect(readMovementBody(bad)).resolves.toBe("{}");
  });
});

describe("movement idempotency", () => {
  it("reuses a key for the same request signature", () => {
    const first = movementIdempotency("movement-1:payload-a");
    expect(movementIdempotency("movement-1:payload-a", first)).toBe(first);
  });

  it("generates a new key when the payload changes", () => {
    const first = movementIdempotency("movement-1:payload-a");
    const changed = movementIdempotency("movement-1:payload-b", first);
    expect(changed.key).not.toBe(first.key);
  });

  it("accepts a valid browser key at the BFF boundary", () => {
    const request = new Request("http://test/api/movements", {
      headers: { "Idempotency-Key": "movement:edit:12345678" },
    });
    expect(movementIdempotencyKey(request)).toBe("movement:edit:12345678");
  });

  it("mints a valid fallback key for callers without one", () => {
    const key = movementIdempotencyKey(new Request("http://test/api/movements"));
    expect(key).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
  });
});
