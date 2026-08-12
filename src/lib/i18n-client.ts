import { DEFAULT_LOCALE, clientDict, isLocale, type ClientDict, type Locale } from "@/i18n";

/**
 * Browser-side dictionary access for the vanilla `<script>` islands.
 *
 * `BaseLayout` inlines the locale's client subset as `window.__OL_I18N` before
 * any island runs, so `ui()` is a plain synchronous read. The fallback keeps
 * islands working in unit tests and in the (impossible in practice) case where
 * the layout script did not run.
 */

declare global {
  interface Window {
    __OL_I18N?: ClientDict;
    __OL_LOCALE?: string;
  }
}

/** The client dictionary for the current page. */
export function ui(): ClientDict {
  return (typeof window !== "undefined" && window.__OL_I18N) || clientDict(undefined);
}

/** The current page's locale, for helpers that format rather than translate. */
export function uiLocale(): Locale {
  const value = typeof window !== "undefined" ? window.__OL_LOCALE : undefined;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
