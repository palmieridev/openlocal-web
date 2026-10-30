import { describe, expect, it, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
import type { APIContext } from 'astro';
import type { Business, PublicProduct } from '@/types/api';
import { shareImage, variantPath, variantUrl } from './sharing';
import { publicApi } from '@/lib/api/client';
import { GET } from '@/pages/api/og/[slug].png';

vi.mock('@/lib/api/client', () => ({ publicApi: { getBusiness: vi.fn(), getBusinessProducts: vi.fn() } }));
const business = { slug: 'cafe-local', name: 'Café & té <local>', description: 'Hecho en México' } as Business;
const product = { variant_id: 'variant-1', name: 'Café', variant_name: '500 g', price: '120.00', currency: 'MXN', description: 'Molido & fresco' } as PublicProduct;
const context = (query = '') => ({ params: { slug: business.slug }, url: new URL(`https://openlocal.store/api/og/cafe-local.png${query}`) }) as unknown as APIContext;

beforeEach(() => {
  vi.mocked(publicApi.getBusiness).mockResolvedValue(business);
  vi.mocked(publicApi.getBusinessProducts).mockResolvedValue([product]);
});

describe('public sharing', () => {
  it('keeps the exact variant and locale, without owner query strings or fragments', () => {
    expect(variantUrl(new URL('https://preview.example/dashboard/products/1?token=private#secret'), business.slug, product.variant_id, 'en'))
      .toBe('https://preview.example/en/business/cafe-local/products/variant-1');
    expect(variantPath('cafe-local', 'id?x=#')).toBe('/business/cafe-local/products/id%3Fx%3D%23');
  });
  it('prefers the variant photo, then the cover, then the logo, then a public raster fallback', () => {
    const shop = { ...business, cover_image_url: 'https://images.example/cover.jpg', logo_url: 'https://images.example/logo.jpg' };
    expect(shareImage(shop, { ...product, image_url: 'https://images.example/product.jpg' })).toBe('https://images.example/product.jpg');
    expect(shareImage(shop, product)).toBe(shop.cover_image_url);
    expect(shareImage({ ...shop, cover_image_url: undefined }, product)).toBe(shop.logo_url);
    expect(shareImage(business, product, 'en')).toBe('/api/og/cafe-local.png?locale=en&variant=variant-1');
  });
  it.each(['', '?variant=variant-1&locale=en'])('returns a crawler-readable 1200×630 PNG with special characters: %s', async query => {
    const response = await GET(context(query));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    const image = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(image).toMatchObject({ format: 'png', width: 1200, height: 630 });
  });
  it('does not expose variants missing from the public catalog', async () => {
    vi.mocked(publicApi.getBusinessProducts).mockResolvedValue([]);
    expect((await GET(context('?variant=hidden-variant'))).status).toBe(404);
  });
  it('does not generate a preview for a missing business', async () => {
    vi.mocked(publicApi.getBusiness).mockResolvedValue(null);
    expect((await GET(context())).status).toBe(404);
  });
});
