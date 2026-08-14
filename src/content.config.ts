import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

import { SUPPORT_CATEGORY_IDS } from "@/lib/support";

/**
 * Support-centre articles.
 *
 * The entry id carries the routing information: `es/primeros-pasos/alta-de-negocio`
 * → locale `es`, category `primeros-pasos`, slug `alta-de-negocio`. Locale and
 * slug therefore cannot drift from the file that defines them, and the same
 * slug is used in both locales so `LocaleSwitcher` keeps working untouched (it
 * builds the other locale's URL from the current path).
 */
const support = defineCollection({
  loader: glob({ base: "./src/content/support", pattern: "**/*.mdx" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Stable Spanish slug; the visible label lives in the dictionary. */
    category: z.enum(SUPPORT_CATEGORY_IDS),
    /** Position inside the category listing. */
    order: z.number().int().nonnegative().default(0),
    updated: z.coerce.date(),
    readingMinutes: z.number().int().positive(),
    /** Id of the guided tour this article links to, when it has one. */
    tour: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { support };
