import { localePath, type Locale } from '@/i18n';
import type { Business, PublicProduct } from '@/types/api';

/** IDs identify the exact variant; a hash would be invisible to preview crawlers. */
export function variantPath(slug: string, variantId: string): string {
  return `/business/${encodeURIComponent(slug)}/products/${encodeURIComponent(variantId)}`;
}

export function shareImage(business: Business, product?: PublicProduct, locale: Locale = 'es'): string {
  return product?.image_url || business.cover_image_url || business.logo_url ||
    `/api/og/${encodeURIComponent(business.slug)}.png?locale=${locale}${product ? `&variant=${encodeURIComponent(product.variant_id)}` : ''}`;
}

export function variantUrl(origin: URL, slug: string, variantId: string, locale: Locale): string {
  return new URL(localePath(locale, variantPath(slug, variantId)), origin.origin).href;
}
