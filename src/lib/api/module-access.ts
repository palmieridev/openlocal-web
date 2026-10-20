import type { APIContext } from "astro";
import { localePath } from "@/i18n";
import type { Module } from "@/types/modules";
import { getServerAuth } from "./server";
import { moduleApi } from "./modules";

/** History permissions alone must not open an unsubscribed module's queue. */
export async function redirectUnsubscribedModule(
  ctx: Pick<APIContext, "locals" | "cookies" | "redirect">,
  module: Module,
): Promise<Response | null> {
  try {
    const { token, businessId } = await getServerAuth(ctx);
    if (!token || !businessId) return null;
    const access = await moduleApi(token, businessId).entitlements();
    if (!access.modules[module].owned) {
      return ctx.redirect(
        localePath(ctx.locals.locale, `/dashboard/billing?module=${module}`),
        302,
      );
    }
  } catch {
    // Leave transient API/auth failures to the page's existing retry state.
  }
  return null;
}
