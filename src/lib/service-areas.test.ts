import { describe, expect, it } from "vitest";
import {
  allowsPickup,
  buildServiceAreasPayload,
  businessLocationMode,
  dedupeServiceAreaRows,
  emptyServiceAreaRow,
  formatServiceAreas,
  hasFixedLocation,
  hasMapPin,
  isBlankServiceAreaRow,
  normalizeLocationMode,
  normalizeServiceAreaRow,
  serviceAreaLabel,
  serviceAreaLabels,
  serviceAreaRows,
  servesAtCustomerLocation,
  validateServiceAreas,
  type ServiceAreaFormRow,
} from "./service-areas";
import type { Business, ServiceArea } from "@/types/api";

const row = (partial: Partial<ServiceAreaFormRow> = {}): ServiceAreaFormRow => ({
  ...emptyServiceAreaRow(),
  ...partial,
});

describe("normalizeLocationMode", () => {
  it("accepts the three known modes", () => {
    expect(normalizeLocationMode("fixed")).toBe("fixed");
    expect(normalizeLocationMode("mobile")).toBe("mobile");
    expect(normalizeLocationMode("hybrid")).toBe("hybrid");
  });

  it("is case and whitespace tolerant", () => {
    expect(normalizeLocationMode(" Mobile ")).toBe("mobile");
  });

  it("falls back to fixed for legacy payloads and junk", () => {
    // Businesses created before location modes existed have no field at all.
    expect(normalizeLocationMode(undefined)).toBe("fixed");
    expect(normalizeLocationMode(null)).toBe("fixed");
    expect(normalizeLocationMode("")).toBe("fixed");
    expect(normalizeLocationMode("roaming")).toBe("fixed");
    expect(normalizeLocationMode(3)).toBe("fixed");
  });
});

describe("mode capabilities", () => {
  it("keeps an address for fixed and hybrid only", () => {
    expect(hasFixedLocation("fixed")).toBe(true);
    expect(hasFixedLocation("hybrid")).toBe(true);
    expect(hasFixedLocation("mobile")).toBe(false);
  });

  it("travels to the customer for mobile and hybrid", () => {
    expect(servesAtCustomerLocation("mobile")).toBe(true);
    expect(servesAtCustomerLocation("hybrid")).toBe(true);
    expect(servesAtCustomerLocation("fixed")).toBe(false);
  });

  it("disables pickup for a mobile business", () => {
    // No premises means nowhere to pick anything up. Delivery is separate and
    // stays available in every mode.
    expect(allowsPickup("mobile")).toBe(false);
    expect(allowsPickup("fixed")).toBe(true);
    expect(allowsPickup("hybrid")).toBe(true);
  });
});

describe("normalizeServiceAreaRow", () => {
  it("trims fields and upper-cases the country", () => {
    expect(
      normalizeServiceAreaRow({ country: " mx ", state: " CDMX ", city: "  ", name: " Centro " }),
    ).toEqual({
      name: "Centro",
      country: "MX",
      state: "CDMX",
      municipality: "",
      city: "",
      neighborhood: "",
      postal_code: "",
    });
  });

  it("treats missing keys as empty", () => {
    expect(normalizeServiceAreaRow({})).toEqual(emptyServiceAreaRow(""));
  });
});

describe("isBlankServiceAreaRow", () => {
  it("ignores the pre-filled country", () => {
    // The editor seeds every new row with MX; that alone is not an area.
    expect(isBlankServiceAreaRow(emptyServiceAreaRow())).toBe(true);
  });

  it("counts any narrower field as content", () => {
    expect(isBlankServiceAreaRow(row({ state: "Jalisco" }))).toBe(false);
    expect(isBlankServiceAreaRow(row({ postal_code: "06700" }))).toBe(false);
    expect(isBlankServiceAreaRow(row({ name: "Zona centro" }))).toBe(false);
  });
});

describe("serviceAreaRows", () => {
  it("always offers one row to fill", () => {
    expect(serviceAreaRows([])).toEqual([emptyServiceAreaRow()]);
    expect(serviceAreaRows(undefined)).toEqual([emptyServiceAreaRow()]);
  });

  it("maps null geographies back to empty strings", () => {
    const areas: ServiceArea[] = [
      { name: null, country: "MX", state: "CDMX", municipality: null, city: null, neighborhood: "Roma Norte", postal_code: null },
    ];
    expect(serviceAreaRows(areas)).toEqual([
      row({ country: "MX", state: "CDMX", neighborhood: "Roma Norte" }),
    ]);
  });
});

describe("validateServiceAreas", () => {
  it("requires at least one area for mobile and hybrid", () => {
    expect(validateServiceAreas([emptyServiceAreaRow()], "mobile")).toMatch(/al menos una zona/i);
    expect(validateServiceAreas([emptyServiceAreaRow()], "hybrid")).toMatch(/al menos una zona/i);
  });

  it("requires nothing for a fixed business", () => {
    expect(validateServiceAreas([emptyServiceAreaRow()], "fixed")).toBeNull();
  });

  it("requires country and state on every filled row", () => {
    expect(validateServiceAreas([row({ city: "Guadalajara", country: "" })], "mobile")).toMatch(/país/i);
    expect(validateServiceAreas([row({ city: "Guadalajara" })], "mobile")).toMatch(/estado/i);
  });

  it("names the offending row", () => {
    expect(validateServiceAreas([row({ name: "Zona sur", city: "Toluca" })], "mobile")).toBe(
      "Zona sur: falta el estado.",
    );
    expect(validateServiceAreas([row({ city: "Toluca" })], "mobile")).toBe("Zona 1: falta el estado.");
  });

  it("ignores blank rows around a valid one", () => {
    expect(
      validateServiceAreas(
        [emptyServiceAreaRow(), row({ state: "CDMX" }), emptyServiceAreaRow()],
        "mobile",
      ),
    ).toBeNull();
  });

  it("still validates stray rows left on a fixed business", () => {
    expect(validateServiceAreas([row({ city: "Toluca" })], "fixed")).toMatch(/estado/i);
  });
});

describe("dedupeServiceAreaRows", () => {
  it("collapses the same geography typed twice, keeping the first name", () => {
    const rows = [
      row({ name: "Centro", state: "CDMX", city: "Ciudad de México" }),
      row({ name: "Otra", state: "cdmx", city: "ciudad de méxico" }),
    ];
    expect(dedupeServiceAreaRows(rows)).toEqual([
      row({ name: "Centro", state: "CDMX", city: "Ciudad de México" }),
    ]);
  });
});

describe("buildServiceAreasPayload", () => {
  it("drops blanks and sends nulls, never empty strings", () => {
    // The API stores these as nullable text; "" would mean "the area whose city
    // is the empty string", not "unspecified".
    expect(
      buildServiceAreasPayload([
        emptyServiceAreaRow(),
        row({ state: "CDMX", neighborhood: "Roma Norte" }),
      ]),
    ).toEqual([
      {
        name: null,
        country: "MX",
        state: "CDMX",
        municipality: null,
        city: null,
        neighborhood: "Roma Norte",
        postal_code: null,
      },
    ]);
  });

  it("keeps the country when a row omitted it", () => {
    expect(buildServiceAreasPayload([row({ country: "", state: "CDMX" })])[0].country).toBe("MX");
  });

  it("returns an empty array when nothing was filled in", () => {
    expect(buildServiceAreasPayload([emptyServiceAreaRow(), emptyServiceAreaRow()])).toEqual([]);
  });
});

describe("serviceAreaLabel", () => {
  const area = (partial: Partial<ServiceArea>): ServiceArea => ({
    country: "MX",
    state: "CDMX",
    ...partial,
  });

  it("prefers the owner's own name", () => {
    expect(serviceAreaLabel(area({ name: "Zona centro", city: "Ciudad de México" }))).toBe("Zona centro");
  });

  it("reads narrowest first", () => {
    expect(serviceAreaLabel(area({ neighborhood: "Roma Norte", city: "Ciudad de México" }))).toBe(
      "Roma Norte, Ciudad de México, CDMX",
    );
  });

  it("uses the municipality only when there is no city", () => {
    expect(serviceAreaLabel(area({ municipality: "Cuauhtémoc" }))).toBe("Cuauhtémoc, CDMX");
    expect(serviceAreaLabel(area({ municipality: "Cuauhtémoc", city: "CDMX" }))).toBe("CDMX, CDMX");
  });

  it("falls back to the postal code alone", () => {
    expect(serviceAreaLabel({ country: "MX", state: "", postal_code: "06700" })).toBe("CP 06700");
  });

  it("appends the postal code to a named geography", () => {
    expect(serviceAreaLabel(area({ city: "Toluca", postal_code: "50000" }))).toBe(
      "Toluca, CDMX (CP 50000)",
    );
  });
});

describe("formatServiceAreas", () => {
  const areas: ServiceArea[] = [
    { country: "MX", state: "CDMX", neighborhood: "Roma Norte" },
    { country: "MX", state: "CDMX", neighborhood: "Condesa" },
    { country: "MX", state: "CDMX", neighborhood: "Del Valle" },
  ];

  it("summarises with an overflow counter", () => {
    expect(formatServiceAreas(areas)).toBe("Roma Norte, CDMX · Condesa, CDMX +1");
  });

  it("omits the counter when everything fits", () => {
    expect(formatServiceAreas(areas.slice(0, 1))).toBe("Roma Norte, CDMX");
  });

  it("is empty for no coverage", () => {
    expect(formatServiceAreas([])).toBe("");
    expect(formatServiceAreas(undefined)).toBe("");
  });

  it("de-duplicates identical labels", () => {
    expect(serviceAreaLabels([areas[0], { ...areas[0] }])).toEqual(["Roma Norte, CDMX"]);
  });
});

describe("hasMapPin", () => {
  const business = (partial: Partial<Business>): Business =>
    ({
      id: "b1",
      name: "Test",
      slug: "test",
      description: "",
      business_type: "retail",
      pickup_available: true,
      delivery_available: false,
      ...partial,
    }) as Business;

  it("plots a fixed business with coordinates", () => {
    expect(hasMapPin(business({ latitude: "19.43", longitude: "-99.13" }))).toBe(true);
    expect(
      hasMapPin(business({ location_mode: "hybrid", latitude: "19.43", longitude: "-99.13" })),
    ).toBe(true);
  });

  it("never plots a mobile business, even if stale coordinates linger", () => {
    // A business that switched to mobile may still carry its old pin in the DB;
    // showing it would put the shopper at an address that no longer exists.
    expect(
      hasMapPin(business({ location_mode: "mobile", latitude: "19.43", longitude: "-99.13" })),
    ).toBe(false);
  });

  it("skips missing or unparseable coordinates", () => {
    expect(hasMapPin(business({}))).toBe(false);
    expect(hasMapPin(business({ latitude: "", longitude: "" }))).toBe(false);
    expect(hasMapPin(business({ latitude: "n/a", longitude: "-99.13" }))).toBe(false);
    expect(hasMapPin(null)).toBe(false);
  });
});

describe("businessLocationMode", () => {
  it("defaults to fixed", () => {
    expect(businessLocationMode(null)).toBe("fixed");
    expect(businessLocationMode({})).toBe("fixed");
    expect(businessLocationMode({ location_mode: "mobile" })).toBe("mobile");
  });
});
