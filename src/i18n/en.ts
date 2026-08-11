import type { Dict } from "./es";

/**
 * English dictionary. `satisfies Dict` is the whole safety net: adding a key to
 * `es.ts` without translating it here is a type error, and so is a typo.
 */
export const en = {
  meta: {
    title: "Openlocal — Local commerce",
    description: "Discover products from local businesses near you.",
  },
  nav: {
    home: "Home",
    marketplace: "Marketplace",
    sell: "Sell",
    signIn: "Sign in",
    panel: "Dashboard",
    openMenu: "Open menu",
  },
  footer: {
    tagline:
      "Open-source local commerce hub: inventory, storefronts and product discovery near you.",
    explore: "Explore",
    marketplace: "Marketplace",
    map: "Map",
    handmade: "Handmade",
    forBusinesses: "For businesses",
    sellOnOpenlocal: "Sell on Openlocal",
    dashboard: "Dashboard",
    signIn: "Sign in",
    project: "Project",
    openSource: "Open source",
    about: "About",
    madeFor: "Built for local businesses in Mexico 🇲🇽",
  },
  auth: {
    backHome: "← Back home",
  },
  locale: {
    label: "Language",
    es: "Español",
    en: "English",
  },
  common: {
    save: "Save",
    saving: "Saving…",
    create: "Create",
    creating: "Creating…",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    retry: "Retry",
    loading: "Loading…",
    error: "Something went wrong. Please try again.",
    required: "This field is required.",
  },
  stock: {
    inStock: "In stock",
    lowStock: "Only a few left",
    outOfStock: "Sold out",
    madeToOrder: "Made to order",
    unknown: "Ask the shop",
  },
} satisfies Dict;
