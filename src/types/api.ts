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
  address?: string;
  neighborhood?: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  latitude?: string;
  longitude?: string;
  pickup_available: boolean;
  delivery_available: boolean;
  created_at?: string;
  updated_at?: string;
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
  price: string;
  cost?: string;
  currency: string;
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
  price: string;
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
  price: string;
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
  variant_id: string;
  sku?: string;
  product_name?: string;
  variant_name?: string;
  sales_value?: string;
  total_value?: string;
  cumulative_percent?: string;
  abc_class?: "A" | "B" | "C" | string;
  quantity_on_hand?: string;
  [key: string]: unknown;
}

export interface LowStockRow {
  variant_id: string;
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
