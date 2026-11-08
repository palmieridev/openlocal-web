import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Node builds don't emit the Vercel route table. Every Vercel preview and
// production build runs this check before it can be deployed successfully.
if (!process.env.VERCEL) process.exit(0);

// Test the adapter's actual output: Astro dev and the Node adapter don't apply
// Vercel's route-level status overrides, so runtime unit tests missed this.
const { routes } = JSON.parse(
  await readFile(new URL("../.vercel/output/config.json", import.meta.url), "utf8"),
);

for (const path of ["/en", "/en/marketplace", "/en/dashboard/share", "/es/dashboard/share", "/admin", "/admin/activity", "/admin/businesses/example", "/en/admin", "/en/admin/activity", "/en/admin/businesses/example", "/api/admin/businesses/11111111-1111-4111-8111-111111111111/grants", "/api/admin/businesses/11111111-1111-4111-8111-111111111111/grants/22222222-2222-4222-8222-222222222222/revoke"]) {
  const route = routes.find((entry) => entry.src && !entry.continue && new RegExp(entry.src).test(path));
  assert.ok(route, `No Vercel route handles ${path}`);
  assert.equal(route.dest, "_render", `${path} must reach the Astro server`);
  assert.equal(route.status, undefined, `${path} must preserve Astro's response status`);
}

console.log("Vercel locale routes preserve Astro pages and redirects.");
