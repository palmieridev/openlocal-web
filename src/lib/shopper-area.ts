import type { AreaParams } from "@/lib/api/client";
import { DEFAULT_COUNTRY } from "@/lib/service-areas";

/**
 * The shopper's own area — "where do you want to be served?".
 *
 * It is held in the URL (so a filtered marketplace is linkable and survives a
 * reload) and filled either from the browser's geolocation, reverse-geocoded,
 * or by hand. The reverse lookup is best-effort: the fields stay editable so a
 * wrong or missing guess never traps the shopper.
 */

export const SHOPPER_AREA_KEYS = [
  "country",
  "state",
  "municipality",
  "city",
  "neighborhood",
  "postal_code",
] as const;

export type ShopperAreaKey = (typeof SHOPPER_AREA_KEYS)[number];

export type ShopperArea = Record<ShopperAreaKey, string>;

export function emptyShopperArea(): ShopperArea {
  return {
    country: "",
    state: "",
    municipality: "",
    city: "",
    neighborhood: "",
    postal_code: "",
  };
}

/** Trim everything; country upper-cased so "mx" and "MX" hit the same rows. */
export function normalizeShopperArea(area: Partial<ShopperArea>): ShopperArea {
  const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return {
    country: str(area.country).toUpperCase(),
    state: str(area.state),
    municipality: str(area.municipality),
    city: str(area.city),
    neighborhood: str(area.neighborhood),
    postal_code: str(area.postal_code),
  };
}

/**
 * Nothing to filter by. A bare country doesn't count: it's the default the form
 * pre-fills, and filtering the whole marketplace down to "México" is a no-op.
 */
export function isShopperAreaEmpty(area: Partial<ShopperArea>): boolean {
  const normalized = normalizeShopperArea(area);
  return !(
    normalized.state ||
    normalized.municipality ||
    normalized.city ||
    normalized.neighborhood ||
    normalized.postal_code
  );
}

/** Read the area out of a page URL's query string. */
export function parseShopperArea(params: URLSearchParams): ShopperArea {
  const area = emptyShopperArea();
  for (const key of SHOPPER_AREA_KEYS) {
    area[key] = params.get(key) ?? "";
  }
  return normalizeShopperArea(area);
}

/**
 * Area → marketplace request params. Empty fields are dropped so the API sees
 * only the geographies the shopper actually chose. An area with no narrowing
 * field at all sends nothing, keeping the unfiltered marketplace.
 */
export function shopperAreaQuery(area: Partial<ShopperArea>): AreaParams {
  const normalized = normalizeShopperArea(area);
  if (isShopperAreaEmpty(normalized)) return {};
  const query: AreaParams = {};
  for (const key of SHOPPER_AREA_KEYS) {
    if (normalized[key]) query[key] = normalized[key];
  }
  return query;
}

/** Area → URL search params, merged onto whatever the page already carries. */
export function shopperAreaSearchParams(
  area: Partial<ShopperArea>,
  base?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(base);
  const normalized = normalizeShopperArea(area);
  const empty = isShopperAreaEmpty(normalized);
  for (const key of SHOPPER_AREA_KEYS) {
    // Wiping the area clears the country too, so the "no filter" URL is clean.
    if (empty || !normalized[key]) params.delete(key);
    else params.set(key, normalized[key]);
  }
  return params;
}

/** Narrowest-first label for the chip: "Roma Norte, Cuauhtémoc, CDMX". */
export function shopperAreaLabel(area: Partial<ShopperArea>): string {
  const normalized = normalizeShopperArea(area);
  const parts = [
    normalized.neighborhood,
    normalized.city,
    normalized.city ? "" : normalized.municipality,
    normalized.state,
  ].filter(Boolean);
  if (parts.length === 0) return normalized.postal_code ? `CP ${normalized.postal_code}` : "";
  return normalized.postal_code
    ? `${parts.join(", ")} (CP ${normalized.postal_code})`
    : parts.join(", ");
}

/** The `address` object Nominatim returns from a reverse lookup. */
export interface NominatimAddress {
  country_code?: string;
  country?: string;
  state?: string;
  region?: string;
  county?: string;
  municipality?: string;
  city?: string;
  town?: string;
  village?: string;
  city_district?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  postcode?: string;
  [key: string]: unknown;
}

/**
 * Nominatim address → shopper area. OSM is inconsistent about which key holds
 * a Mexican municipio or colonia, so each field falls back through the aliases
 * we actually see. Anything it can't resolve is left blank for the shopper to
 * type; the country falls back to MX because that's the marketplace's scope.
 */
export function shopperAreaFromNominatim(address: NominatimAddress | null | undefined): ShopperArea {
  const a = address ?? {};
  const pick = (...values: unknown[]) =>
    values.find((value) => typeof value === "string" && value.trim()) as string | undefined;

  const country = pick(a.country_code)?.toUpperCase() || DEFAULT_COUNTRY;
  const city = pick(a.city, a.town, a.village);
  const municipality = pick(a.municipality, a.county, a.city_district);

  return normalizeShopperArea({
    country,
    state: pick(a.state, a.region) ?? "",
    // Don't repeat the city as the municipality — it reads as a duplicate.
    municipality: municipality && municipality !== city ? municipality : "",
    city: city ?? "",
    neighborhood: pick(a.neighbourhood, a.suburb, a.quarter) ?? "",
    postal_code: pick(a.postcode) ?? "",
  });
}
