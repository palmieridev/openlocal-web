import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { defineMiddleware, sequence } from "astro:middleware";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  preferredLocale,
  splitLocale,
} from "@/i18n";

// Business owner area requires an authenticated Clerk session.
const isProtected = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

const auth = clerkMiddleware((auth, context) => {
  if (isProtected(context.request)) {
    const { userId, redirectToSignIn } = auth();
    if (!userId) {
      return redirectToSignIn();
    }
  }
});

/**
 * Locale routing. Spanish (the default) is served from the bare path, English
 * from `/en/*`; the prefix is stripped here and the request rewritten to the
 * single page file for that route, so there is one route file per page rather
 * than one per locale.
 *
 * Three things this has to get right:
 *  - `ctx.rewrite()` re-runs the whole middleware chain, so the already-resolved
 *    `locals.locale` short-circuits the second pass (otherwise it would be
 *    reset to the default).
 *  - `/api/*` are BFF routes, never locale-prefixed and never rewritten.
 *  - it runs *before* Clerk, so `/en/dashboard` reaches the auth matcher as
 *    `/dashboard` and stays protected.
 */
const i18n = defineMiddleware(async (ctx, next) => {
  // Second pass after a rewrite — the locale is already resolved.
  if (isLocale(ctx.locals.locale)) return next();

  const { pathname, search } = ctx.url;

  if (pathname.startsWith("/api/")) {
    ctx.locals.locale = DEFAULT_LOCALE;
    return next();
  }

  const { locale, rest } = splitLocale(pathname);

  // `/es/*` is a duplicate of the canonical bare path — collapse it.
  if (locale === DEFAULT_LOCALE) {
    return ctx.redirect(`${rest}${search}`, 301);
  }

  if (locale) {
    ctx.locals.locale = locale;
    return ctx.rewrite(`${rest}${search}`);
  }

  ctx.locals.locale = DEFAULT_LOCALE;

  // Send first-time visitors to their language once, from the landing page
  // only. A remembered choice wins over the browser's Accept-Language.
  if (pathname === "/") {
    const remembered = ctx.cookies.get(LOCALE_COOKIE)?.value;
    const target = isLocale(remembered) ? remembered : preferredLocale(ctx.request.headers.get("accept-language"));
    if (target !== DEFAULT_LOCALE) {
      const response = ctx.redirect(`/${target}${search}`, 302);
      response.headers.set("Vary", "Accept-Language, Cookie");
      return response;
    }
  }

  return next();
});

// Keep staging/preview deploys out of search indexes (robots.txt also blocks
// them, but the header covers pages reached via direct links).
const noindex = defineMiddleware(async (_context, next) => {
  const response = await next();
  const env = process.env.VERCEL_ENV;
  if (env && env !== "production") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
});

export const onRequest = sequence(i18n, auth, noindex);
