import { describe, expect, it } from "vitest";
import {
  decimalTotal,
  normalizePhone,
  requestWhatsApp,
  appointmentICS,
  formatModuleDate,
} from "./modules";
import { routeAllowed, sameOrigin } from "./api/module-relay";
import type { ModuleRequest } from "@/types/modules";
const record = {
  public_id: "reference-id",
  reference: "OL-42",
  module: "appointments",
  status: "requested",
  customer_name: "María",
  customer_phone: "+52 5512345678",
  service_name: "Corte",
  starts_at: "2026-09-16T17:00:00Z",
  ends_at: "2026-09-16T18:00:00Z",
  created_at: "2026-09-01T12:00:00Z",
  timezone: "America/Mexico_City",
  business: { name: "Negocio", slug: "negocio", whatsapp: "+525512345678" },
  management_token: "private-secret",
} as ModuleRequest;
describe("operational module safety", () => {
  it("keeps fractional kg arithmetic exact", () => {
    expect(decimalTotal("1.125", "79.99")).toBe("89.99");
    expect(decimalTotal("0.100", "0.10")).toBe("0.01");
  });
  it("does not add the legacy Mexican country-code digit", () => {
    expect(normalizePhone("+52 55 1234 5678")).toBe("525512345678");
    expect(normalizePhone("javascript:alert(1)")).toBeNull();
  });
  it("generates localized summaries without leaking credentials", () => {
    const url = decodeURIComponent(requestWhatsApp(record, "es")!);
    expect(url).toContain("OL-42");
    expect(url).toContain("Hola");
    expect(url).not.toContain("private-secret");
    expect(requestWhatsApp(record, "en")).toContain("Hello");
  });
  it("renders time in the business timezone and uses UTC calendar instants", () => {
    expect(formatModuleDate(record.starts_at, record.timezone, "en")).toContain(
      "11:00",
    );
    expect(appointmentICS(record)).toContain("DTSTART:20260916T170000Z");
  });
  it("only forwards explicitly supported routes/methods", () => {
    expect(routeAllowed("owner/appointments", "POST")).toBe(true);
    expect(routeAllowed("owner/appointments/../billing", "GET")).toBe(false);
    expect(routeAllowed("public/businesses/shop/appointments", "DELETE")).toBe(
      false,
    );
    expect(routeAllowed("owner/users", "GET")).toBe(false);
  });
  it("rejects cross-origin and missing-origin mutations", () => {
    const url = new URL(
      "https://openlocal.store/api/modules/owner/appointments",
    );
    expect(
      sameOrigin(
        new Request(url, { headers: { Origin: "https://evil.example" } }),
        url,
      ),
    ).toBe(false);
    expect(sameOrigin(new Request(url), url)).toBe(false);
    expect(
      sameOrigin(new Request(url, { headers: { Origin: url.origin } }), url),
    ).toBe(true);
  });
});
