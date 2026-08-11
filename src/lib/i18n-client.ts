import { clientDict, type ClientDict } from "@/i18n";

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
  }
}

/** The client dictionary for the current page. */
export function ui(): ClientDict {
  return (typeof window !== "undefined" && window.__OL_I18N) || clientDict(undefined);
}
