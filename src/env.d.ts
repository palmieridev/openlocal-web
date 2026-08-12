/// <reference types="astro/client" />
/// <reference types="@clerk/astro/env" />

declare namespace App {
  interface Locals {
    /** Resolved by the i18n middleware from the URL prefix. */
    locale: import("@/i18n").Locale;
  }
}
