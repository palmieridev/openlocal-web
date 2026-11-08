import { intlLocale, localePath, useT, type Locale } from "@/i18n";

export function adminDate(value: string | null, locale: Locale): string {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return useT(locale).admin.notSet;
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(date);
}

export function adminLabel(labels: Record<string, string>, value: string): string {
  return Object.hasOwn(labels, value) ? labels[value] : value;
}

/** Rebuild links from explicit filters so pagination preserves the current search. */
export function adminHref(locale: Locale, path: string, filters: Record<string, string | null | undefined> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  return localePath(locale, path) + (query.size ? `?${query}` : "");
}
