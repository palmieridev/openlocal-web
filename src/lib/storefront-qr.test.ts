import { describe, expect, it } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
import { storefrontQr, storefrontUrl } from "./storefront-qr";

async function decode(dataUrl: string, width?: number) {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  const image = sharp(bytes);
  if (width) image.resize(width, width, { kernel: "nearest" });
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    result: jsQR(new Uint8ClampedArray(data), info.width, info.height),
    info,
    data,
  };
}

describe("storefront QR sharing", () => {
  it.each([
    ["https://openlocal.store/dashboard/share?token=private#fragment", "es", "https://openlocal.store/business/panaderia-lupita"],
    ["https://preview.example/en/dashboard/share", "en", "https://preview.example/en/business/panaderia-lupita"],
    ["http://openlocal-dev.home:4321/dashboard/share", "es", "http://openlocal-dev.home:4321/business/panaderia-lupita"],
  ] as const)("uses only the web origin and locale from %s", (origin, locale, expected) => {
    expect(storefrontUrl(new URL(origin), "panaderia-lupita", locale)).toBe(expected);
  });

  it.each(["", "../dashboard", "//other.example", "shop?token=secret", "shop/other"])(
    "rejects invalid slugs instead of generating a misleading destination: %s",
    (slug) => expect(() => storefrontUrl(new URL("https://openlocal.store"), slug, "es")).toThrow(),
  );

  it.each(["es", "en"] as const)("PNG and SVG scan to the exact public URL in %s", async (locale) => {
    const url = storefrontUrl(new URL("https://openlocal.store"), "panaderia-lupita", locale);
    const qr = await storefrontQr(url);
    const png = await decode(qr.png);
    expect(png.info.width).toBe(1024);
    expect(png.info.height).toBe(1024);
    expect(png.result?.data).toBe(url);
    // Test the independent SVG renderer at the size customers see on screen.
    expect((await decode(qr.svg, 256)).result?.data).toBe(url);
    // The opaque white quiet zone must survive export for reliable printing.
    expect([...png.data.subarray(0, png.info.width * 4)].every((channel) => channel === 255)).toBe(true);
  });
});
