import { describe, expect, it } from "vitest";
import { submissionKey } from "./module-client";

describe("submission retries", () => {
  it("keeps the same idempotency key when only a challenge proof changes", () => {
    const key = submissionKey();
    const first = key({ customer_name: "María", quantity: "1.250", challenge_token: "first" });
    expect(key({ customer_name: "María", quantity: "1.250", challenge_token: "renewed" })).toBe(first);
    expect(key({ customer_name: "María", quantity: "2.000", challenge_token: "renewed" })).not.toBe(first);
  });
});
