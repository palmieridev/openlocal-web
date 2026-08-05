import { PUBLIC_API_BASE_URL } from "astro:env/client";
import type {
  ABCRow,
  Business,
  BusinessHours,
  LowStockRow,
  MarketplaceProduct,
  Product,
  PublicProduct,
  StockLevel,
  StockMovement,
  Variant,
} from "@/types/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = PUBLIC_API_BASE_URL.replace(/\/$/, "");

type Query = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Core request. Throws ApiError on non-2xx. Pass `token` for private routes
 * (Clerk session JWT for the active organization).
 */
export async function apiFetch<T>(
  path: string,
  opts: { query?: Query; token?: string; init?: RequestInit } = {},
): Promise<T> {
  const url = `${BASE}${withQuery(path, opts.query)}`;
  const headers = new Headers(opts.init?.headers);
  headers.set("Accept", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);
  if (opts.init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...opts.init, headers });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, `API ${res.status} on ${path}`, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Run a request that may fail and fall back to a default (logs the error). */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return fallback;
    console.warn("[openlocal-api]", err instanceof Error ? err.message : err);
    return fallback;
  }
}

/**
 * Geography filter shared by the marketplace endpoints. Every field is
 * optional and narrows the result: a mobile business matches when one of its
 * service areas covers the requested geography, a fixed one when its own
 * address does.
 */
export interface AreaParams {
  country?: string;
  state?: string;
  municipality?: string;
  city?: string;
  neighborhood?: string;
  postal_code?: string;
}

export interface ListBusinessesParams extends AreaParams {
  bbox?: { min_lat: number; max_lat: number; min_lng: number; max_lng: number };
  limit?: number;
  offset?: number;
}

export interface SearchProductsParams extends AreaParams {
  q?: string;
  limit?: number;
  offset?: number;
}

/** Pick just the geography keys, so callers can spread a wider params object. */
function areaQuery(params: AreaParams): AreaParams {
  return {
    country: params.country,
    state: params.state,
    municipality: params.municipality,
    city: params.city,
    neighborhood: params.neighborhood,
    postal_code: params.postal_code,
  };
}

/**
 * Public marketplace/storefront endpoints (no auth). These swallow errors and
 * return empty results so pages can render their empty states instead of 500s.
 */
export const publicApi = {
  listBusinesses(params: ListBusinessesParams = {}): Promise<Business[]> {
    return safe(
      () =>
        apiFetch<Business[]>("/api/v1/marketplace/businesses", {
          query: {
            ...areaQuery(params),
            limit: params.limit ?? 25,
            offset: params.offset ?? 0,
            ...params.bbox,
          },
        }),
      [],
    );
  },

  searchProducts(params: SearchProductsParams = {}): Promise<MarketplaceProduct[]> {
    return safe(
      () =>
        apiFetch<MarketplaceProduct[]>("/api/v1/marketplace/search", {
          query: {
            q: params.q,
            ...areaQuery(params),
            limit: params.limit ?? 25,
            offset: params.offset ?? 0,
          },
        }),
      [],
    );
  },

  getBusiness(slug: string): Promise<Business | null> {
    return safe(
      () => apiFetch<Business>(`/api/v1/public/businesses/${encodeURIComponent(slug)}`),
      null,
    );
  },

  getBusinessProducts(slug: string): Promise<PublicProduct[]> {
    return safe(
      () =>
        apiFetch<PublicProduct[]>(
          `/api/v1/public/businesses/${encodeURIComponent(slug)}/products`,
        ),
      [],
    );
  },
};

/**
 * Business-scoped reads for the owner dashboard. Requires a Clerk org token and
 * the business id. Methods throw ApiError; callers (SSR pages) handle failures.
 */
/** API caps list endpoints at limit=100; clamp so callers can't trigger a 400. */
const MAX_LIMIT = 100;
const clampLimit = (n: number) => Math.min(Math.max(Math.trunc(n), 1), MAX_LIMIT);

export function authedApi(token: string, businessId: string) {
  const scoped = <T>(path: string, extra?: Query) =>
    apiFetch<T>(path, { token, query: { business_id: businessId, ...extra } });

  return {
    getBusiness: () => apiFetch<Business>(`/api/v1/businesses/${businessId}`, { token }),
    getHours: () => apiFetch<BusinessHours>(`/api/v1/businesses/${businessId}/hours`, { token }),
    listProducts: (limit = 100, offset = 0) =>
      scoped<Product[]>("/api/v1/products", { limit: clampLimit(limit), offset }),
    getProduct: (id: string) =>
      apiFetch<Product>(`/api/v1/products/${id}`, { token, query: { business_id: businessId } }),
    listProductVariants: (productId: string) =>
      apiFetch<Variant[]>(`/api/v1/products/${productId}/variants`, {
        token,
        query: { business_id: businessId },
      }),
    listStockLevels: (limit = 100, offset = 0) =>
      scoped<StockLevel[]>("/api/v1/inventory/stock-levels", { limit: clampLimit(limit), offset }),
    listMovements: (limit = 50, offset = 0) =>
      scoped<StockMovement[]>("/api/v1/inventory/movements", { limit: clampLimit(limit), offset }),
    abc: (limit = 100, offset = 0) =>
      scoped<ABCRow[]>("/api/v1/analytics/abc", { limit: clampLimit(limit), offset }),
    lowStock: (limit = 100, offset = 0) =>
      scoped<LowStockRow[]>("/api/v1/analytics/low-stock", { limit: clampLimit(limit), offset }),
  };
}
