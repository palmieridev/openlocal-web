import type { APIContext } from "astro";
import { getCollection } from "astro:content";

import { supportArticles } from "@/lib/support";

export const prerender = false;

/**
 * Search index for the support centre, one document per article.
 *
 * This is a *page* route rather than `/api/*`, so the i18n middleware serves it
 * at `/soporte/search.json` and `/en/soporte/search.json` from the same file and
 * `locals.locale` says which one was asked for.
 */
export async function GET(ctx: APIContext): Promise<Response> {
  const entries = await getCollection("support");
  const articles = supportArticles(entries, ctx.locals.locale, {
    includeDrafts: import.meta.env.DEV,
  });

  const docs = articles.map((article) => ({
    title: article.data.title,
    description: article.data.description,
    category: article.category,
    path: article.path,
    tour: article.data.tour ?? null,
    minutes: article.data.readingMinutes,
  }));

  return new Response(JSON.stringify(docs), {
    headers: {
      "content-type": "application/json",
      // Short cache: the index only changes on deploy, but the locale-specific
      // URL is what varies, not a header.
      "cache-control": "public, max-age=300",
    },
  });
}
