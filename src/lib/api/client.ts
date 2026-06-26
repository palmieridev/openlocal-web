import { PUBLIC_API_BASE_URL } from "astro:env/client";
import type {
  Business,
  MarketplaceProduct,
  PublicProduct,
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

export interface ListBusinessesParams {
  city?: string;
  bbox?: { min_lat: number; max_lat: number; min_lng: number; max_lng: number };
  limit?: number;
  offset?: number;
}

export interface SearchProductsParams {
  q?: string;
  limit?: number;
  offset?: number;
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
            city: params.city,
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
