import { es, type Dict } from "./es";
import { en } from "./en";

/**
 * i18n runtime.
 *
 * Routing model: the **URL is authoritative**. Spanish (the default) lives at
 * the bare path (`/marketplace`), English at a prefixed one (`/en/marketplace`).
 * `src/middleware.ts` strips the prefix, records the locale on
 * `Astro.locals.locale` and rewrites to the single (unprefixed) page file — so
 * there is exactly one route file per page, not one per locale.
 *
 * The `ol_lang` cookie only *remembers* a manual choice for the landing
 * redirect; it never changes what a given URL renders. Cookie-driven content
 * would need `Vary: Cookie` and would poison the CDN cache.
 */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** Remembers a manual language choice (see `LocaleSwitcher.astro`). */
export const LOCALE_COOKIE = "ol_lang";

const dictionaries: Record<Locale, Dict> = { es, en };

/** BCP-47 tags for `Intl` formatters — the app is peso-priced either way. */
const intlTags: Record<Locale, string> = { es: "es-MX", en: "en-US" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The dictionary for a locale (falls back to the default for unknown input). */
export function useT(locale: Locale | string | undefined): Dict {
  return dictionaries[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

/** BCP-47 tag to hand to `Intl.NumberFormat` / `Intl.DateTimeFormat`. */
export function intlLocale(locale: Locale | string | undefined): string {
  return intlTags[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

/**
 * Prefix an internal path for a locale. External URLs, `mailto:` and anchors
 * are returned untouched so it is safe to wrap every `href`.
 */
export function localePath(locale: Locale | string | undefined, href: string): string {
  const target = isLocale(locale) ? locale : DEFAULT_LOCALE;
  if (target === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//")) {
    return href;
  }
  return href === "/" ? `/${target}` : `/${target}${href}`;
}

/**
 * Split a request path into its locale prefix and the underlying route.
 * `/en/marketplace` → `{ locale: "en", rest: "/marketplace" }`.
 * `/enterprise` → `{ locale: null, rest: "/enterprise" }` (segment match only).
 */
export function splitLocale(pathname: string): { locale: Locale | null; rest: string } {
  const [, first = "", ...others] = pathname.split("/");
  if (!isLocale(first)) return { locale: null, rest: pathname };
  const rest = `/${others.join("/")}`;
  return { locale: first, rest: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/" };
}

/**
 * Best supported locale for an `Accept-Language` header. Used only for the
 * landing redirect; returns the default when nothing matches.
 */
export function preferredLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number.parseFloat(q.split("=")[1] ?? "") : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0] ?? "";
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Fill `{name}` placeholders: `interpolate("Hola {name}", { name: "Ana" })`. */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * The subset of the dictionary shipped to the browser. Vanilla `<script>`
 * islands cannot import Astro props, so `BaseLayout` inlines this as
 * `window.__OL_I18N` and islands read it through `src/lib/i18n-client.ts`.
 */
export function clientDict(locale: Locale | string | undefined) {
  const t = useT(locale);
  return { common: t.common, stock: t.stock };
}

export type ClientDict = ReturnType<typeof clientDict>;
export type { Dict };
