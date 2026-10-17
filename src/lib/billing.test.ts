import { describe, expect, it } from "vitest";
import { billingChangeMessage } from "./billing";
import { useT } from "@/i18n";

describe("subscription change feedback", () => {
  const base = { timing: "immediate", effective_at: "2026-10-16T20:00:00Z" };
  it.each(["es", "en"] as const)("explains the carried balance in %s", (locale) => {
    expect(billingChangeMessage({ ...base, payment_status: "settled", amount_deferred: "9.56" }, locale))
      .toBe(useT(locale).modules.paymentDeferred.replace("{amount}", "9.56"));
  });
  it("does not call a pending payment confirmed", () => {
    expect(billingChangeMessage({ ...base, pending: true, payment_status: "settled", amount_deferred: "9.56" }, "en"))
      .toBe(useT("en").modules.paymentNeedsAttention);
  });
  it("confirms a settled payment without claiming that money was collected", () => {
    expect(billingChangeMessage({ ...base, payment_status: "settled", amount_paid: "0.00", amount_deferred: "0.00" }, "en"))
      .toBe(useT("en").modules.changeConfirmed);
  });
  it("keeps verifying when an older API omits settlement details", () => {
    expect(billingChangeMessage(base, "en")).toBe(useT("en").modules.paymentPending);
  });
});
