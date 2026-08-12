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
  location: {
    fixedLabel: "Local fijo",
    fixedDescription: "Tienes una dirección donde los clientes te visitan.",
    mobileLabel: "Negocio móvil",
    mobileDescription: "No tienes local: das servicio en la ubicación del cliente.",
    hybridLabel: "Local y servicio a domicilio",
    hybridDescription: "Tienes local y además vas a la ubicación del cliente.",
  },
  areas: {
    atLeastOne:
      "Agrega al menos una zona de servicio (estado y, si aplica, municipio o colonia).",
    tooMany: "Puedes agregar hasta {max} zonas de servicio.",
    rowFallback: "Zona {index}",
    missingCountry: "{label}: falta el país.",
    missingState: "{label}: falta el estado.",
    nameLength: "{label}: el nombre de la zona debe tener entre {min} y {max} caracteres.",
    fallbackName: "Zona de servicio",
    postal: "CP {code}",
  },
  errors: {
    notFoundTitle: "Página no encontrada — Openlocal",
    notFoundMeta: "La página que buscas no existe o fue movida.",
    notFoundHeading: "Página no encontrada",
    notFoundBody:
      "La página que buscas no existe o fue movida. Explora el marketplace para descubrir negocios locales cerca de ti.",
    serverTitle: "Algo salió mal — Openlocal",
    serverMeta: "Ocurrió un error inesperado. Intenta de nuevo en unos momentos.",
    serverHeading: "Algo salió mal",
    serverBody:
      "Ocurrió un error inesperado de nuestro lado. Ya estamos en ello — intenta de nuevo en unos momentos.",
    goMarketplace: "Ir al marketplace",
    backHome: "Volver al inicio",
  },
  /** Opening hours (`src/lib/hours.ts`); also shipped to islands. */
  hours: {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
    open: "Abierto",
    closed: "Cerrado",
    /** Day runs: `{lastLower}` exists so Spanish can write "Lunes a viernes". */
    runTwo: "{first} y {lastLower}",
    runRange: "{first} a {lastLower}",
    dayFallback: "Día {day}",
    missingTime: "{day}: falta la hora de apertura o de cierre.",
    sameTime: "{day}: la apertura y el cierre no pueden ser iguales.",
  },
  product: {
    imageAlt: "Imagen de {name}",
    viewFullImage: "Ver imagen completa de {name}",
    countOne: "{count} producto",
    countOther: "{count} productos",
  },
  lightbox: {
    close: "Cerrar imagen",
    zoomOut: "Alejar",
    zoomIn: "Acercar",
    viewFull: "Ver la imagen completa",
    fallbackCaption: "Imagen",
  },
};

/** Shape every locale dictionary must implement. */
export type Dict = typeof es;
