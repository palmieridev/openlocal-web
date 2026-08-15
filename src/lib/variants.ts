import type { MarketplaceProduct, NullString, Product, PublicProduct, Variant } from "@/types/api";
import { text } from "./format";
import { DEFAULT_LOCALE, interpolate, useT, type Locale } from "@/i18n";

/**
 * Variant detail helpers (`description` + `price_note`).
 *
 * Both fields are nullable on the API and absent from older payloads, so every
 * read goes through `variantText()` — it flattens `undefined`, `null` and the
 * sqlc `NullString` shape that raw marketplace rows use.
 *
 * On writes the API follows the same convention as `image_url`: an omitted or
 * `null` field means "leave unchanged", while `""` clears the stored value. The
 * owner form therefore always sends both keys as (possibly empty) strings, and
 * `normalizeVariantPayload()` keeps that contract intact server-side without
 * inventing values for keys the caller never sent.
 */

/** Owner-form limits; mirrored by `maxlength` on the inputs. */
export const VARIANT_DESCRIPTION_MAX = 2000;
export const VARIANT_PRICE_NOTE_MAX = 500;

/** Coerce a nullable/NullString API value to a trimmed plain string. */
export function variantText(value: string | NullString | null | undefined): string {
  return text(value).trim();
}

/** Owner-facing variant description ("" when unset). */
export function variantDescription(variant: Pick<Variant, "description"> | null | undefined): string {
  return variantText(variant?.description);
}

/** Owner-facing price caveat ("" when unset). */
export function variantPriceNote(variant: Pick<Variant, "price_note"> | null | undefined): string {
  return variantText(variant?.price_note);
}

/**
 * Variant description on a public row. The public payloads flatten a product
 * and its variant together, so the variant's own text lands under
 * `variant_description` — `description` there is the *product* description.
 */
export function publicVariantDescription(
  row: Pick<PublicProduct | MarketplaceProduct, "variant_description"> | null | undefined,
): string {
  return variantText(row?.variant_description);
}

/** Price caveat on a public row ("" when unset). */
export function publicPriceNote(
  row: Pick<PublicProduct | MarketplaceProduct, "price_note"> | null | undefined,
): string {
  return variantText(row?.price_note);
}

/**
 * Storefront visibility.
 *
 * The product flag is the master switch and the variant flag decides its own
 * card: `visible = product.is_public && variant.is_public`. The two defaults
 * differ on purpose — the variant column is `NOT NULL DEFAULT true`, so an
 * absent value there means *visible* (older payloads simply omit it), while a
 * product without an explicit `is_public` has never been published.
 */

/** Is the variant's own switch on? Absent/null reads as on. */
export function variantIsPublic(variant: Pick<Variant, "is_public"> | null | undefined): boolean {
  return variant?.is_public !== false;
}

/** Is the product's master switch on? Absent/null reads as off. */
export function productIsPublic(product: Pick<Product, "is_public"> | null | undefined): boolean {
  return product?.is_public === true;
}

/** Does this variant's card reach the storefront? */
export function isVariantVisible(
  product: Pick<Product, "is_public"> | null | undefined,
  variant: Pick<Variant, "is_public"> | null | undefined,
): boolean {
  return productIsPublic(product) && variantIsPublic(variant);
}

/** How many of a product's variant cards reach the storefront, and out of how many. */
export function variantVisibility(
  product: Pick<Product, "is_public"> | null | undefined,
  variants: readonly Pick<Variant, "is_public">[] | null | undefined,
): { visible: number; total: number } {
  const list = variants ?? [];
  return {
    visible: list.filter((v) => isVariantVisible(product, v)).length,
    total: list.length,
  };
}

/**
 * Does the product itself reach the storefront? A public product with zero
 * visible variants renders no card, so it drops out of listings entirely.
 */
export function isProductVisible(
  product: Pick<Product, "is_public"> | null | undefined,
  variants: readonly Pick<Variant, "is_public">[] | null | undefined,
): boolean {
  return variantVisibility(product, variants).visible > 0;
}

/** Validation message for the owner form, or null when both fields are fine. */
export function variantDetailsError(
  description: string,
  priceNote: string,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  const t = useT(locale).variantLimits;
  if (description.trim().length > VARIANT_DESCRIPTION_MAX) {
    return interpolate(t.descriptionTooLong, { max: VARIANT_DESCRIPTION_MAX });
  }
  if (priceNote.trim().length > VARIANT_PRICE_NOTE_MAX) {
    return interpolate(t.priceNoteTooLong, { max: VARIANT_PRICE_NOTE_MAX });
  }
  return null;
}

/**
 * Normalize the detail fields of a variant create/edit payload.
 *
 * Trims strings so stray whitespace never becomes a "value", and leaves
 * `null`/absent keys exactly as they arrived — both mean "unchanged" to the
 * API, and forging a `""` there would silently wipe an owner's text.
 *
 * `is_public` is a boolean on a strict (`additionalProperties: false`) DTO, so
 * a checkbox value that arrives as `"on"`/`"true"` is coerced rather than
 * forwarded as a string the API would reject. Absent/null stays untouched.
 */
export function normalizeVariantPayload(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const payload = { ...(body as Record<string, unknown>) };
  for (const key of ["description", "price_note"] as const) {
    if (!(key in payload)) continue;
    const value = payload[key];
    if (typeof value === "string") payload[key] = value.trim();
  }
  if ("is_public" in payload) {
    const value = payload.is_public;
    if (typeof value === "string") {
      payload.is_public = ["on", "true", "1", "yes"].includes(value.trim().toLowerCase());
    }
  }
  return payload;
}
