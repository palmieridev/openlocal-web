import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import View from "./EffectiveAccess.astro";
import type { ModuleEntitlement } from "@/types/modules";

const entry = (tier: ModuleEntitlement["tier"]): ModuleEntitlement => ({
  tier,
  sources: [],
  owned: true,
  enabled: false,
  can_accept_new: false,
  can_manage_existing: true,
  can_configure: true,
  can_operate: true,
  can_export: true,
  usage: 24,
  limit: 50,
  max_resources: 1,
  advanced: false,
});
describe("owner effective access projection", () => {
  it("keeps mixed paid/grant module tiers separate and never renders private extras", async () => {
    const container = await AstroContainer.create();
    const appointments = {
      ...entry("business"),
      sources: [
        {
          kind: "subscription" as const,
          tier: "essential" as const,
          starts_at: "2026-11-01T00:00:00Z",
          expires_at: "2026-12-01T00:00:00Z",
        },
        {
          kind: "grant" as const,
          tier: "business" as const,
          starts_at: "2026-11-07T00:00:00Z",
          expires_at: null,
          owner_message: "<script>Welcome</script>",
          internal_reason: "SECRET_REASON",
          created_by: "SECRET_ACTOR",
          metadata: "SECRET_AUDIT",
          business_id: "OTHER_BUSINESS",
        },
      ],
    };
    const html = await container.renderToString(View, {
      props: { module: "appointments", access: appointments },
      locals: { locale: "en" } as App.Locals,
    });
    expect(html).toContain("Effective level: Business");
    expect(html).toContain("Subscription · Essential");
    expect(html).toContain("Complimentary access · Business");
    expect(html).toContain("No expiration");
    expect(html).toContain("UTC");
    expect(html).toContain("&lt;script&gt;Welcome&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    for (const secret of [
      "SECRET_REASON",
      "SECRET_ACTOR",
      "SECRET_AUDIT",
      "OTHER_BUSINESS",
    ])
      expect(html).not.toContain(secret);
    const pickup = await container.renderToString(View, {
      props: {
        module: "preorders",
        access: { ...entry("essential"), sources: [appointments.sources[0]] },
      },
      locals: { locale: "en" } as App.Locals,
    });
    expect(pickup).toContain("Effective level: Essential");
    expect(pickup).not.toContain("Business");
    expect(pickup).not.toContain("Complimentary");
  });
  it("localizes absent access and finite expiration without inferring a tier", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(View, {
      props: { module: "preorders", access: entry("free") },
      locals: { locale: "es" } as App.Locals,
    });
    expect(html).toContain("Nivel efectivo: Sin acceso de pago");
    expect(html).toContain("No hay fuentes de acceso activas.");
  });
});
