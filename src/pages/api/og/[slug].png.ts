import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { publicApi } from '@/lib/api/client';
import { formatPrice } from '@/lib/format';
import { publicVariantDescription } from '@/lib/variants';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
function lines(value: string, width: number, max: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ');
  const result: string[] = [];
  let line = '';
  for (const raw of words) {
    const word = raw.length > width ? `${raw.slice(0, width - 1)}…` : raw;
    if (line && `${line} ${word}`.length > width) { result.push(line); line = ''; }
    line = line ? `${line} ${word}` : word;
  }
  if (line) result.push(line);
  return result.slice(0, max).map((row, i) => i === max - 1 && result.length > max ? `${row.slice(0, -1)}…` : row);
}

/** A public raster fallback for shops/catalog entries without any uploaded photo. */
export const GET: APIRoute = async ({ params, url }) => {
  const business = params.slug ? await publicApi.getBusiness(params.slug) : null;
  if (!business) return new Response(null, { status: 404 });
  const variantId = url.searchParams.get('variant');
  const product = variantId ? (await publicApi.getBusinessProducts(business.slug)).find(p => p.variant_id === variantId) : undefined;
  if (variantId && !product) return new Response(null, { status: 404 });
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'es';
  const title = product ? [product.name, product.variant_name].filter(Boolean).join(' · ') : business.name;
  const detail = product ? publicVariantDescription(product) || product.description : business.description;
  const headline = lines(title, 34, 2).map((line, i) => `<text x="80" y="${210 + i * 72}" font-size="58" font-weight="700">${escape(line)}</text>`).join('');
  const body = lines(detail || business.name, 66, 2).map((line, i) => `<text x="80" y="${365 + i * 38}" font-size="28" fill="#52635a">${escape(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f5f7f2"/><rect width="18" height="630" fill="#16754b"/><g font-family="DejaVu Sans, sans-serif" fill="#193d2b"><text x="80" y="95" font-size="30" fill="#16754b">Openlocal</text>${headline}${body}<text x="80" y="535" font-size="38" font-weight="700">${escape(product ? formatPrice(product.price, product.currency, locale) : business.name.slice(0, 48))}</text><text x="80" y="585" font-size="22" fill="#52635a">${escape(product ? business.name.slice(0, 65) : 'openlocal.store')}</text></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300, s-maxage=300', 'X-Content-Type-Options': 'nosniff' } });
};
