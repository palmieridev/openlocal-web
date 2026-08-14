/**
 * Guided tour definitions.
 *
 * A tour is a list of dashboard elements to highlight, addressed by
 * `data-tour="…"` attributes. Those attributes are a **contract**: renaming one
 * without updating the tour breaks the tour silently, so `tours.test.ts` fails
 * the build when a selector no longer exists anywhere in `src/`.
 *
 * The step prose is *not* here — it lives in `copy.es.ts` / `copy.en.ts` and is
 * dynamic-imported by the runner, so tour text never ships on pages that do not
 * run a tour.
 */

export interface TourStep {
  /** `data-tour` value of the element to highlight. */
  anchor: string;
  /** Copy key inside the locale file (defaults to the anchor). */
  key?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export interface TourDefinition {
  id: string;
  /** Unprefixed dashboard route the tour runs on. */
  path: string;
  steps: TourStep[];
}

export const TOURS = {
  "recorrido-del-panel": {
    id: "recorrido-del-panel",
    path: "/dashboard",
    steps: [
      { anchor: "stats", side: "bottom", align: "start" },
      { anchor: "nav-productos", side: "right", align: "start" },
      { anchor: "nav-inventario", side: "right", align: "start" },
      { anchor: "nav-analitica", side: "right", align: "start" },
      { anchor: "nav-tienda", side: "right", align: "start" },
    ],
  },
  "crear-producto": {
    id: "crear-producto",
    path: "/dashboard/products",
    steps: [
      { anchor: "product-new", side: "bottom", align: "end" },
      { anchor: "product-filters", side: "bottom", align: "start" },
      { anchor: "product-search", side: "bottom", align: "start" },
      { anchor: "product-table", side: "top", align: "start" },
    ],
  },
  "registrar-movimiento": {
    id: "registrar-movimiento",
    path: "/dashboard/inventory",
    steps: [
      { anchor: "movement-new", side: "bottom", align: "end" },
      { anchor: "inventory-tabs", side: "bottom", align: "start" },
      { anchor: "stock-table", side: "top", align: "start" },
    ],
  },
} satisfies Record<string, TourDefinition>;

export type TourId = keyof typeof TOURS;

export const TOUR_IDS = Object.keys(TOURS) as TourId[];

export function isTourId(value: unknown): value is TourId {
  return typeof value === "string" && value in TOURS;
}

/** CSS selector for a step's anchor. */
export function tourSelector(step: TourStep): string {
  return `[data-tour="${step.anchor}"]`;
}

/** Query param the support articles use to launch a tour on the dashboard. */
export const TOUR_PARAM = "tour";

/** `localStorage` key recording that a visitor finished a tour. */
export function tourDoneKey(id: string): string {
  return `ol_tour_done:${id}`;
}

/**
 * Dashboard link that launches a tour. Unprefixed — wrap in `localePath()`.
 */
export function tourHref(id: TourId): string {
  return `${TOURS[id].path}?${TOUR_PARAM}=${id}`;
}
