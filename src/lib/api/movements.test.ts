import { describe, expect, it } from "vitest";
import { readMovementBody } from "./movements";

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
