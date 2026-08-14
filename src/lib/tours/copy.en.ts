import type { TourCopy } from "./copy-types";

/** Prose for each tour step, keyed by tour id and step anchor. */
export const tourCopy: TourCopy = {
  "recorrido-del-panel": {
    title: "Dashboard tour",
    steps: {
      stats: {
        title: "Your day at a glance",
        description:
          "Sales, published products and stock alerts. It is computed from the movements you record, so it starts filling up as soon as you log the first one.",
      },
      "nav-productos": {
        title: "Your catalogue lives here",
        description:
          "Products is where you create items and their variants (size, colour, presentation). A product needs at least one variant to show up in your storefront.",
      },
      "nav-inventario": {
        title: "Stock levels and movements",
        description:
          "Every stock in and out is recorded here. A variant's stock level is created by its first movement — publishing a product does not do it on its own.",
      },
      "nav-analitica": {
        title: "What to restock, and when",
        description:
          "Low stock tells you what is running out; EOQ works out how much to order each time.",
      },
      "nav-tienda": {
        title: "Your public storefront",
        description:
          "Opens what your customers see. Public products with a variant show up there, along with your opening hours and WhatsApp number.",
      },
    },
  },
  "crear-producto": {
    title: "Create a product",
    steps: {
      "product-new": {
        title: "Start here",
        description:
          "New product opens the form: name, category and description. You then add variants with their price and stock.",
      },
      "product-filters": {
        title: "Filter by status",
        description:
          "Separates drafts from published items. A draft never shows in your storefront, even when it has variants.",
      },
      "product-search": {
        title: "Find without scrolling",
        description:
          "Filters by name, brand or slug as you type. Handy once the catalogue outgrows a couple of screens.",
      },
      "product-table": {
        title: "Check the Public column",
        description:
          "It tells you whether the product is visible in your storefront. Remember: visible ≠ stocked — stock is tracked in Inventory.",
      },
    },
  },
  "registrar-movimiento": {
    title: "Record a movement",
    steps: {
      "movement-new": {
        title: "Record stock in and out",
        description:
          "Pick the variant, the movement type (purchase, sale, adjustment, shrinkage) and the quantity. The first movement creates that variant's stock level.",
      },
      "inventory-tabs": {
        title: "Two views of the same data",
        description:
          "Stock levels show what you have right now; Movements show the history that explains it.",
      },
      "stock-table": {
        title: "Your current levels",
        description:
          "Quantity on hand per variant. If something is missing here, it has no movements recorded yet.",
      },
    },
  },
};

export default tourCopy;
