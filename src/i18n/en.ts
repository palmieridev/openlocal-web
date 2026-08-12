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
  location: {
    fixedLabel: "Fixed premises",
    fixedDescription: "You have an address customers come to.",
    mobileLabel: "Mobile business",
    mobileDescription: "You have no premises: you serve customers at their location.",
    hybridLabel: "Premises and on-site service",
    hybridDescription: "You have premises and also travel to the customer.",
  },
  areas: {
    atLeastOne:
      "Add at least one service area (state and, if it applies, municipality or neighborhood).",
    tooMany: "You can add up to {max} service areas.",
    rowFallback: "Area {index}",
    missingCountry: "{label}: the country is missing.",
    missingState: "{label}: the state is missing.",
    nameLength: "{label}: the area name must be between {min} and {max} characters.",
    fallbackName: "Service area",
    postal: "Postal code {code}",
  },
  errors: {
    notFoundTitle: "Page not found — Openlocal",
    notFoundMeta: "The page you are looking for does not exist or was moved.",
    notFoundHeading: "Page not found",
    notFoundBody:
      "The page you are looking for does not exist or was moved. Browse the marketplace to discover local businesses near you.",
    serverTitle: "Something went wrong — Openlocal",
    serverMeta: "An unexpected error occurred. Please try again in a moment.",
    serverHeading: "Something went wrong",
    serverBody:
      "An unexpected error occurred on our side. We are on it — please try again in a moment.",
    goMarketplace: "Go to the marketplace",
    backHome: "Back home",
  },
  hours: {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    open: "Open",
    closed: "Closed",
    runTwo: "{first} and {last}",
    runRange: "{first} to {last}",
    dayFallback: "Day {day}",
    missingTime: "{day}: the opening or closing time is missing.",
    sameTime: "{day}: opening and closing times cannot be the same.",
  },
  product: {
    imageAlt: "Photo of {name}",
    viewFullImage: "View the full photo of {name}",
    countOne: "{count} product",
    countOther: "{count} products",
  },
  lightbox: {
    close: "Close image",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    viewFull: "View the full image",
    fallbackCaption: "Image",
  },
} satisfies Dict;
