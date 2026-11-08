import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ModuleView from "./AdminModule.astro";
import type { AdminModule } from "@/types/admin";

describe("private module inspection", () => {
  it("renders complimentary access and escapes owner-authored content", async () => {
    const container = await AstroContainer.create();
    const access: AdminModule = {
      tier: "business", owned: true, enabled: true, can_accept_new: true,
      can_manage_existing: true, can_configure: true, can_operate: true, can_export: true,
      usage: 4, limit: 1000, max_resources: 5, advanced: true,
      sources: [{ kind: "grant", tier: "business", starts_at: "2026-11-01T00:00:00Z", expires_at: null,
        owner_message: '<script>alert("private content")</script>' }],
    };
    const html = await container.renderToString(ModuleView, {
      props: { module: "appointments", access }, locals: { locale: "en" } as App.Locals,
    });
    expect(html).toContain("Complimentary access");
    expect(html).toContain("No expiration");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
