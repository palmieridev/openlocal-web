import QRCode from "qrcode";
import { localePath, type Locale } from "@/i18n";

/** Use the current web origin, never the API host or a hard-coded production URL. */
export function storefrontUrl(origin: URL, slug: string, locale: Locale): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Invalid business slug");
  }
  return new URL(localePath(locale, `/business/${slug}`), origin.origin).href;
}

/** Server-only: no QR library, uploads, or third-party image service in the browser. */
export async function storefrontQr(url: string) {
  const options = {
    errorCorrectionLevel: "Q" as const,
    margin: 4,
    width: 1024,
    color: { dark: "#000000ff", light: "#ffffffff" },
  };
  const [png, svg] = await Promise.all([
    QRCode.toDataURL(url, options),
    QRCode.toString(url, { ...options, type: "svg" }),
  ]);
  return {
    png,
    svg: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  };
}

export type StorefrontQr = Awaited<ReturnType<typeof storefrontQr>>;
