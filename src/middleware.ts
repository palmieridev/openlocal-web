import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

// Business owner area requires an authenticated Clerk session.
const isProtected = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

export const onRequest = clerkMiddleware((auth, context) => {
  if (isProtected(context.request)) {
    const { userId, redirectToSignIn } = auth();
    if (!userId) {
      return redirectToSignIn();
    }
  }
});
