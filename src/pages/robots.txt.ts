import type { APIRoute } from "astro";

/**
 * Crawling policy per environment. Vercel sets VERCEL_ENV to
 * "production" | "preview" | "development"; anything but production
 * (staging, PR previews, local) is blocked so test sites never get indexed.
 * Owner/auth areas stay blocked everywhere.
 */
export const GET: APIRoute = () => {
  const isProduction = process.env.VERCEL_ENV === "production";

  const body = isProduction
    ? [
        "User-agent: *",
        "Disallow: /dashboard",
        "Disallow: /onboarding",
        "Disallow: /api",
        "",
      ].join("\n")
    : ["User-agent: *", "Disallow: /", ""].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
