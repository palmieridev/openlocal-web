import type { TourCopy } from "./copy-types";

/** Prose for each tour step, keyed by tour id and step anchor. */
export const tourCopy: TourCopy = {
  "recorrido-del-panel": {
    title: "Recorrido del panel",
    steps: {
      stats: {
        title: "Tu resumen del día",
        description:
          "Ventas, productos publicados y alertas de inventario. Se calcula con los movimientos que registras, así que empieza a llenarse en cuanto anotas el primero.",
      },
      "nav-productos": {
        title: "Aquí vive tu catálogo",
        description:
          "Productos es donde creas artículos y sus variantes (tamaño, color, presentación). Un producto necesita al menos una variante para aparecer en tu tienda.",
      },
      "nav-inventario": {
        title: "Existencias y movimientos",
        description:
          "Cada entrada o salida se registra aquí. El primer movimiento de una variante crea su nivel de stock: publicar un producto no lo hace por sí solo.",
      },
      "nav-analitica": {
        title: "Qué reponer y cuándo",
        description:
          "Bajo stock te dice qué se está acabando; EOQ calcula cuánto conviene pedir en cada compra.",
      },
      "nav-tienda": {
        title: "Tu tienda pública",
        description:
          "Abre lo que ven tus clientes. Los productos públicos con variante aparecen ahí, junto con tus horarios y tu WhatsApp.",
      },
    },
  },
  "crear-producto": {
    title: "Crear un producto",
    steps: {
      "product-new": {
        title: "Empieza por aquí",
        description:
          "Nuevo producto abre el formulario: nombre, categoría y descripción. Después le agregas variantes con precio y existencias.",
      },
      "product-filters": {
        title: "Filtra por lo que se ve en tienda",
        description:
          "En tienda son los productos con al menos una variante visible; Sin publicar, los que hoy no muestran ninguna tarjeta, ya sea porque el producto está oculto, porque no tiene variantes o porque las escondiste todas.",
      },
      "product-search": {
        title: "Busca sin scroll",
        description:
          "Filtra por nombre, marca o slug conforme escribes. Útil cuando el catálogo ya pasa de un par de pantallas.",
      },
      "product-table": {
        title: "Revisa la columna Público",
        description:
          "Dice cuántas variantes se ven en tu tienda: «3 de 4» son tres tarjetas publicadas de cuatro variantes. Recuerda: visible ≠ con inventario; el stock se lleva en Inventario.",
      },
    },
  },
  "registrar-movimiento": {
    title: "Registrar un movimiento",
    steps: {
      "movement-new": {
        title: "Registra entradas y salidas",
        description:
          "Elige la variante, el tipo de movimiento (compra, venta, ajuste, merma) y la cantidad. El primer movimiento crea el nivel de stock de esa variante.",
      },
      "inventory-tabs": {
        title: "Dos vistas del mismo dato",
        description:
          "Existencias muestra cuánto tienes ahora; Movimientos, el historial que lo explica.",
      },
      "stock-table": {
        title: "Tus niveles actuales",
        description:
          "Cantidad disponible por variante. Si algo no aparece aquí, es que todavía no tiene ningún movimiento registrado.",
      },
    },
  },
};

export default tourCopy;
