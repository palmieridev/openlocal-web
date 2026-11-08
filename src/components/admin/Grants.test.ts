import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import View from "./Grants.astro";
import type { Grant } from "@/types/admin";
const business = "11111111-1111-4111-8111-111111111111";
const grant: Grant = {
  id: "22222222-2222-4222-8222-222222222222",
  business_id: business,
  module: "appointments",
  tier: "business",
  starts_at: "2026-11-10T00:00:00Z",
  expires_at: "2027-01-01T00:00:00Z",
  indefinite: false,
  status: "scheduled",
  internal_reason: "<private>",
  owner_message: "Welcome",
  created_by: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  version: 4,
  revoked_at: null,
  revoked_by: null,
  revocation_reason: null,
};
describe("grant management SSR", () => {
  it("uses offset links, immutable fields, versions and explicit UTC inputs", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(View, {
      props: {
        businessId: business,
        page: { items: [grant], total: 21, limit: 10, offset: 10 },
        selected: null,
        history: null,
      },
      locals: { locale: "en" } as App.Locals,
      request: new Request(
        `https://openlocal.test/en/admin/businesses/${business}?grant_notice=conflict`,
      ),
    });
    expect(html).toContain('data-version="4"');
    expect(html).toContain("Scheduled");
    expect(html).toContain("Start (UTC)");
    expect(html).toContain("Expiration (UTC, exclusive)");
    expect(html).toContain(`/en/admin/businesses/${business}?`);
    expect(html).toContain("grant_offset=20");
    expect(html).not.toContain("cursor=");
    expect(html).toContain("No automatic retry was made");
    expect(html).toContain("&lt;private&gt;");
    expect(html).toContain("immediate and permanent");
  });
  it("does not offer unsupported extension/revocation for revoked grants", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(View, {
      props: {
        businessId: business,
        page: {
          items: [{ ...grant, status: "revoked" }],
          total: 1,
          limit: 10,
          offset: 0,
        },
        selected: grant.id,
        history: {
          items: [
            {
              id: "event",
              actor_user_id: null,
              action: "access_grant.created",
              at: grant.created_at,
              metadata: {
                internal_reason: "Creation reason",
                before: null,
                after: grant,
              },
            },
          ],
          limit: 10,
          offset: 0,
        },
      },
      locals: { locale: "en" } as App.Locals,
    });
    expect(html).not.toContain('data-action="extend"');
    expect(html).not.toContain('data-action="revoke"');
    expect(html).toContain("Creation reason");
    expect(html).toContain("no mutation entry");
  });
});
