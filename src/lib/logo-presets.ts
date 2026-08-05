/**
 * Procedural logo presets.
 *
 * Owners without a logo of their own can pick a generated mark instead of
 * leaving the placeholder. Presets are drawn in the browser from the business
 * type's lucide icon (or the name's initials) over brand-token colours, then
 * rasterised and pushed through the same Clerk `setLogo` path as an uploaded
 * photo — so downstream nothing can tell the two apart, and nothing needs to be
 * stored or hosted for them.
 *
 * The data here is deliberately static: a preset set is versioned design
 * config, not user data.
 */

/** Brand-token colour pairs. Values mirror `@theme` in src/styles/global.css. */
export interface LogoPalette {
  id: string;
  /** Tile background. */
  bg: string;
  /** Icon stroke / monogram fill. */
  fg: string;
}

export const LOGO_PALETTES: LogoPalette[] = [
  { id: "accent", bg: "#7d6b3d", fg: "#f5f2e9" },
  { id: "soft", bg: "#efe7d2", fg: "#7d6b3d" },
  { id: "ink", bg: "#2d2926", fg: "#f5f2e9" },
];

/**
 * Business type → lucide icon. Keys match the options offered at onboarding;
 * `business_type` is free text API-side, so unknown values fall back.
 */
export const BUSINESS_TYPE_ICONS: Record<string, string> = {
  retail: "lucide:store",
  artesanias: "lucide:palette",
  comida: "lucide:utensils",
  servicios: "lucide:wrench",
  moda: "lucide:shirt",
  belleza: "lucide:sparkles",
  hogar: "lucide:house",
  otro: "lucide:store",
};

export const FALLBACK_LOGO_ICON = "lucide:store";

/** Icon for a business type, falling back for unknown/legacy values. */
export function iconForBusinessType(businessType?: string | null): string {
  if (!businessType) return FALLBACK_LOGO_ICON;
  return BUSINESS_TYPE_ICONS[businessType.trim().toLowerCase()] ?? FALLBACK_LOGO_ICON;
}

/**
 * Up to two initials for the monogram tiles.
 *
 * Skips the small connecting words Mexican business names are full of ("Casa
 * de Pan" → "CP", not "CD"), and falls back to the first two letters of a
 * single word so a one-word name still yields a balanced mark.
 */
const MONOGRAM_STOPWORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en"]);

export function initialsFor(name: string): string {
  const words = name
    .normalize("NFD")
    // Drop combining accents so "Ñ"/"Á" render predictably at large sizes.
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s._-]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0);

  const meaningful = words.filter((word) => !MONOGRAM_STOPWORDS.has(word.toLowerCase()));
  const source = meaningful.length > 0 ? meaningful : words;

  if (source.length === 0) return "OL";
  if (source.length === 1) return source[0].slice(0, 2).toUpperCase();
  return (source[0][0] + source[1][0]).toUpperCase();
}

export type LogoPresetKind = "icon" | "monogram";

export interface LogoPreset {
  id: string;
  kind: LogoPresetKind;
  palette: LogoPalette;
  /** Icon name for `kind: "icon"`. */
  icon: string;
  /** Monogram text for `kind: "monogram"`. */
  initials: string;
}

/**
 * The options shown in the picker: the type's icon and the name's monogram,
 * each in every palette.
 */
export function presetsFor(businessType?: string | null, name = ""): LogoPreset[] {
  const icon = iconForBusinessType(businessType);
  const initials = initialsFor(name);
  const presets: LogoPreset[] = [];
  for (const kind of ["icon", "monogram"] as LogoPresetKind[]) {
    for (const palette of LOGO_PALETTES) {
      presets.push({ id: `${kind}-${palette.id}`, kind, palette, icon, initials });
    }
  }
  return presets;
}

/** Encoded logo size. Square; Clerk renders org images small but stores the file. */
export const LOGO_PRESET_SIZE = 512;
