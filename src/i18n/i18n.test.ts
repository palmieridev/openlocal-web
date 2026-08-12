import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  clientDict,
  interpolate,
  intlLocale,
  isLocale,
  localePath,
  preferredLocale,
  splitLocale,
  useT,
} from "./index";
import { es } from "./es";
import { en } from "./en";

describe("dictionaries", () => {
  it("share the exact same key paths", () => {
    const paths = (obj: Record<string, unknown>, prefix = ""): string[] =>
      Object.entries(obj).flatMap(([key, value]) =>
        typeof value === "object" && value !== null
          ? paths(value as Record<string, unknown>, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      );
    expect(paths(en).sort()).toEqual(paths(es).sort());
  });

  it("resolves by locale and falls back to the default", () => {
    expect(useT("en").nav.home).toBe("Home");
    expect(useT("es").nav.home).toBe("Inicio");
    expect(useT("de").nav.home).toBe(useT(DEFAULT_LOCALE).nav.home);
    expect(useT(undefined).nav.home).toBe(es.nav.home);
  });
});

describe("isLocale", () => {
  it("accepts supported locales only", () => {
    for (const locale of LOCALES) expect(isLocale(locale)).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("localePath", () => {
  it("leaves default-locale paths bare", () => {
    expect(localePath("es", "/marketplace")).toBe("/marketplace");
    expect(localePath("es", "/")).toBe("/");
  });

  it("prefixes non-default locales", () => {
    expect(localePath("en", "/marketplace")).toBe("/en/marketplace");
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("en", "/marketplace?map=1")).toBe("/en/marketplace?map=1");
  });

  it("never touches external or non-path hrefs", () => {
    expect(localePath("en", "https://github.com/palmieridev/openlocal-api")).toBe(
      "https://github.com/palmieridev/openlocal-api",
    );
    expect(localePath("en", "//cdn.example.com/x")).toBe("//cdn.example.com/x");
    expect(localePath("en", "mailto:hola@openlocal.mx")).toBe("mailto:hola@openlocal.mx");
    expect(localePath("en", "#contacto")).toBe("#contacto");
  });
});

describe("splitLocale", () => {
  it("extracts a locale prefix", () => {
    expect(splitLocale("/en/marketplace")).toEqual({ locale: "en", rest: "/marketplace" });
    expect(splitLocale("/en")).toEqual({ locale: "en", rest: "/" });
    expect(splitLocale("/en/")).toEqual({ locale: "en", rest: "/" });
    expect(splitLocale("/en/business/panaderia-lupita")).toEqual({
      locale: "en",
      rest: "/business/panaderia-lupita",
    });
  });

  it("only matches whole segments", () => {
    expect(splitLocale("/enterprise")).toEqual({ locale: null, rest: "/enterprise" });
    expect(splitLocale("/marketplace/en")).toEqual({ locale: null, rest: "/marketplace/en" });
    expect(splitLocale("/")).toEqual({ locale: null, rest: "/" });
  });
});

describe("preferredLocale", () => {
  it("honours quality values and falls back to the default", () => {
    expect(preferredLocale("en-US,en;q=0.9")).toBe("en");
    expect(preferredLocale("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(preferredLocale("de;q=1.0,en;q=0.4")).toBe("en");
    expect(preferredLocale("de,fr")).toBe(DEFAULT_LOCALE);
    expect(preferredLocale(null)).toBe(DEFAULT_LOCALE);
    expect(preferredLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("ignores zero-quality entries", () => {
    expect(preferredLocale("en;q=0,es;q=0.5")).toBe("es");
  });
});

describe("intlLocale", () => {
  it("maps to BCP-47 tags", () => {
    expect(intlLocale("es")).toBe("es-MX");
    expect(intlLocale("en")).toBe("en-US");
    expect(intlLocale("de")).toBe("es-MX");
  });
});

describe("interpolate", () => {
  it("fills placeholders and leaves unknown ones alone", () => {
    expect(interpolate("Hola {name}", { name: "Ana" })).toBe("Hola Ana");
    expect(interpolate("{count} productos", { count: 3 })).toBe("3 productos");
    expect(interpolate("Hola {name}", {})).toBe("Hola {name}");
  });
});

describe("clientDict", () => {
  it("ships only the island-facing namespaces", () => {
    expect(Object.keys(clientDict("en")).sort()).toEqual([
      "analytics",
      "common",
      "hours",
      "inventory",
      "lightbox",
      "marketplace",
      "movementModal",
      "movements",
      "onboarding",
      "productDetail",
      "products",
      "scanner",
      "stock",
      "storefront",
      "variantLimits",
    ]);
    expect(clientDict("en").common.save).toBe("Save");
  });
});
