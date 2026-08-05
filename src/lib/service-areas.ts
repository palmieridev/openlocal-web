import type { Business, LocationMode, ServiceArea } from "@/types/api";

/**
 * Location modes and service areas.
 *
 * A business either has premises customers come to (`fixed`), travels to the
 * customer (`mobile`), or does both (`hybrid`). A mobile business has **no
 * coordinates**, so it must never be drawn on the map; its reach is described
 * by service areas instead — geographies from a whole state down to a single
 * neighborhood.
 *
 * Everything here is pure so both the owner editor and the shopper filters can
 * share it and it stays testable.
 */

export const LOCATION_MODES = ["fixed", "mobile", "hybrid"] as const;

/** Default for payloads that predate location modes. */
export const DEFAULT_LOCATION_MODE: LocationMode = "fixed";

export interface LocationModeMeta {
  value: LocationMode;
  label: string;
  /** One-line explanation shown under the radio in the owner forms. */
  description: string;
  icon: string;
}

export const LOCATION_MODE_META: Record<LocationMode, LocationModeMeta> = {
  fixed: {
    value: "fixed",
    label: "Local fijo",
    description: "Tienes una dirección donde los clientes te visitan.",
    icon: "lucide:store",
  },
  mobile: {
    value: "mobile",
    label: "Negocio móvil",
    description: "No tienes local: das servicio en la ubicación del cliente.",
    icon: "lucide:truck",
  },
  hybrid: {
    value: "hybrid",
    label: "Local y servicio a domicilio",
    description: "Tienes local y además vas a la ubicación del cliente.",
    icon: "lucide:map-pinned",
  },
};

/** Coerce anything (form value, legacy payload) into a valid mode. */
export function normalizeLocationMode(value: unknown): LocationMode {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (LOCATION_MODES as readonly string[]).includes(candidate)
    ? (candidate as LocationMode)
    : DEFAULT_LOCATION_MODE;
}

/** Does this mode keep a physical address, coordinates and a map pin? */
export function hasFixedLocation(mode: LocationMode): boolean {
  return mode === "fixed" || mode === "hybrid";
}

/** Does this mode travel to the customer (and therefore need service areas)? */
export function servesAtCustomerLocation(mode: LocationMode): boolean {
  return mode === "mobile" || mode === "hybrid";
}

/**
 * Pickup requires premises: a mobile business can't offer "recoge en tienda".
 * Delivery stays a separate, still-valid option — shipping a package is not
 * the same as performing the service at the customer's address.
 */
export function allowsPickup(mode: LocationMode): boolean {
  return hasFixedLocation(mode);
}

/** Spanish label for the mode, used in badges and card chips. */
export function locationModeLabel(mode: LocationMode): string {
  return LOCATION_MODE_META[mode].label;
}

// ── Owner editor ────────────────────────────────────────────────────────────

/** One row of the service-area editor, before it becomes an API payload. */
export interface ServiceAreaFormRow {
  name: string;
  country: string;
  state: string;
  municipality: string;
  city: string;
  neighborhood: string;
  postal_code: string;
}

/** Mexico-first: the owner forms only ever ask for the narrower fields. */
export const DEFAULT_COUNTRY = "MX";
export const MAX_SERVICE_AREAS = 20;

export function emptyServiceAreaRow(country = DEFAULT_COUNTRY): ServiceAreaFormRow {
  return {
    name: "",
    country,
    state: "",
    municipality: "",
    city: "",
    neighborhood: "",
    postal_code: "",
  };
}

/** Trim every field; country is stored upper-case so "mx" and "MX" match. */
export function normalizeServiceAreaRow(row: Partial<ServiceAreaFormRow>): ServiceAreaFormRow {
  const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return {
    name: str(row.name),
    country: str(row.country).toUpperCase(),
    state: str(row.state),
    municipality: str(row.municipality),
    city: str(row.city),
    neighborhood: str(row.neighborhood),
    postal_code: str(row.postal_code),
  };
}

/**
 * A row the owner never filled in. The country is pre-filled by the editor, so
 * it doesn't count as content on its own — otherwise every blank row would look
 * like a real area.
 */
export function isBlankServiceAreaRow(row: Partial<ServiceAreaFormRow>): boolean {
  const normalized = normalizeServiceAreaRow(row);
  return !(
    normalized.name ||
    normalized.state ||
    normalized.municipality ||
    normalized.city ||
    normalized.neighborhood ||
    normalized.postal_code
  );
}

/** An API row → editor row (nulls become empty strings). */
export function serviceAreaToRow(area: ServiceArea): ServiceAreaFormRow {
  return normalizeServiceAreaRow({
    name: area.name ?? "",
    country: area.country ?? DEFAULT_COUNTRY,
    state: area.state ?? "",
    municipality: area.municipality ?? "",
    city: area.city ?? "",
    neighborhood: area.neighborhood ?? "",
    postal_code: area.postal_code ?? "",
  });
}

/** Editor rows for a business, always with at least one (blank) row to fill. */
export function serviceAreaRows(areas: ServiceArea[] | null | undefined): ServiceAreaFormRow[] {
  const rows = (areas ?? []).map(serviceAreaToRow);
  return rows.length > 0 ? rows : [emptyServiceAreaRow()];
}

/** Match the API's accent-insensitive search-key normalization. */
function searchKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Identity of an area for de-duplication (country+state+…, API-normalized). */
function areaKey(row: ServiceAreaFormRow): string {
  const geography = [row.country, row.state, row.municipality, row.city, row.neighborhood]
    .map(searchKey);
  const postalCode = row.postal_code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return [...geography, postalCode].join("|");
}

/** Drop repeated geographies, keeping the first (and its name). */
export function dedupeServiceAreaRows(rows: ServiceAreaFormRow[]): ServiceAreaFormRow[] {
  const seen = new Set<string>();
  const out: ServiceAreaFormRow[] = [];
  for (const row of rows.map(normalizeServiceAreaRow)) {
    const key = areaKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/**
 * Mirror of the API's row constraints, so owners get a readable message rather
 * than a relayed 400/500: a mobile or hybrid business needs at least one area,
 * and every filled row needs a country and a state. Blank rows are ignored —
 * the editor always keeps one around. Returns the first problem, or null.
 */
export function validateServiceAreas(
  rows: ServiceAreaFormRow[],
  mode: LocationMode,
): string | null {
  // A fixed business never sends its rows (see `serviceAreasFor`), so rows the
  // owner left behind when switching back must not block the save.
  if (!servesAtCustomerLocation(mode)) return null;

  const filled = rows.filter((row) => !isBlankServiceAreaRow(row)).map(normalizeServiceAreaRow);

  if (filled.length === 0) {
    return "Agrega al menos una zona de servicio (estado y, si aplica, municipio o colonia).";
  }
  if (filled.length > MAX_SERVICE_AREAS) {
    return `Puedes agregar hasta ${MAX_SERVICE_AREAS} zonas de servicio.`;
  }

  for (const [index, row] of filled.entries()) {
    const label = row.name || `Zona ${index + 1}`;
    if (!row.country) return `${label}: falta el país.`;
    if (!row.state) return `${label}: falta el estado.`;
    // Mirrors the API's own bounds; an unnamed row is labelled from its
    // geography before it is sent, so only a name the owner typed can fail.
    if (row.name && (row.name.length < AREA_NAME_MIN || row.name.length > AREA_NAME_MAX)) {
      return `${label}: el nombre de la zona debe tener entre ${AREA_NAME_MIN} y ${AREA_NAME_MAX} caracteres.`;
    }
  }
  return null;
}

/** API bounds on `service_areas.name`. */
export const AREA_NAME_MIN = 2;
export const AREA_NAME_MAX = 120;

/**
 * Every area needs a name the API will accept — it answers
 * `service_areas.name must be between 2 and 120 characters` for a missing,
 * null or one-character name. Naming a zone is optional for the owner, so an
 * unnamed row is labelled from the geography it covers.
 */
export function serviceAreaRowName(row: ServiceAreaFormRow): string {
  const derived =
    row.name ||
    [row.neighborhood, row.city || row.municipality, row.state].filter(Boolean).join(", ") ||
    (row.postal_code ? `CP ${row.postal_code}` : "");
  const name = derived.slice(0, AREA_NAME_MAX);
  return name.length >= AREA_NAME_MIN ? name : "Zona de servicio";
}

/**
 * Editor rows → the `service_areas` array sent with POST/PATCH /businesses.
 *
 * Blank rows are dropped and duplicates collapsed; every optional geography
 * that was left empty is sent as `null`, never `""`, because the API stores
 * these as nullable text and an empty string would read as "covers the area
 * whose city is the empty string". `name` is always sent — see above.
 */
/**
 * The `service_areas` a save should carry for a mode. A fixed business has no
 * coverage, so it always sends `[]` — otherwise rows left over from a previous
 * mobile spell would keep advertising a reach the business no longer offers.
 */
export function serviceAreasFor(rows: ServiceAreaFormRow[], mode: LocationMode): ServiceArea[] {
  return servesAtCustomerLocation(mode) ? buildServiceAreasPayload(rows) : [];
}

export function buildServiceAreasPayload(rows: ServiceAreaFormRow[]): ServiceArea[] {
  return dedupeServiceAreaRows(rows.filter((row) => !isBlankServiceAreaRow(row))).map((row) => ({
    name: serviceAreaRowName(row),
    country: row.country || DEFAULT_COUNTRY,
    state: row.state,
    municipality: row.municipality || null,
    city: row.city || null,
    neighborhood: row.neighborhood || null,
    postal_code: row.postal_code || null,
  }));
}

// ── Display ─────────────────────────────────────────────────────────────────

const cleaned = (value: string | null | undefined) => (value ?? "").trim();

/**
 * Human label for one area, narrowest-first: "Roma Norte, Cuauhtémoc, CDMX".
 * The owner's own name wins when they gave one. Empty when the row is empty.
 */
export function serviceAreaLabel(area: ServiceArea): string {
  const name = cleaned(area.name);
  if (name) return name;
  const parts = [
    cleaned(area.neighborhood),
    cleaned(area.city),
    // Municipality repeats the city often enough that showing both reads badly.
    cleaned(area.city) ? "" : cleaned(area.municipality),
    cleaned(area.state),
  ].filter(Boolean);
  const postal = cleaned(area.postal_code);
  if (parts.length === 0) return postal ? `CP ${postal}` : "";
  return postal ? `${parts.join(", ")} (CP ${postal})` : parts.join(", ");
}

/** Labels for a whole coverage list, blanks removed and duplicates collapsed. */
export function serviceAreaLabels(areas: ServiceArea[] | null | undefined): string[] {
  const labels = (areas ?? []).map(serviceAreaLabel).filter(Boolean);
  return [...new Set(labels)];
}

/**
 * One-line coverage summary for cards: "Roma Norte, CDMX · Condesa, CDMX +2".
 * `max` caps how many areas are spelled out before the overflow counter.
 */
export function formatServiceAreas(
  areas: ServiceArea[] | null | undefined,
  max = 2,
): string {
  const labels = serviceAreaLabels(areas);
  if (labels.length === 0) return "";
  const shown = labels.slice(0, max);
  const rest = labels.length - shown.length;
  return rest > 0 ? `${shown.join(" · ")} +${rest}` : shown.join(" · ");
}

/** Mode of a business payload, tolerant of the field being absent. */
export function businessLocationMode(
  business: Pick<Business, "location_mode"> | null | undefined,
): LocationMode {
  return normalizeLocationMode(business?.location_mode);
}

/**
 * Should this business get a map pin? Only when it has a fixed location *and*
 * real coordinates — a mobile business without premises must never be plotted
 * at an invented point.
 */
export function hasMapPin(business: Business | null | undefined): boolean {
  if (!business) return false;
  if (!hasFixedLocation(businessLocationMode(business))) return false;
  const lat = Number(business.latitude);
  const lng = Number(business.longitude);
  return Boolean(business.latitude) && Boolean(business.longitude) && !Number.isNaN(lat) && !Number.isNaN(lng);
}
