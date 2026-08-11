/**
 * Spanish dictionary — the source of truth for every UI string.
 *
 * Spanish is the default locale, so this file is the one that grows first:
 * add the key here, then add the translation to `en.ts`. That file is typed
 * `satisfies Dict`, so a missing or misspelled key fails `pnpm check` instead
 * of silently falling back to Spanish at runtime.
 *
 * Deliberately *not* `as const`: the widened `string` types are what let the
 * English dictionary satisfy the same shape with different values.
 */
export const es = {
  meta: {
    title: "Openlocal — Comercio local",
    description: "Descubre productos de negocios locales cerca de ti.",
  },
  nav: {
    home: "Inicio",
    marketplace: "Marketplace",
    sell: "Vender",
    signIn: "Iniciar sesión",
    panel: "Panel",
    openMenu: "Abrir menú",
  },
  footer: {
    tagline:
      "Hub de comercio local de código abierto: inventario, tiendas y descubrimiento de productos cerca de ti.",
    explore: "Explorar",
    marketplace: "Marketplace",
    map: "Mapa",
    handmade: "Hecho a mano",
    forBusinesses: "Para negocios",
    sellOnOpenlocal: "Vender en Openlocal",
    dashboard: "Panel de control",
    signIn: "Iniciar sesión",
    project: "Proyecto",
    openSource: "Código abierto",
    about: "Acerca de",
    madeFor: "Hecho para negocios locales en México 🇲🇽",
  },
  auth: {
    backHome: "← Volver al inicio",
  },
  locale: {
    label: "Idioma",
    es: "Español",
    en: "English",
  },
  /** Shared strings that vanilla islands read from `window.__OL_I18N`. */
  common: {
    save: "Guardar",
    saving: "Guardando…",
    create: "Crear",
    creating: "Creando…",
    cancel: "Cancelar",
    close: "Cerrar",
    edit: "Editar",
    delete: "Eliminar",
    retry: "Reintentar",
    loading: "Cargando…",
    error: "Algo salió mal. Intenta de nuevo.",
    required: "Este campo es obligatorio.",
  },
  /** Public stock badges (see `stockMeta` in `src/lib/format.ts`). */
  stock: {
    inStock: "En stock",
    lowStock: "Pocas piezas",
    outOfStock: "Agotado",
    madeToOrder: "Bajo pedido",
    unknown: "Consultar",
  },
};

/** Shape every locale dictionary must implement. */
export type Dict = typeof es;
