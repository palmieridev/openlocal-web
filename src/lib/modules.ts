import { interpolate, intlLocale, useT, type Locale } from "@/i18n";
import type { ModuleRequest, RequestStatus } from "@/types/modules";

export const terminalStatuses: RequestStatus[] = [
  "completed",
  "collected",
  "cancelled",
  "rejected",
  "expired",
  "no_show",
  "uncollected",
];

function scaledDecimal(value: string, digits: number): bigint {
  if (!new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`).test(value)) throw new Error("invalid_decimal");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** BigInt(digits) + BigInt(fraction.padEnd(digits, "0"));
}

export function validQuantity(value: string, minimum: string, maximum: string, step: string): boolean {
  try {
    const quantity = scaledDecimal(value, 3), min = scaledDecimal(minimum, 3), max = scaledDecimal(maximum, 3), increment = scaledDecimal(step, 3);
    return quantity === 0n || (increment > 0n && quantity >= min && quantity <= max && (quantity - min) % increment === 0n);
  } catch { return false; }
}

export function sumAmounts(...values: string[]): string {
  const cents = values.reduce((sum, value) => sum + scaledDecimal(value, 2), 0n);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

/** Decimal arithmetic used for display only. API calculates authoritative totals. */
export function decimalTotal(quantity: string, price: string): string {
  const scaled = (s: string, precision: number) => {
    if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("invalid_decimal");
    const [whole, fraction = ""] = s.split(".");
    return (
      BigInt(whole) * 10n ** BigInt(precision) +
      BigInt(fraction.padEnd(precision, "0").slice(0, precision))
    );
  };
  const cents = (scaled(quantity, 3) * scaled(price, 2) + 500n) / 1000n;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}
export function formatModuleDate(
  value: string | undefined,
  timezone: string,
  locale: Locale,
): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}
export function moduleError(body: unknown, locale: Locale): string {
  const errors = useT(locale).modules.errors;
  const code =
    body && typeof body === "object" && "code" in body ? String(body.code) : "";
  return code in errors
    ? errors[code as keyof typeof errors]
    : useT(locale).modules.unavailable;
}
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[\s()+.-]/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
export function whatsappLink(
  phone: string | null | undefined,
  message: string,
): string | null {
  const digits = normalizePhone(phone ?? "");
  return digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : null;
}
export function requestSummary(record: ModuleRequest, locale: Locale): string {
  const details =
    record.module === "appointments"
      ? (record.service_name ?? "")
      : (record.items ?? [])
          .map((i) => `${i.quantity} ${i.unit} ${i.name}`)
          .join(", ");
  const t = useT(locale).modules;
  const amount = record.final_total
    ? `${t.finalAmount}: $${record.final_total} MXN`
    : record.estimated_total
      ? `${t.estimate}: $${record.estimated_total} MXN`
      : "";
  return `${details} · ${formatModuleDate(record.starts_at, record.timezone, locale)}${amount ? ` · ${amount}` : ""}`;
}
/** Explicit field allowlist prevents private recovery credentials entering merchant messages. */
export function requestWhatsApp(
  record: ModuleRequest,
  locale: Locale,
  owner = false,
): string | null {
  const t = useT(locale).modules;
  return whatsappLink(
    owner ? record.customer_phone : record.business?.whatsapp,
    interpolate(owner ? t.whatsapp.owner : t.whatsapp.customer, {
      name: record.customer_name,
      reference: record.reference,
      summary: requestSummary(record, locale),
      status: t.statuses[record.status],
    }),
  );
}
export function appointmentICS(record: ModuleRequest): string {
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");
  const stamp = (s: string) =>
    new Date(s)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Openlocal//Appointments//EN",
    "BEGIN:VEVENT",
    `UID:${escape(record.public_id)}@openlocal`,
    `DTSTAMP:${stamp(record.created_at)}`,
    `DTSTART:${stamp(record.starts_at!)}`,
    `DTEND:${stamp(record.ends_at!)}`,
    `SUMMARY:${escape(record.service_name ?? record.reference)}`,
    `DESCRIPTION:${escape(record.reference)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
