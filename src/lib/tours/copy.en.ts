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
        title: "Filter by what the shop shows",
        description:
          "In the shop lists products with at least one visible variant; Unpublished lists the ones showing no card today — the product is hidden, it has no variants, or you hid them all.",
      },
      "product-search": {
        title: "Find without scrolling",
        description:
          "Filters by name, brand or slug as you type. Handy once the catalogue outgrows a couple of screens.",
      },
      "product-table": {
        title: "Check the Public column",
        description:
          "It shows how many variants your storefront displays: \"3 of 4\" means three published cards out of four variants. Remember: visible ≠ stocked — stock is tracked in Inventory.",
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
  "configurar-citas": {
    title: "Set up Appointments",
    steps: {
      "module-services": {
        title: "Bookable services",
        description:
          "Create each service with a name, duration and optional price. Save its own form and keep it active and public. Catalogue products do not become appointment services automatically.",
      },
      "module-calendars": {
        title: "Who will handle the appointment",
        description:
          "Create and save an active calendar for the person, station or space providing the service. Available options depend on your plan.",
      },
      "module-hours": {
        title: "Available hours",
        description:
          "Uncheck Closed for working days and set opening and closing times. These hours use the business time zone.",
      },
      "module-rules": {
        title: "Notice and closed dates",
        description:
          "Set the minimum notice, how far ahead customers can request and the cancellation deadline. Add closed dates when the business will not offer this service.",
      },
      "module-intake": {
        title: "Open or pause requests",
        description:
          "Enable intake when everything is ready. Pausing keeps existing requests and history. This tour only explains the controls: it does not change this setting.",
      },
      "module-save": {
        title: "Save your settings",
        description:
          "This button saves hours, rules and intake. Services and calendars each have their own save buttons. The tour does not submit forms.",
      },
    },
  },
  "configurar-pedidos": {
    title: "Set up Pickup orders",
    steps: {
      "module-products": {
        title: "Products you will accept",
        description:
          "Select the variants customers can order and set minimum, maximum and increment. For whole pieces, for example, use increment 1. Products must be visible in the storefront.",
      },
      "module-hours": {
        title: "Available hours",
        description:
          "Uncheck Closed for working days and set opening and closing times. These hours use the business time zone.",
      },
      "module-rules": {
        title: "Notice and closed dates",
        description:
          "Set the minimum notice, how far ahead customers can request and the cancellation deadline. Add closed dates when the business will not offer this service.",
      },
      "module-intake": {
        title: "Open or pause requests",
        description:
          "Enable intake when everything is ready. Pausing keeps existing requests and history. This tour only explains the controls: it does not change this setting.",
      },
      "module-save": {
        title: "Save your settings",
        description:
          "This button saves hours, rules and intake. Services and calendars each have their own save buttons. The tour does not submit forms.",
      },
    },
  },
  "gestionar-citas": {
    title: "Manage appointments",
    steps: {
      "module-usage": {
        title: "This period's confirmations",
        description:
          "Each request counts once, when first confirmed. Cancelling it later does not restore quota. Check your limit and renewal here.",
      },
      "module-filters": {
        title: "Find requests to handle",
        description:
          "Filter by date and status, then select Refresh. Appointments also offers calendar filters and a weekly view. A received request is not yet a confirmed booking.",
      },
      "module-requests": {
        title: "Open a request",
        description:
          "Open a record to confirm, reject or update its status. If the list is empty, wait for a storefront request or use New request when available. History is retained.",
      },
    },
  },
  "gestionar-pedidos": {
    title: "Manage pickup orders",
    steps: {
      "module-usage": {
        title: "This period's confirmations",
        description:
          "Each request counts once, when first confirmed. Cancelling it later does not restore quota. Check your limit and renewal here.",
      },
      "module-filters": {
        title: "Find requests to handle",
        description:
          "Filter by date and status, then select Refresh. Appointments also offers calendar filters and a weekly view. A received request is not yet a confirmed booking.",
      },
      "module-requests": {
        title: "Open a request",
        description:
          "Open a record to confirm, reject or update its status. If the list is empty, wait for a storefront request or use New request when available. History is retained.",
      },
    },
  },
  "modulos-y-suscripcion": {
    title: "Modules and subscription",
    steps: {
      "billing-current": {
        title: "What you have today",
        description:
          "Check your active tier, payment status and usage per module. The selection below does not change your subscription until you confirm the process.",
      },
      "billing-plans": {
        title: "Choose a tier",
        description:
          "Select Free, Essential or Business without leaving the page. Current prices and limits appear here. Free starts cancellation management, not an immediate downgrade.",
      },
      "billing-modules": {
        title: "One module or both",
        description:
          "Select Appointments, Pickup orders or both. The second module has an additional charge and shares the tier, but has its own usage counter.",
      },
      "billing-summary": {
        title: "Check the monthly total",
        description:
          "Review the tier, modules and recurring total. This is not necessarily today's charge: a change may involve proration.",
      },
      "billing-review": {
        title: "Review before confirming",
        description:
          "Continue to review the change or start your first checkout. Upgrades may apply now; reductions are scheduled for period end. This tour does not purchase or change your plan.",
      },
    },
  },
};

export default tourCopy;
