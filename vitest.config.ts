/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

// getViteConfig loads the project's Astro config so astro:* virtual modules
// (astro:env/client in src/lib/api/client.ts) resolve inside tests.
export default getViteConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
