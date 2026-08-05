import { describe, expect, it } from "vitest";
import {
  BUSINESS_TYPE_ICONS,
  FALLBACK_LOGO_ICON,
  LOGO_PALETTES,
  iconForBusinessType,
  initialsFor,
  presetsFor,
} from "./logo-presets";

describe("iconForBusinessType", () => {
  it("maps every type offered at onboarding", () => {
    for (const type of ["retail", "artesanias", "comida", "servicios", "moda", "belleza", "hogar", "otro"]) {
      expect(BUSINESS_TYPE_ICONS[type], type).toBeDefined();
      expect(iconForBusinessType(type)).toBe(BUSINESS_TYPE_ICONS[type]);
    }
  });

  it("falls back for legacy and unknown values", () => {
    // Seed data historically used English types like "grocery"/"bakery".
    expect(iconForBusinessType("grocery")).toBe(FALLBACK_LOGO_ICON);
    expect(iconForBusinessType("")).toBe(FALLBACK_LOGO_ICON);
    expect(iconForBusinessType(null)).toBe(FALLBACK_LOGO_ICON);
    expect(iconForBusinessType(undefined)).toBe(FALLBACK_LOGO_ICON);
  });

  it("is case and whitespace tolerant", () => {
    expect(iconForBusinessType("  Comida ")).toBe(BUSINESS_TYPE_ICONS.comida);
  });
});

describe("initialsFor", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsFor("Mercado Verde Roma")).toBe("MV");
    expect(initialsFor("Casa Pan Local")).toBe("CP");
  });

  it("skips connecting words", () => {
    expect(initialsFor("Casa de Pan")).toBe("CP");
    expect(initialsFor("La Flor de Roma")).toBe("FR");
  });

  it("uses two letters of a single-word name", () => {
    expect(initialsFor("Wetdog")).toBe("WE");
  });

  it("strips accents and punctuation", () => {
    expect(initialsFor("Ángeles Ñandú")).toBe("AN");
    expect(initialsFor("¡Órale! Tacos")).toBe("OT");
  });

  it("falls back when there is nothing to work with", () => {
    expect(initialsFor("")).toBe("OL");
    expect(initialsFor("   ")).toBe("OL");
    expect(initialsFor("!!!")).toBe("OL");
  });

  it("keeps stopword-only names usable", () => {
    expect(initialsFor("La Y")).toBe("LY");
  });
});

describe("presetsFor", () => {
  it("offers an icon and a monogram in every palette", () => {
    const presets = presetsFor("comida", "Casa Pan Local");
    expect(presets).toHaveLength(LOGO_PALETTES.length * 2);
    expect(presets.filter((p) => p.kind === "icon")).toHaveLength(LOGO_PALETTES.length);
    expect(presets.filter((p) => p.kind === "monogram")).toHaveLength(LOGO_PALETTES.length);
  });

  it("carries the resolved icon and initials onto each preset", () => {
    const presets = presetsFor("moda", "Hilo Fino");
    expect(presets.every((p) => p.icon === BUSINESS_TYPE_ICONS.moda)).toBe(true);
    expect(presets.every((p) => p.initials === "HF")).toBe(true);
  });

  it("gives every preset a unique id", () => {
    const ids = presetsFor("retail", "Tienda X").map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("still produces presets with no type or name", () => {
    const presets = presetsFor();
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.every((p) => p.icon === FALLBACK_LOGO_ICON)).toBe(true);
    expect(presets.every((p) => p.initials === "OL")).toBe(true);
  });
});
