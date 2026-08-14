import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  TOURS,
  TOUR_IDS,
  isTourId,
  tourHref,
  tourSelector,
  type TourStep,
} from "./index";
import { tourCopy as es } from "./copy.es";
import { tourCopy as en } from "./copy.en";

const SRC = new URL("../../", import.meta.url).pathname;
const MARKUP = new Set([".astro", ".ts", ".tsx", ".mdx"]);

/**
 * Anchors the markup actually renders. Two accepted forms, both literal so a
 * rename cannot hide from this grep:
 *   - `data-tour="stats"` directly on the element;
 *   - `tour: "nav-productos"` in an `.astro` nav table, bound with
 *     `data-tour={n.tour}` (the dashboard sidebar renders in a loop).
 */
function renderedAnchors(): Set<string> {
  const anchors = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!MARKUP.has(extname(entry.name))) continue;
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(/data-tour=["']([a-z0-9-]+)["']/g)) {
        if (match[1]) anchors.add(match[1]);
      }
      if (extname(entry.name) === ".astro" && source.includes("data-tour={")) {
        for (const match of source.matchAll(/\btour:\s*["']([a-z0-9-]+)["']/g)) {
          if (match[1]) anchors.add(match[1]);
        }
      }
    }
  };
  walk(SRC);
  return anchors;
}

describe("tour anchors", () => {
  const anchors = renderedAnchors();

  it.each(TOUR_IDS)(
    "%s highlights elements that still exist in the markup",
    (id) => {
      const missing = TOURS[id].steps
        .map((step) => step.anchor)
        .filter((anchor) => !anchors.has(anchor));

      expect(
        missing,
        `Missing data-tour anchors for "${id}": ${missing.join(", ")}. ` +
          "Either restore the attribute or update the tour definition.",
      ).toEqual([]);
    },
  );

  it("builds selectors and dashboard links", () => {
    expect(tourSelector({ anchor: "nav-productos" })).toBe(
      '[data-tour="nav-productos"]',
    );
    expect(tourHref("crear-producto")).toBe(
      "/dashboard/products?tour=crear-producto",
    );
  });

  it("recognises only known ids", () => {
    expect(isTourId("crear-producto")).toBe(true);
    expect(isTourId("nope")).toBe(false);
  });
});

describe("tour copy", () => {
  it.each(TOUR_IDS)("%s has prose for every step in both locales", (id) => {
    const steps: TourStep[] = TOURS[id].steps;
    const keys = steps.map((step) => step.key ?? step.anchor);
    for (const [locale, copy] of [
      ["es", es],
      ["en", en],
    ] as const) {
      expect(Object.keys(copy[id].steps).sort(), locale).toEqual(
        [...keys].sort(),
      );
      expect(copy[id].title, locale).not.toBe("");
    }
  });
});
