import type { MarketplaceProduct, NullString, PublicProduct, Variant } from "@/types/api";
import { text } from "./format";

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
export const VARIANT_DESCRIPTION_MAX = 600;
export const VARIANT_PRICE_NOTE_MAX = 140;

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

/** Validation message for the owner form, or null when both fields are fine. */
export function variantDetailsError(description: string, priceNote: string): string | null {
  if (description.trim().length > VARIANT_DESCRIPTION_MAX) {
    return `La descripción de la variante no puede pasar de ${VARIANT_DESCRIPTION_MAX} caracteres.`;
  }
  if (priceNote.trim().length > VARIANT_PRICE_NOTE_MAX) {
    return `La nota de precio no puede pasar de ${VARIANT_PRICE_NOTE_MAX} caracteres.`;
  }
  return null;
}

/**
 * Normalize the detail fields of a variant create/edit payload.
 *
 * Trims strings so stray whitespace never becomes a "value", and leaves
 * `null`/absent keys exactly as they arrived — both mean "unchanged" to the
 * API, and forging a `""` there would silently wipe an owner's text.
 */
export function normalizeVariantPayload(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const payload = { ...(body as Record<string, unknown>) };
  for (const key of ["description", "price_note"] as const) {
    if (!(key in payload)) continue;
    const value = payload[key];
    if (typeof value === "string") payload[key] = value.trim();
  }
  return payload;
}
