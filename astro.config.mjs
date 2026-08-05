// @ts-check
import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";
import clerk from "@clerk/astro";
import sentry from "@sentry/astro";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";

// Vercel sets VERCEL=1 at build time; local builds/preview keep the node adapter.
const isVercel = Boolean(process.env.VERCEL);

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: isVercel
    ? vercel({ webAnalytics: { enabled: true } })
    : node({ mode: "standalone" }),
  integrations: [
    clerk(),
    icon({ iconDir: "src/icons" }),
    // Error monitoring is opt-in: without a DSN the integration stays out of
    // the bundle entirely.
    ...(process.env.SENTRY_DSN
      ? [
          sentry({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.VERCEL_ENV ?? "development",
            sourceMapsUploadOptions: {
              enabled: Boolean(process.env.SENTRY_AUTH_TOKEN),
              authToken: process.env.SENTRY_AUTH_TOKEN,
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
            },
          }),
        ]
      : []),
  ],
  server: {
    host: "0.0.0.0",
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Allow the ngrok tunnel host (dev only) — Vite blocks unknown hosts.
      allowedHosts: [".ngrok-free.dev"],
    },
  },
  env: {
    schema: {
      // Public marketplace/storefront data comes from the Openlocal API.
      PUBLIC_API_BASE_URL: envField.string({
        context: "client",
        access: "public",
        default: "http://localhost:8080",
      }),
      // Vercel Blob token for image uploads. Optional so builds/local dev work
      // without it; the upload route returns 503 when unset. Read at runtime, so
      // the k8s dev image can supply it via a Secret (not baked at build time).
      BLOB_READ_WRITE_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
});
