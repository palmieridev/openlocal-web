import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { defineMiddleware, sequence } from "astro:middleware";

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

export const onRequest = sequence(auth, noindex);
