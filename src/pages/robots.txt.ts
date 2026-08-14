import type { APIRoute } from "astro";
import { LOCALES, localePath } from "@/i18n";

/**
 * Crawling policy per environment. Vercel sets VERCEL_ENV to
 * "production" | "preview" | "development"; anything but production
 * (staging, PR previews, local) is blocked so test sites never get indexed.
 * Owner/auth areas stay blocked everywhere — including their locale-prefixed
 * aliases, which are real URLs the middleware serves.
 */
export const GET: APIRoute = () => {
  const isProduction = process.env.VERCEL_ENV === "production";

  const ownerAreas = ["/dashboard", "/onboarding"].flatMap((path) =>
    LOCALES.map((locale) => localePath(locale, path)),
  );

  const body = isProduction
    ? [
        "User-agent: *",
        ...ownerAreas.map((path) => `Disallow: ${path}`),
        "Disallow: /api",
        "",
      ].join("\n")
    : ["User-agent: *", "Disallow: /", ""].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
