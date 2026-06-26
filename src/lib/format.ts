import type { NullString, PublicStockStatus } from "@/types/api";

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format a decimal-string or number price as MXN ($1,234). */
export function formatPrice(value: string | number | undefined | null, currency = "MXN"): string {
  if (value === undefined || value === null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  if (currency !== "MXN") {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  }
  return mxn.format(n);
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

/** Spanish label + warm-palette colors for a public stock status. */
export function stockMeta(status: PublicStockStatus | string | undefined): StockMeta {
  switch (status) {
    case "in_stock":
      return { label: "En stock", bg: "bg-success-soft", fg: "text-success", dot: "bg-success" };
    case "low_stock":
      return { label: "Pocas piezas", bg: "bg-warning-soft", fg: "text-warning", dot: "bg-warning" };
    case "out_of_stock":
      return { label: "Agotado", bg: "bg-danger-soft", fg: "text-danger", dot: "bg-danger" };
    case "made_to_order":
      return { label: "Bajo pedido", bg: "bg-accent-soft", fg: "text-accent", dot: "bg-accent" };
    default:
      return { label: "Consultar", bg: "bg-surface-secondary", fg: "text-text-muted", dot: "bg-text-muted" };
  }
}

/** Title-case a business_type slug for display ("artesanias" -> "Artesanías" is data-side; here just tidy). */
export function humanize(slug: string | undefined): string {
  if (!slug) return "";
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
