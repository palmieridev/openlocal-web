import { describe, expect, it } from "vitest";
import { formatDistance, formatPrice, humanize, stockMeta, text } from "./format";

describe("formatPrice", () => {
  it("formats decimal strings from the API as MXN", () => {
    // API money decimals arrive as strings. Trailing zeros are dropped
    // (minimumFractionDigits: 0), so cents show only when non-zero.
    expect(formatPrice("1234.5")).toBe("$1,234.5");
    expect(formatPrice("1234.55")).toBe("$1,234.55");
    expect(formatPrice("100")).toBe("$100");
  });

  it("formats numbers", () => {
    expect(formatPrice(99.9)).toBe("$99.9");
  });

  it("returns em dash for missing or invalid values", () => {
    expect(formatPrice(undefined)).toBe("—");
    expect(formatPrice(null)).toBe("—");
    expect(formatPrice("")).toBe("—");
    expect(formatPrice("abc")).toBe("—");
  });

  it("respects a non-MXN currency", () => {
    expect(formatPrice("10", "USD")).toContain("10");
    expect(formatPrice("10", "USD")).not.toBe("$10");
  });
});

describe("formatDistance", () => {
  it("uses meters under 1 km", () => {
    expect(formatDistance(0.25)).toBe("250 m");
  });

  it("uses km with one decimal from 1 km", () => {
    expect(formatDistance(1.234)).toBe("1.2 km");
  });

  it("returns empty for unknown", () => {
    expect(formatDistance(undefined)).toBe("");
    expect(formatDistance(null)).toBe("");
    expect(formatDistance(NaN)).toBe("");
  });
});

describe("text (NullString coercion)", () => {
  it("passes plain strings through", () => {
    expect(text("hola")).toBe("hola");
  });

  it("unwraps valid sqlc NullString", () => {
    expect(text({ String: "hola", Valid: true })).toBe("hola");
  });

  it("returns empty for invalid NullString", () => {
    expect(text({ String: "stale", Valid: false })).toBe("");
  });

  it("returns empty for null/undefined", () => {
    expect(text(null)).toBe("");
    expect(text(undefined)).toBe("");
  });
});

describe("stockMeta", () => {
  it('treats "available" (API enum) like in_stock', () => {
    expect(stockMeta("available").label).toBe("En stock");
    expect(stockMeta("in_stock").label).toBe("En stock");
  });

  it("maps the remaining statuses", () => {
    expect(stockMeta("low_stock").label).toBe("Pocas piezas");
    expect(stockMeta("out_of_stock").label).toBe("Agotado");
    expect(stockMeta("made_to_order").label).toBe("Bajo pedido");
  });

  it("falls back to Consultar for unknown", () => {
    expect(stockMeta(undefined).label).toBe("Consultar");
    expect(stockMeta("garbage").label).toBe("Consultar");
  });
});

describe("humanize", () => {
  it("title-cases slugs", () => {
    expect(humanize("tienda_de_abarrotes")).toBe("Tienda De Abarrotes");
    expect(humanize("food-truck")).toBe("Food Truck");
  });

  it("returns empty for missing input", () => {
    expect(humanize(undefined)).toBe("");
    expect(humanize("")).toBe("");
  });
});
