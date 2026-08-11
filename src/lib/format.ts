import type { NullString, PublicStockStatus } from "@/types/api";
import { DEFAULT_LOCALE, intlLocale, useT, type Locale } from "@/i18n";

/**
 * Locale only changes grouping and currency-symbol placement — prices stay in
 * MXN either way ("$1,234" in es-MX, "MX$1,234" in en-US).
 */
const formatters = new Map<string, Intl.NumberFormat>();
function currencyFormatter(locale: Locale, currency: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "MXN" ? 0 : undefined,
      maximumFractionDigits: 2,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Format a decimal-string or number price as MXN ($1,234). */
export function formatPrice(
  value: string | number | undefined | null,
  currency = "MXN",
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (value === undefined || value === null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return currencyFormatter(locale, currency).format(n);
}

/** Human distance in km ("1.2 km"), or empty when unknown. */
export function formatDistance(km: number | undefined | null): string {
  if (km === undefined || km === null || Number.isNaN(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Coerce a possibly-NullString value (raw sqlc row) to a plain string. */
export function text(value: string | NullString | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value.Valid ? value.String : "";
}

export interface StockMeta {
  label: string;
  /** Tailwind tokens for the badge background + foreground. */
  bg: string;
  fg: string;
  dot: string;
}

/** Localized label + warm-palette colors for a public stock status. */
export function stockMeta(
  status: PublicStockStatus | string | undefined,
  locale: Locale = DEFAULT_LOCALE,
): StockMeta {
  const t = useT(locale).stock;
  switch (status) {
    case "in_stock":
    case "available":
      return { label: t.inStock, bg: "bg-success-soft", fg: "text-success", dot: "bg-success" };
    case "low_stock":
      return { label: t.lowStock, bg: "bg-warning-soft", fg: "text-warning", dot: "bg-warning" };
    case "out_of_stock":
      return { label: t.outOfStock, bg: "bg-danger-soft", fg: "text-danger", dot: "bg-danger" };
    case "made_to_order":
      return { label: t.madeToOrder, bg: "bg-accent-soft", fg: "text-accent", dot: "bg-accent" };
    default:
      return { label: t.unknown, bg: "bg-surface-secondary", fg: "text-text-muted", dot: "bg-text-muted" };
  }
}

/** Title-case a business_type slug for display ("artesanias" -> "Artesanías" is data-side; here just tidy). */
export function humanize(slug: string | undefined): string {
  if (!slug) return "";
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
