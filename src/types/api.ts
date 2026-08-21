/**
 * TypeScript projections of the Openlocal API response shapes.
 *
 * Derived from the Go DTOs in `openlocal-api` (internal/<module>/dto.go) and the sqlc
 * rows returned by the marketplace/public handlers. The published openapi.yaml
 * only lists paths, not schemas, so these types are the contract we maintain by
 * hand until the API ships a richer spec.
 */

/** Public stock signal the storefront/marketplace may surface. */
export type PublicStockStatus =
  | "available"
  | "low_stock"
  | "out_of_stock"
  | "made_to_order"
  | "unknown";

/** Some raw sqlc rows serialize nullable text as Go's sql.NullString. */
export interface NullString {
  String: string;
  Valid: boolean;
}

/**
 * How a business reaches its customers.
 *
 * - `fixed`  — a physical address customers come to (the historical default).
 * - `mobile` — no premises: the business travels to the customer. Every fixed
 *   location field (address/city/coords) may be null; coverage lives in
 *   `service_areas`, so a mobile business must never get a map pin.
 * - `hybrid` — both: a physical address **and** service areas it travels to.
 */
export type LocationMode = "fixed" | "mobile" | "hybrid";

/**
 * One geography a mobile/hybrid business covers.
 *
 * `country` and `state` are always present on a valid row; everything narrower
 * is optional and may be null, so an area can be as broad as a whole state or
 * as narrow as one neighborhood.
 */
export interface ServiceArea {
  /** Owner-facing label ("Zona centro"); required by the API. */
  name: string;
  country: string;
  state: string;
  municipality?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  postal_code?: string | null;
}

/** A business profile. Private fields are only present on authorized reads. */
export interface Business {
  id: string;
  clerk_org_id?: string;
  name: string;
  slug: string;
  description: string;
  business_type: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  cover_image_url?: string;
  status?: string;
  /**
   * Fixed-location fields. All nullable: a `mobile` business has no premises,
   * so it stores none of them.
   */
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  /** Defaults to "fixed" when an older payload omits it. */
  location_mode?: LocationMode;
  /** Always an array on responses; empty for a purely fixed business. */
  service_areas?: ServiceArea[];
  pickup_available: boolean;
  delivery_available: boolean;
  /** IANA zone the opening hours are expressed in (e.g. "America/Mexico_City"). */
  timezone?: string;
  /** Present on public payloads. Empty array means "no hours set" (unknown). */
  hours?: BusinessHour[];
  created_at?: string;
  updated_at?: string;
}

/**
 * One day of a business's weekly schedule.
 *
 * `day_of_week` is **0 = Monday … 6 = Sunday**. Times are "HH:MM" strings in the
 * business's own timezone, and are null when `is_closed`. An overnight span
 * (opens_at 22:00 → closes_at 02:00) is legal and must be handled by callers.
 */
export interface BusinessHour {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

/** Owner-facing hours payload (GET/PUT /businesses/:id/hours). */
export interface BusinessHours {
  timezone: string;
  hours: BusinessHour[];
}

/** Private catalog product. */
export interface Product {
  id: string;
  business_id?: string;
  category_id?: string;
  name: string;
  slug: string;
  description: string;
  brand?: string;
  unit: string;
  product_type: string;
  is_handmade?: boolean;
  /**
   * Master storefront switch. A product only reaches the storefront when this
   * is true **and** at least one of its variants is public.
   */
  is_public?: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

/** Private product variant (price/cost are decimal strings). */
export interface Variant {
  id: string;
  product_id: string;
  business_id?: string;
  sku: string;
  barcode?: string;
  internal_code?: string;
  name: string;
  attributes?: Record<string, unknown>;
  /**
   * Long-form explanation of this variant (materials, medidas, acabados).
   * Nullable on the API, and absent from older payloads — always coerce.
   */
  description?: string | null;
  /**
   * Short caveat shown next to the price ("El precio final depende de medidas
   * y acabados"). Nullable, same handling as `description`.
   */
  price_note?: string | null;
  /**
   * Storefront image, owned by the variant. On writes: omit (or send null) to
   * leave the current image alone, send "" to remove it — the API can't tell an
   * omitted field from an explicit null, so it treats both as "unchanged".
   */
  image_url?: string | null;
  price: string;
  cost?: string;
  currency: string;
  /**
   * Storefront visibility of this variant's card. The column is
   * `NOT NULL DEFAULT true`, so an absent value means "visible" — older
   * payloads omit it. It is ANDed with the product's own `is_public`:
   * `visible = product.is_public && variant.is_public`. Read it through
   * `variantIsPublic()` in `src/lib/variants.ts`, never directly.
   */
  is_public?: boolean;
  track_inventory?: boolean;
  public_stock_status: PublicStockStatus;
  reorder_point?: string;
  lead_time_days?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

/** A product row on a public storefront (no cost/stock leakage). */
export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand?: string | null;
  unit: string;
  product_type: string;
  variant_id: string;
  sku: string;
  variant_name: string;
  /** Variant-level detail; null/absent when the owner left it empty. */
  variant_description?: string | null;
  price: string;
  /** Short caveat rendered beside the price. Null/absent when unset. */
  price_note?: string | null;
  currency: string;
  public_stock_status: PublicStockStatus;
  image_url?: string | null;
}

/**
 * A marketplace search hit. Returned as a raw sqlc row, so nullable text may
 * arrive as a NullString object and the business is denormalized onto the row.
 */
export interface MarketplaceProduct {
  business_slug: string;
  business_name: string;
  id: string;
  name: string;
  slug: string;
  description: string;
  brand?: string | NullString | null;
  unit: string;
  product_type: string;
  variant_id: string;
  sku: string;
  variant_name: string;
  /** Raw sqlc row, so this may arrive as a NullString. */
  variant_description?: string | NullString | null;
  price: string;
  price_note?: string | NullString | null;
  currency: string;
  public_stock_status: PublicStockStatus;
  image_url?: string | null;
}

/** The authenticated user projection from GET /api/v1/me. */
export interface Me {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

/** Lat/lng bounding box for map-driven marketplace queries. */
export interface BBox {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

export type MovementType =
  | "IN_PURCHASE"
  | "IN_PRODUCTION"
  | "OUT_SALE"
  | "OUT_ADJUSTMENT"
  | "IN_ADJUSTMENT"
  | "OUT_LOSS";

/**
 * Stock-level / movement / analytics endpoints return raw sqlc rows (snake_case
 * json tags, decimals as strings). Exact columns are maintained loosely; known
 * fields are typed and an index signature covers the rest.
 */
export interface StockLevel {
  variant_id: string;
  sku?: string;
  product_name?: string;
  variant_name?: string;
  quantity_on_hand: string;
  reorder_point?: string;
  location_id?: string;
  [key: string]: unknown;
}

export interface StockMovement {
  id: string;
  variant_id: string;
  movement_type: MovementType | string;
  quantity: string;
  unit_cost?: string | null;
  notes?: string;
  reference_type?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface ABCRow {
  product_id: string;
  name: string;
  value: string;
  total_value: string;
  cumulative_value: string;
  class: "A" | "B" | "C" | string;
  /** Legacy fields retained while older API deployments are still reachable. */
  variant_id?: string;
  sku?: string;
  product_name?: string;
  variant_name?: string;
  sales_value?: string;
  cumulative_percent?: string;
  abc_class?: "A" | "B" | "C" | string;
  quantity_on_hand?: string;
  [key: string]: unknown;
}

export interface LowStockRow {
  variant_id: string;
  product_id?: string;
  name?: string;
  sku?: string;
  product_name?: string;
  variant_name?: string;
  quantity_on_hand: string;
  reorder_point: string;
  [key: string]: unknown;
}

export interface EOQResult {
  variant_id: string;
  period_days: number;
  demand: string;
  estimated_eoq: string;
  order_cost: string;
  holding_cost_rate: string;
}

/** Response of POST /api/v1/inventory/movements. */
export interface MovementResult {
  movement: StockMovement;
  stock_level: StockLevel;
}
