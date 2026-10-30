# Openlocal

[English](#openlocal-english) · [Español](#openlocal-español)

<a id="openlocal-english"></a>

## English

**Openlocal** is a marketplace and store manager for local businesses. Discover
products from shops near you, and if you sell, run your whole store — catalog,
inventory, and sales — from one place. Built for local commerce in Mexico:
Spanish-first and priced in pesos.

### For shoppers

- **Discover local products** — search by product, shop, or category.
- **Explore on a map** — find businesses near you and browse what's in stock.
- **Browse storefronts** — each shop has its own page with products, hours,
  location, and pickup or delivery info.
- **Contact directly** — message a shop on WhatsApp to buy. No checkout, no
  middleman.
- **Filter your way** — by distance, category, availability, handmade items,
  and pickup or delivery.

### For business owners

- **Your own storefront** — a public page with your catalog, branding, and
  contact details.
- **QR sharing** — download a PNG or printable SVG for your published shop,
  copy its link, or share it on WhatsApp from **Dashboard → Share shop**.
- **Product catalog** — add products with variants, photos, prices,
  categories, and tags. Mark items as handmade, made-to-order, or one-of-a-kind.
- **Barcode & inventory** — scan barcodes to track stock, or generate internal
  codes for products that don't have one.
- **Stock control** — log purchases, sales, and adjustments, and always know
  what you have on hand.
- **Smart insights** — see your best sellers, low-stock alerts, inventory value,
  and reorder recommendations.
- **No sales commissions** — list and sell for free.

### Pricing

Openlocal is free to start: a public listing and basic inventory at no cost.
Paid plans add more products, advanced analytics, image storage, a custom
storefront, and staff accounts.

Openlocal is open source. The store discovery, business profiles, and inventory
tools are free to use, and anyone can contribute or self-host.

---

<a id="openlocal-español"></a>

## Español

**Openlocal** es un mercado y administrador de tiendas para negocios locales.
Descubre productos de tiendas cerca de ti y, si vendes, maneja todo tu negocio
—catálogo, inventario y ventas— desde un solo lugar. Hecho para el comercio
local en México: en español y con precios en pesos.

### Para compradores

- **Descubre productos locales** — busca por producto, negocio o categoría.
- **Explora en el mapa** — encuentra negocios cerca de ti y mira qué hay
  disponible.
- **Visita las tiendas** — cada negocio tiene su propia página con productos,
  horario, ubicación e información de entrega o recoge en tienda.
- **Contacto directo** — escríbele a la tienda por WhatsApp para comprar. Sin
  carrito ni intermediarios.
- **Filtra a tu manera** — por distancia, categoría, disponibilidad, productos
  hechos a mano y entrega o recoge en tienda.

### Para dueños de negocio

- **Tu propia tienda** — una página pública con tu catálogo, tu marca y tus
  datos de contacto.
- **Comparte con QR** — descarga un PNG o SVG para imprimir, copia el enlace
  o compártelo por WhatsApp desde **Panel → Compartir tienda**.
- **Catálogo de productos** — agrega productos con variantes, fotos, precios,
  categorías y etiquetas. Marca artículos hechos a mano, bajo pedido o únicos.
- **Código de barras e inventario** — escanea códigos para controlar el stock,
  o genera códigos internos para productos que no tienen uno.
- **Control de stock** — registra compras, ventas y ajustes, y siempre sabe
  cuánto tienes disponible.
- **Información útil** — conoce tus productos más vendidos, alertas de stock
  bajo, valor del inventario y recomendaciones de reorden.
- **Sin comisiones por venta** — publica y vende gratis.

### Precios

Openlocal es gratis para empezar: listado público e inventario básico sin
costo. Los planes de pago agregan más productos, analítica avanzada,
almacenamiento de imágenes, tienda personalizada y cuentas para tu equipo.

Openlocal es de código abierto. El descubrimiento de tiendas, los perfiles de
negocio y las herramientas de inventario son gratuitas, y cualquiera puede
contribuir o instalarlo por su cuenta.

## Development and delivery / Desarrollo y entrega

Work on feature branches and open pull requests targeting `main`. CI runs checks,
tests, and a build for those pull requests and pushes to `main`. Vercel continues
to build production from source. CI does not build or publish container images.

Trabaja en ramas de funcionalidades y abre pull requests hacia `main`. CI ejecuta
verificaciones, pruebas y una compilación para esos pull requests y los pushes a
`main`. Vercel sigue compilando producción desde el código fuente. CI no compila
ni publica imágenes de contenedor.

For localhost testing / Para probar en localhost:

```sh
cp .env.example .env.local
# Set your local Clerk keys in .env.local / Configura tus claves locales de Clerk en .env.local
pnpm install --frozen-lockfile
pnpm dev
```

The web app runs at `http://localhost:4321`; the default API URL is
`http://localhost:8080`. / La web corre en `http://localhost:4321`; la URL de la
API por defecto es `http://localhost:8080`.

Manual Docker builds remain available for local or self-hosted use. Set the
public build arguments for your environment; these values are embedded in the
browser bundle. Supply server credentials at runtime through your local `.env.local`.

Puedes compilar Docker manualmente para uso local o alojamiento propio. Configura
los argumentos públicos de compilación para tu entorno; estos valores se incluyen
en el código del navegador. Proporciona las credenciales del servidor al ejecutar
el contenedor mediante tu archivo `.env.local` local.

```sh
docker build -t openlocal-web:local \
  --build-arg PUBLIC_API_BASE_URL="http://<host-lan-ip>:8080" \
  --build-arg PUBLIC_CLERK_PUBLISHABLE_KEY="<your-publishable-key>" .
docker run --rm -p 4321:4321 --env-file .env.local \
  -e OL_INSECURE_COOKIES=1 openlocal-web:local
```

Replace `<host-lan-ip>` with a host address reachable from both the browser and
the container. `OL_INSECURE_COOKIES=1` is for local HTTP testing only. / Sustituye
`<host-lan-ip>` por una dirección del host accesible desde el navegador y el
contenedor. `OL_INSECURE_COOKIES=1` es solo para pruebas locales por HTTP.
