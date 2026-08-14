import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n";

/**
 * Support-centre routing and grouping helpers.
 *
 * Deliberately free of `astro:content` imports: `src/content.config.ts` reads
 * `SUPPORT_CATEGORY_IDS` from here, and importing the collection API back into
 * the config would be circular. Pages fetch the entries and hand them to these
 * functions, which keeps the logic unit-testable.
 */

/**
 * Category ids are stable Spanish slugs — they are part of the URL in both
 * locales, exactly like `/marketplace` or `/dashboard`. Only their labels are
 * translated (`t.support.categories`), the same rule the API enums follow.
 */
export const SUPPORT_CATEGORY_IDS = [
  "primeros-pasos",
  "productos-y-variantes",
  "inventario",
  "analitica",
  "tienda-publica",
  "cuenta-y-equipo",
] as const;

export type SupportCategoryId = (typeof SUPPORT_CATEGORY_IDS)[number];

/** Lucide icon per category, mirroring the cards in `openlocal.pen`. */
export const SUPPORT_CATEGORY_ICONS: Record<SupportCategoryId, string> = {
  "primeros-pasos": "lucide:store",
  "productos-y-variantes": "lucide:package",
  inventario: "lucide:boxes",
  analitica: "lucide:chart-column",
  "tienda-publica": "lucide:globe",
  "cuenta-y-equipo": "lucide:users",
};

/** Route root. English serves from `/en/soporte/…` via the i18n rewrite. */
export const SUPPORT_ROOT = "/soporte";

/** Where "still stuck?" points. */
export const SUPPORT_EMAIL = "soporte@openlocal.mx";

/**
 * Support WhatsApp in international format, digits only (e.g. `5215512345678`).
 * Empty until there is a real line — the contact card hides the button rather
 * than linking somewhere that does not answer.
 */
export const SUPPORT_WHATSAPP = "";

/** Repo that owns the article sources, for the "edit this page" link. */
export const SUPPORT_REPO = "https://github.com/palmieridev/openlocal-web";

/** GitHub edit URL for one article's MDX file. */
export function supportEditUrl(entryId: string): string {
  return `${SUPPORT_REPO}/edit/main/src/content/support/${entryId}.mdx`;
}

export function isSupportCategory(value: unknown): value is SupportCategoryId {
  return (
    typeof value === "string" &&
    (SUPPORT_CATEGORY_IDS as readonly string[]).includes(value)
  );
}

/**
 * Unprefixed support path — wrap it in `localePath()` before rendering, like
 * every other internal href.
 */
export function supportPath(category?: string, slug?: string): string {
  if (!category) return SUPPORT_ROOT;
  if (!slug) return `${SUPPORT_ROOT}/${category}`;
  return `${SUPPORT_ROOT}/${category}/${slug}`;
}

export interface SupportEntryData {
  title: string;
  description: string;
  category: SupportCategoryId;
  order: number;
  updated: Date;
  readingMinutes: number;
  tour?: string;
  draft: boolean;
}

export interface SupportEntryLike {
  id: string;
  data: SupportEntryData;
}

export interface SupportArticle<T extends SupportEntryLike = SupportEntryLike> {
  entry: T;
  locale: Locale;
  category: SupportCategoryId;
  slug: string;
  /** Unprefixed route, ready for `localePath()`. */
  path: string;
  data: SupportEntryData;
}

/**
 * Split a collection entry id (`es/primeros-pasos/alta-de-negocio`) into its
 * parts. Returns `null` for anything that does not match that shape, so a
 * stray file cannot 500 a listing page.
 */
export function parseSupportId(
  id: string,
): { locale: Locale; category: SupportCategoryId; slug: string } | null {
  const [locale, category, slug, ...rest] = id.split("/");
  if (rest.length > 0) return null;
  if (!isLocale(locale) || !isSupportCategory(category) || !slug) return null;
  return { locale, category, slug };
}

/** Locale's articles, drafts excluded unless asked, sorted for listings. */
export function supportArticles<T extends SupportEntryLike>(
  entries: T[],
  locale: Locale | string | undefined,
  options: { includeDrafts?: boolean } = {},
): SupportArticle<T>[] {
  const target = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const articles: SupportArticle<T>[] = [];

  for (const entry of entries) {
    const parsed = parseSupportId(entry.id);
    if (!parsed || parsed.locale !== target) continue;
    if (entry.data.draft && !options.includeDrafts) continue;
    articles.push({
      entry,
      locale: parsed.locale,
      category: parsed.category,
      slug: parsed.slug,
      path: supportPath(parsed.category, parsed.slug),
      data: entry.data,
    });
  }

  return articles.sort(sortArticles);
}

/** Category order first (as declared), then `order`, then title. */
function sortArticles(a: SupportArticle, b: SupportArticle): number {
  const byCategory =
    SUPPORT_CATEGORY_IDS.indexOf(a.category) -
    SUPPORT_CATEGORY_IDS.indexOf(b.category);
  if (byCategory !== 0) return byCategory;
  if (a.data.order !== b.data.order) return a.data.order - b.data.order;
  return a.data.title.localeCompare(b.data.title);
}

export interface SupportCategory<T extends SupportEntryLike = SupportEntryLike> {
  id: SupportCategoryId;
  icon: string;
  path: string;
  articles: SupportArticle<T>[];
  tourCount: number;
}

/** Every category, in declaration order, even when it has no article yet. */
export function supportCategories<T extends SupportEntryLike>(
  articles: SupportArticle<T>[],
): SupportCategory<T>[] {
  return SUPPORT_CATEGORY_IDS.map((id) => {
    const inCategory = articles.filter((article) => article.category === id);
    return {
      id,
      icon: SUPPORT_CATEGORY_ICONS[id],
      path: supportPath(id),
      articles: inCategory,
      tourCount: inCategory.filter((article) => article.data.tour).length,
    };
  });
}

/** Find one article by category + slug (the `[category]/[slug]` route). */
export function findSupportArticle<T extends SupportEntryLike>(
  articles: SupportArticle<T>[],
  category: string,
  slug: string,
): SupportArticle<T> | undefined {
  return articles.find(
    (article) => article.category === category && article.slug === slug,
  );
}

/** Neighbours inside the same category, for the "continue with" block. */
export function relatedSupportArticles<T extends SupportEntryLike>(
  articles: SupportArticle<T>[],
  current: SupportArticle<T>,
  limit = 3,
): SupportArticle<T>[] {
  const sameCategory = articles.filter(
    (article) =>
      article.category === current.category && article.slug !== current.slug,
  );
  const rest = articles.filter(
    (article) =>
      article.category !== current.category && article.slug !== current.slug,
  );
  return [...sameCategory, ...rest].slice(0, limit);
}
