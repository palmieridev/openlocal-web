import { describe, expect, it } from "vitest";
import { grantPage, utcInput, validateGrant } from "./grants";
const now = Date.parse("2026-11-07T00:00:00Z");
const create = {
  module: "appointments",
  tier: "business",
  starts_at: "2026-11-10T00:00:00Z",
  expires_at: "2027-01-01T00:00:00Z",
  indefinite: false,
  internal_reason: " Approved ",
};
describe("grant input boundaries", () => {
  it("interprets minute inputs as UTC regardless of the host time zone", () => {
    expect(utcInput("2026-11-10T00:00")).toBe("2026-11-10T00:00:00.000Z");
    expect(utcInput("2028-02-29T23:59")).toBe("2028-02-29T23:59:00.000Z");
  });
  it.each([
    "2026-02-29T00:00",
    "2026-04-31T00:00",
    "2026-11-10T24:00",
    "1999-12-31T23:59",
    "2026-11-10",
    "2026-11-10T00:00Z",
  ])("rejects ambiguous or invalid input %s", (value) =>
    expect(() => utcInput(value)).toThrow(),
  );
  it("accepts explicit offsets and trims reasons/messages", () => {
    expect(
      validateGrant(
        {
          ...create,
          starts_at: "2026-11-10T00:00:00-06:00",
          owner_message: " Welcome ",
        },
        "create",
        now,
      ),
    ).toMatchObject({ internal_reason: "Approved", owner_message: "Welcome" });
  });
  it.each([
    { extra: true },
    { module: "both" },
    { tier: "free" },
    { starts_at: "2026-02-30T00:00:00Z" },
    { starts_at: "2026-11-10T00:00:00" },
    { expires_at: "2026-11-10T00:00:00Z" },
    { expires_at: "2026-01-01T00:00:00Z" },
    { indefinite: true },
    { expires_at: null },
    { indefinite: undefined },
    { internal_reason: " " },
    { internal_reason: "😀".repeat(2001) },
    { owner_message: "" },
  ])("rejects invalid or contradictory create fields %j", (patch) =>
    expect(() =>
      validateGrant({ ...create, ...patch }, "create", now),
    ).toThrow(),
  );
  it("requires explicit indefinite access and permits past starts", () => {
    expect(
      validateGrant(
        {
          ...create,
          starts_at: "2020-01-01T00:00:00Z",
          expires_at: null,
          indefinite: true,
        },
        "create",
        now,
      ),
    ).toMatchObject({ indefinite: true });
  });
  it("accepts only supported mutation fields and positive int32 versions", () => {
    expect(
      validateGrant(
        { version: 2, internal_reason: "Extension", indefinite: true },
        "extend",
        now,
      ),
    ).toMatchObject({ version: 2 });
    for (const version of [0, -1, 1.5, 2147483648, "1"])
      expect(() =>
        validateGrant({ version, internal_reason: "Revoke" }, "revoke", now),
      ).toThrow();
    expect(() =>
      validateGrant(
        { version: 1, internal_reason: "Revoke", owner_message: "Changed" },
        "revoke",
        now,
      ),
    ).toThrow();
  });
  it("parses bounded offset pages instead of cursors", () => {
    expect(grantPage(new URLSearchParams("limit=25&offset=50"))).toEqual({
      limit: 25,
      offset: 50,
    });
    for (const query of [
      "limit=0",
      "offset=-1",
      "offset=2000000001",
      "limit=101",
      "offset=1.2",
    ])
      expect(() => grantPage(new URLSearchParams(query))).toThrow();
  });
});
