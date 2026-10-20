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
  "configurar-citas": {
    title: "Configura Citas",
    steps: {
      "module-services": {
        title: "Servicios que se pueden reservar",
        description:
          "Crea cada servicio con nombre, duración y precio opcional. Guarda su formulario y déjalo activo y público. Los productos del catálogo no se convierten en servicios automáticamente.",
      },
      "module-calendars": {
        title: "Quién atenderá la cita",
        description:
          "Crea y guarda un calendario activo para la persona, estación o espacio que atiende. Las opciones disponibles dependen del plan.",
      },
      "module-hours": {
        title: "Horarios disponibles",
        description:
          "Desmarca Cerrado en los días de atención y define apertura y cierre. Estos horarios se interpretan en la zona horaria del negocio.",
      },
      "module-rules": {
        title: "Anticipación y fechas de cierre",
        description:
          "Define cuánta anticipación necesitas, hasta cuántos días se puede solicitar y el plazo de cancelación. Agrega fechas de cierre cuando no habrá atención.",
      },
      "module-intake": {
        title: "Abre o pausa las solicitudes",
        description:
          "Activa la recepción cuando todo esté listo. Pausar no borra solicitudes ni historial. El recorrido sólo explica los controles: no cambia esta opción.",
      },
      "module-save": {
        title: "Guarda tu configuración",
        description:
          "Este botón guarda horarios, reglas y recepción. Los servicios y calendarios tienen sus propios botones de guardar. El recorrido no envía formularios.",
      },
    },
  },
  "configurar-pedidos": {
    title: "Configura Pedidos para recoger",
    steps: {
      "module-products": {
        title: "Productos que aceptarás",
        description:
          "Marca las variantes que se podrán pedir y define mínimo, máximo e incremento. Por ejemplo, para piezas enteras usa incremento 1. Los productos deben estar visibles en la tienda.",
      },
      "module-hours": {
        title: "Horarios disponibles",
        description:
          "Desmarca Cerrado en los días de atención y define apertura y cierre. Estos horarios se interpretan en la zona horaria del negocio.",
      },
      "module-rules": {
        title: "Anticipación y fechas de cierre",
        description:
          "Define cuánta anticipación necesitas, hasta cuántos días se puede solicitar y el plazo de cancelación. Agrega fechas de cierre cuando no habrá atención.",
      },
      "module-intake": {
        title: "Abre o pausa las solicitudes",
        description:
          "Activa la recepción cuando todo esté listo. Pausar no borra solicitudes ni historial. El recorrido sólo explica los controles: no cambia esta opción.",
      },
      "module-save": {
        title: "Guarda tu configuración",
        description:
          "Este botón guarda horarios, reglas y recepción. Los servicios y calendarios tienen sus propios botones de guardar. El recorrido no envía formularios.",
      },
    },
  },
  "gestionar-citas": {
    title: "Gestiona tus citas",
    steps: {
      "module-usage": {
        title: "Confirmaciones del periodo",
        description:
          "Cada solicitud cuenta una vez, al confirmarse por primera vez. Cancelarla después no devuelve el cupo. Aquí puedes consultar el límite y la renovación.",
      },
      "module-filters": {
        title: "Encuentra lo que necesitas atender",
        description:
          "Filtra por fecha y estado y pulsa Actualizar. En Citas también puedes elegir calendario o vista semanal. Una solicitud recibida todavía no es una reserva confirmada.",
      },
      "module-requests": {
        title: "Abre una solicitud",
        description:
          "Abre un registro para confirmar, rechazar o avanzar su estado. Si la lista está vacía, espera una solicitud de la tienda o usa Nueva solicitud cuando esté disponible. El historial se conserva.",
      },
    },
  },
  "gestionar-pedidos": {
    title: "Gestiona tus pedidos",
    steps: {
      "module-usage": {
        title: "Confirmaciones del periodo",
        description:
          "Cada solicitud cuenta una vez, al confirmarse por primera vez. Cancelarla después no devuelve el cupo. Aquí puedes consultar el límite y la renovación.",
      },
      "module-filters": {
        title: "Encuentra lo que necesitas atender",
        description:
          "Filtra por fecha y estado y pulsa Actualizar. En Citas también puedes elegir calendario o vista semanal. Una solicitud recibida todavía no es una reserva confirmada.",
      },
      "module-requests": {
        title: "Abre una solicitud",
        description:
          "Abre un registro para confirmar, rechazar o avanzar su estado. Si la lista está vacía, espera una solicitud de la tienda o usa Nueva solicitud cuando esté disponible. El historial se conserva.",
      },
    },
  },
  "modulos-y-suscripcion": {
    title: "Módulos y suscripción",
    steps: {
      "billing-current": {
        title: "Lo que tienes hoy",
        description:
          "Consulta el nivel activo, estado de pago y uso por módulo. La selección de abajo no cambia tu suscripción hasta que confirmes el proceso.",
      },
      "billing-plans": {
        title: "Elige un nivel",
        description:
          "Selecciona Free, Essential o Business sin salir de la página. Consulta aquí precios y límites vigentes. Free inicia el proceso de cancelación, no una baja inmediata.",
      },
      "billing-modules": {
        title: "Uno o ambos módulos",
        description:
          "Selecciona Citas, Pedidos para recoger o ambos. El segundo módulo tiene un cargo adicional y comparte el nivel, pero lleva su propio contador.",
      },
      "billing-summary": {
        title: "Revisa el total mensual",
        description:
          "Comprueba nivel, módulos y total recurrente. Este total no es necesariamente el cargo de hoy: un cambio puede tener prorrateo.",
      },
      "billing-review": {
        title: "Revisa antes de confirmar",
        description:
          "Continúa para revisar el cambio o ir al pago inicial. Las mejoras pueden aplicarse ahora; las reducciones se programan al cierre del periodo. El recorrido no compra ni modifica tu plan.",
      },
    },
  },
};

export default tourCopy;
