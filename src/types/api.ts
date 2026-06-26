/**
 * TypeScript projections of the Openlocal API response shapes.
 *
 * Derived from the Go DTOs in `openlocal-api` (internal/*/dto.go) and the sqlc
 * rows returned by the marketplace/public handlers. The published openapi.yaml
 * only lists paths, not schemas, so these types are the contract we maintain by
 * hand until the API ships a richer spec.
 */

/** Public stock signal the storefront/marketplace may surface. */
export type PublicStockStatus =
  | "in_stock"
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
