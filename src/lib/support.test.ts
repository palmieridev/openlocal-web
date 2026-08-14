import { describe, expect, it } from "vitest";
import {
  findSupportArticle,
  parseSupportId,
  relatedSupportArticles,
  supportArticles,
  supportCategories,
  supportPath,
  type SupportEntryLike,
} from "./support";

const entry = (
  id: string,
  partial: Partial<SupportEntryLike["data"]> = {},
): SupportEntryLike => ({
  id,
  data: {
    title: "Título",
    description: "Descripción",
    category: (id.split("/")[1] ?? "primeros-pasos") as never,
    order: 0,
    updated: new Date("2026-08-01"),
    readingMinutes: 4,
    draft: false,
    ...partial,
  },
});

describe("parseSupportId", () => {
  it("splits locale, category and slug", () => {
    expect(parseSupportId("es/primeros-pasos/alta-de-negocio")).toEqual({
      locale: "es",
      category: "primeros-pasos",
      slug: "alta-de-negocio",
    });
  });

  it("rejects unknown locales, unknown categories and extra segments", () => {
    expect(parseSupportId("fr/primeros-pasos/alta")).toBeNull();
    expect(parseSupportId("es/ventas/alta")).toBeNull();
    expect(parseSupportId("es/primeros-pasos/alta/extra")).toBeNull();
    expect(parseSupportId("alta-de-negocio")).toBeNull();
  });
});

describe("supportPath", () => {
  it("builds the unprefixed route", () => {
    expect(supportPath()).toBe("/soporte");
    expect(supportPath("inventario")).toBe("/soporte/inventario");
    expect(supportPath("inventario", "movimientos")).toBe(
      "/soporte/inventario/movimientos",
    );
  });
});

describe("supportArticles", () => {
  const entries = [
    entry("en/primeros-pasos/alta-de-negocio"),
    entry("es/inventario/movimientos", { order: 1 }),
    entry("es/primeros-pasos/alta-de-negocio", { order: 1 }),
    entry("es/primeros-pasos/crea-tu-cuenta", { order: 0 }),
    entry("es/primeros-pasos/borrador", { draft: true }),
    entry("es/not-a-category/suelto"),
  ];

  it("keeps only the requested locale and drops drafts and stray files", () => {
    const articles = supportArticles(entries, "es");
    expect(articles.map((a) => a.slug)).toEqual([
      "crea-tu-cuenta",
      "alta-de-negocio",
      "movimientos",
    ]);
  });

  it("includes drafts when asked", () => {
    const slugs = supportArticles(entries, "es", { includeDrafts: true }).map(
      (a) => a.slug,
    );
    expect(slugs).toContain("borrador");
  });

  it("falls back to the default locale for unknown input", () => {
    expect(supportArticles(entries, "fr")).toHaveLength(3);
  });
});

describe("supportCategories", () => {
  it("lists every category in declaration order and counts tours", () => {
    const articles = supportArticles(
      [
        entry("es/inventario/movimientos", { tour: "movimiento-inventario" }),
        entry("es/primeros-pasos/alta-de-negocio", { tour: "alta-de-negocio" }),
        entry("es/primeros-pasos/crea-tu-cuenta"),
      ],
      "es",
    );
    const categories = supportCategories(articles);

    expect(categories).toHaveLength(6);
    expect(categories[0]?.id).toBe("primeros-pasos");
    expect(categories[0]?.articles).toHaveLength(2);
    expect(categories[0]?.tourCount).toBe(1);
    expect(categories[5]?.articles).toHaveLength(0);
  });
});

describe("findSupportArticle / relatedSupportArticles", () => {
  const articles = supportArticles(
    [
      entry("es/primeros-pasos/alta-de-negocio"),
      entry("es/primeros-pasos/crea-tu-cuenta", { order: 1 }),
      entry("es/inventario/movimientos"),
      entry("es/analitica/bajo-stock"),
    ],
    "es",
  );

  it("finds by category and slug", () => {
    expect(findSupportArticle(articles, "inventario", "movimientos")?.slug).toBe(
      "movimientos",
    );
    expect(findSupportArticle(articles, "inventario", "nope")).toBeUndefined();
  });

  it("prefers same-category neighbours and never repeats the current one", () => {
    const current = findSupportArticle(
      articles,
      "primeros-pasos",
      "alta-de-negocio",
    )!;
    const related = relatedSupportArticles(articles, current);
    expect(related.map((a) => a.slug)).toEqual([
      "crea-tu-cuenta",
      "movimientos",
      "bajo-stock",
    ]);
  });
});
