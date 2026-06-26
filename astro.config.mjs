// @ts-check
import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";
import clerk from "@clerk/astro";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [clerk(), icon({ iconDir: "src/icons" })],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      // Public marketplace/storefront data comes from the Openlocal API.
      PUBLIC_API_BASE_URL: envField.string({
        context: "client",
        access: "public",
        default: "http://localhost:8080",
      }),
    },
  },
});
