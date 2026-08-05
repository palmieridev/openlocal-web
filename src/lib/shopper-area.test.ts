import { describe, expect, it } from "vitest";
import {
  emptyShopperArea,
  isShopperAreaEmpty,
  normalizeShopperArea,
  parseShopperArea,
  shopperAreaFromNominatim,
  shopperAreaLabel,
  shopperAreaQuery,
  shopperAreaSearchParams,
} from "./shopper-area";

describe("normalizeShopperArea", () => {
  it("trims and upper-cases the country", () => {
    expect(normalizeShopperArea({ country: " mx ", city: " Toluca " })).toEqual({
      ...emptyShopperArea(),
      country: "MX",
      city: "Toluca",
    });
  });
});

describe("isShopperAreaEmpty", () => {
  it("treats a bare country as no filter", () => {
    // The form pre-fills MX; filtering the whole marketplace by it is a no-op.
    expect(isShopperAreaEmpty({ country: "MX" })).toBe(true);
    expect(isShopperAreaEmpty(emptyShopperArea())).toBe(true);
  });

  it("counts any narrower field", () => {
    expect(isShopperAreaEmpty({ country: "MX", state: "CDMX" })).toBe(false);
    expect(isShopperAreaEmpty({ postal_code: "06700" })).toBe(false);
  });
});

describe("parseShopperArea", () => {
  it("reads the geography keys off the URL", () => {
    const params = new URLSearchParams("q=pan&state=CDMX&neighborhood=Roma+Norte&map=1");
    expect(parseShopperArea(params)).toEqual({
      ...emptyShopperArea(),
      state: "CDMX",
      neighborhood: "Roma Norte",
    });
  });

  it("is empty for a bare URL", () => {
    expect(parseShopperArea(new URLSearchParams())).toEqual(emptyShopperArea());
  });
});

describe("shopperAreaQuery", () => {
  it("sends only the filled geographies", () => {
    expect(shopperAreaQuery({ country: "MX", state: "CDMX", city: "" })).toEqual({
      country: "MX",
      state: "CDMX",
    });
  });

  it("sends nothing when only the country is set", () => {
    expect(shopperAreaQuery({ country: "MX" })).toEqual({});
    expect(shopperAreaQuery(emptyShopperArea())).toEqual({});
  });
});

describe("shopperAreaSearchParams", () => {
  it("merges onto the existing query without touching other params", () => {
    const base = new URLSearchParams("q=pan&map=1");
    const params = shopperAreaSearchParams({ country: "MX", state: "CDMX" }, base);
    expect(params.get("q")).toBe("pan");
    expect(params.get("map")).toBe("1");
    expect(params.get("state")).toBe("CDMX");
    expect(params.get("country")).toBe("MX");
  });

  it("clears every geography key when the area is wiped", () => {
    const base = new URLSearchParams("q=pan&country=MX&state=CDMX&postal_code=06700");
    const params = shopperAreaSearchParams(emptyShopperArea(), base);
    expect(params.toString()).toBe("q=pan");
  });

  it("drops the country too when nothing narrower survives", () => {
    const base = new URLSearchParams("country=MX&state=CDMX");
    expect(shopperAreaSearchParams({ country: "MX" }, base).toString()).toBe("");
  });
});

describe("shopperAreaLabel", () => {
  it("reads narrowest first", () => {
    expect(shopperAreaLabel({ neighborhood: "Roma Norte", city: "Ciudad de México", state: "CDMX" })).toBe(
      "Roma Norte, Ciudad de México, CDMX",
    );
  });

  it("falls back to the postal code", () => {
    expect(shopperAreaLabel({ postal_code: "06700" })).toBe("CP 06700");
  });

  it("is empty when nothing is set", () => {
    expect(shopperAreaLabel(emptyShopperArea())).toBe("");
  });
});

describe("shopperAreaFromNominatim", () => {
  it("maps a Mexico City reverse lookup", () => {
    expect(
      shopperAreaFromNominatim({
        country_code: "mx",
        state: "Ciudad de México",
        city: "Ciudad de México",
        city_district: "Cuauhtémoc",
        neighbourhood: "Roma Norte",
        postcode: "06700",
      }),
    ).toEqual({
      country: "MX",
      state: "Ciudad de México",
      municipality: "Cuauhtémoc",
      city: "Ciudad de México",
      neighborhood: "Roma Norte",
      postal_code: "06700",
    });
  });

  it("falls back through the OSM aliases", () => {
    // Smaller towns come back as town/village with the municipio in county.
    expect(
      shopperAreaFromNominatim({
        country_code: "mx",
        state: "Jalisco",
        town: "Tequila",
        county: "Tequila",
        suburb: "Centro",
      }),
    ).toEqual({
      country: "MX",
      state: "Jalisco",
      // The municipio repeats the town here, so it is not duplicated.
      municipality: "",
      city: "Tequila",
      neighborhood: "Centro",
      postal_code: "",
    });
  });

  it("leaves unresolved fields blank for the shopper to correct", () => {
    expect(shopperAreaFromNominatim({})).toEqual({ ...emptyShopperArea(), country: "MX" });
    expect(shopperAreaFromNominatim(null)).toEqual({ ...emptyShopperArea(), country: "MX" });
  });
});
