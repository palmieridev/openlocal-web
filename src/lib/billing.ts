import { useT, type Locale } from "@/i18n";

export interface BillingChangeResult {
  timing: string;
  effective_at: string;
  pending?: boolean;
  payment_status?: "pending" | "settled" | "processing";
  amount_paid?: string;
  amount_deferred?: string;
}

export function billingChangeMessage(result: BillingChangeResult, locale: Locale): string {
  const t = useT(locale).modules;
  if (result.pending || result.payment_status === "pending") return t.paymentNeedsAttention;
  if (result.payment_status !== "settled") return t.paymentPending;
  if (result.amount_deferred && /^\d+\.\d{2}$/.test(result.amount_deferred) && Number(result.amount_deferred) > 0)
    return t.paymentDeferred.replace("{amount}", result.amount_deferred);
  return t.changeConfirmed;
}
