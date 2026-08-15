import { describe, expect, it } from "vitest";
import {
  VARIANT_DESCRIPTION_MAX,
  VARIANT_PRICE_NOTE_MAX,
  isProductVisible,
  isVariantVisible,
  normalizeVariantPayload,
  productIsPublic,
  variantIsPublic,
  variantVisibility,
  publicPriceNote,
  publicVariantDescription,
  variantDescription,
  variantDetailsError,
  variantPriceNote,
  variantText,
} from "./variants";
import type { MarketplaceProduct, PublicProduct, Variant } from "@/types/api";

const variant = (partial: Partial<Variant> = {}): Variant => ({
  id: "v1",
  product_id: "p1",
  sku: "SKU-1",
  name: "Natural",
  price: "420.00",
  currency: "MXN",
  public_stock_status: "available",
  ...partial,
});

describe("variantText", () => {
  it("flattens missing values to an empty string", () => {
    expect(variantText(undefined)).toBe("");
    expect(variantText(null)).toBe("");
  });

  it("trims plain strings", () => {
    expect(variantText("  Tejida a mano  ")).toBe("Tejida a mano");
  });

  it("unwraps the sqlc NullString shape", () => {
    expect(variantText({ String: "Palma natural", Valid: true })).toBe("Palma natural");
    expect(variantText({ String: "ignored", Valid: false })).toBe("");
  });
});

describe("variantDescription / variantPriceNote", () => {
  it("reads the private variant fields", () => {
    const v = variant({ description: "30 × 25 cm", price_note: "Depende del acabado" });
    expect(variantDescription(v)).toBe("30 × 25 cm");
    expect(variantPriceNote(v)).toBe("Depende del acabado");
  });

  it("is empty when the API omits or nulls the fields", () => {
    expect(variantDescription(variant())).toBe("");
    expect(variantPriceNote(variant({ price_note: null }))).toBe("");
    expect(variantDescription(undefined)).toBe("");
    expect(variantPriceNote(null)).toBe("");
  });
});

describe("public rows", () => {
  const row: PublicProduct = {
    id: "p1",
    name: "Bolsa de palma",
    slug: "bolsa-de-palma",
    description: "Descripción del producto",
    unit: "pieza",
    product_type: "stocked_product",
    variant_id: "v1",
    sku: "SKU-1",
    variant_name: "Natural",
    price: "420.00",
    currency: "MXN",
    public_stock_status: "available",
  };

  it("reads the variant text without falling back to the product description", () => {
    expect(publicVariantDescription(row)).toBe("");
    expect(
      publicVariantDescription({ ...row, variant_description: " Asa reforzada " }),
    ).toBe("Asa reforzada");
  });

  it("reads the price note, including NullString marketplace rows", () => {
    const hit: MarketplaceProduct = {
      ...row,
      business_slug: "taller",
      business_name: "Taller",
      price_note: { String: "El precio final depende de medidas y acabados", Valid: true },
    };
    expect(publicPriceNote(hit)).toBe("El precio final depende de medidas y acabados");
    expect(publicPriceNote({ ...hit, price_note: { String: "x", Valid: false } })).toBe("");
    expect(publicPriceNote(row)).toBe("");
  });
});

describe("storefront visibility", () => {
  const pub = { is_public: true };
  const priv = { is_public: false };

  it("reads an absent variant flag as visible (the column defaults to true)", () => {
    expect(variantIsPublic(variant())).toBe(true);
    expect(variantIsPublic(undefined)).toBe(true);
    expect(variantIsPublic(variant({ is_public: false }))).toBe(false);
  });

  it("reads an absent product flag as hidden — it was never published", () => {
    expect(productIsPublic({})).toBe(false);
    expect(productIsPublic(null)).toBe(false);
    expect(productIsPublic(pub)).toBe(true);
  });

  it("ANDs the two switches", () => {
    expect(isVariantVisible(pub, variant())).toBe(true);
    expect(isVariantVisible(pub, variant({ is_public: false }))).toBe(false);
    expect(isVariantVisible(priv, variant())).toBe(false);
    expect(isVariantVisible(priv, variant({ is_public: false }))).toBe(false);
  });

  it("counts visible cards against the variant total", () => {
    const variants = [
      variant({ id: "a" }),
      variant({ id: "b", is_public: false }),
      variant({ id: "c", is_public: true }),
    ];
    expect(variantVisibility(pub, variants)).toEqual({ visible: 2, total: 3 });
    // The master switch hides every card without touching the variant flags.
    expect(variantVisibility(priv, variants)).toEqual({ visible: 0, total: 3 });
    expect(variantVisibility(pub, [])).toEqual({ visible: 0, total: 0 });
    expect(variantVisibility(pub, undefined)).toEqual({ visible: 0, total: 0 });
  });

  it("drops a product with no visible card out of the storefront", () => {
    expect(isProductVisible(pub, [variant()])).toBe(true);
    expect(isProductVisible(pub, [variant({ is_public: false })])).toBe(false);
    expect(isProductVisible(pub, [])).toBe(false);
    expect(isProductVisible(priv, [variant()])).toBe(false);
  });
});

describe("variantDetailsError", () => {
  it("accepts empty and normal text", () => {
    expect(variantDetailsError("", "")).toBeNull();
    expect(variantDetailsError("Tejida a mano", "Depende del acabado")).toBeNull();
  });

  it("rejects over-long text", () => {
    expect(variantDetailsError("x".repeat(VARIANT_DESCRIPTION_MAX + 1), "")).toMatch(
      /descripción/i,
    );
    expect(variantDetailsError("", "x".repeat(VARIANT_PRICE_NOTE_MAX + 1))).toMatch(/nota/i);
  });

  it("measures the trimmed value, so padding alone never fails", () => {
    expect(variantDetailsError(` ${"x".repeat(VARIANT_DESCRIPTION_MAX)} `, "")).toBeNull();
  });
});

describe("normalizeVariantPayload", () => {
  it("trims the detail fields", () => {
    expect(
      normalizeVariantPayload({ sku: "S", description: "  hola  ", price_note: " nota " }),
    ).toEqual({ sku: "S", description: "hola", price_note: "nota" });
  });

  it("keeps an empty string, which is how the API clears the field", () => {
    expect(normalizeVariantPayload({ description: "   " })).toEqual({ description: "" });
  });

  it("leaves omitted and null values alone — both mean 'unchanged'", () => {
    expect(normalizeVariantPayload({ sku: "S" })).toEqual({ sku: "S" });
    expect(normalizeVariantPayload({ description: null, price_note: null })).toEqual({
      description: null,
      price_note: null,
    });
  });

  it("passes the visibility boolean through", () => {
    expect(normalizeVariantPayload({ sku: "S", is_public: false })).toEqual({
      sku: "S",
      is_public: false,
    });
    expect(normalizeVariantPayload({ is_public: true })).toEqual({ is_public: true });
  });

  it("coerces a checkbox-shaped is_public to the boolean the API expects", () => {
    expect(normalizeVariantPayload({ is_public: "on" })).toEqual({ is_public: true });
    expect(normalizeVariantPayload({ is_public: "false" })).toEqual({ is_public: false });
  });

  it("leaves an absent or null is_public alone — both mean 'unchanged'", () => {
    expect(normalizeVariantPayload({ sku: "S" })).not.toHaveProperty("is_public");
    expect(normalizeVariantPayload({ is_public: null })).toEqual({ is_public: null });
  });

  it("does not mutate the caller's object", () => {
    const body = { description: " hola " };
    normalizeVariantPayload(body);
    expect(body.description).toBe(" hola ");
  });

  it("passes non-object bodies through untouched", () => {
    expect(normalizeVariantPayload(null)).toBeNull();
    expect(normalizeVariantPayload("nope")).toBe("nope");
    expect(normalizeVariantPayload([1, 2])).toEqual([1, 2]);
  });
});
