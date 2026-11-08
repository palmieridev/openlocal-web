import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { defineMiddleware, sequence } from "astro:middleware";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localePath,
  preferredLocale,
  splitLocale,
} from "@/i18n";

// Personal and business areas require an authenticated Clerk session.
const isProtected = createRouteMatcher(["/account(.*)", "/dashboard(.*)", "/onboarding(.*)", "/admin", "/admin/(.*)"]);

const auth = clerkMiddleware((auth, context) => {
  if (isProtected(context.request)) {
    const { userId, orgId, redirectToSignIn } = auth();
    if (!userId) {
      // Clerk's own helper targets the configured (unprefixed) sign-in URL,
      // which would drop an English visitor onto the Spanish page. Keep them in
      // their locale and hand Clerk the prefixed return path.
      const locale = context.locals.locale;
      if (locale && locale !== DEFAULT_LOCALE) {
        const signIn = new URL(localePath(locale, "/login"), context.url);
        const back = localePath(locale, `${context.url.pathname}${context.url.search}`);
        signIn.searchParams.set("redirect_url", back);
        return context.redirect(signIn.toString());
      }
      return redirectToSignIn();
    }
    // Personal accounts must choose a business before entering its workspace.
    if (/^\/dashboard(?:\/|$)/.test(context.url.pathname) && !orgId) {
      return context.redirect(localePath(context.locals.locale, "/account"));
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

// Wrap auth too: admin redirects and errors must never be cached or indexed.
const adminPrivacy = defineMiddleware(async (context, next) => {
  const response = await next();
  if (/^\/admin(?:\/|$)/.test(context.url.pathname)) {
    // Clerk may return an immutable redirect response.
    const privateResponse = new Response(response.body, response);
    privateResponse.headers.set("Cache-Control", "private, no-store");
    privateResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    privateResponse.headers.set("Referrer-Policy", "no-referrer");
    return privateResponse;
  }
  return response;
});

export const onRequest = sequence(i18n, adminPrivacy, auth, noindex);
