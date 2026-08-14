import { describe, expect, it } from "vitest";
import type { BusinessHour } from "@/types/api";
import {
  buildHoursPayload,
  dayLabels,
  formatDayRange,
  groupedSchedule,
  isOpenNow,
  openMeta,
  parseTime,
  validateHoursRows,
  weekSchedule,
  zonedNow,
} from "./hours";

const CDMX = "America/Mexico_City";

/** 0 = Monday … 6 = Sunday. */
function day(day_of_week: number, opens_at: string, closes_at: string): BusinessHour {
  return { day_of_week, opens_at, closes_at, is_closed: false };
}
function closed(day_of_week: number): BusinessHour {
  return { day_of_week, opens_at: null, closes_at: null, is_closed: true };
}

/** A Date that lands on the given wall-clock time in CDMX (UTC-6, no DST). */
function cdmx(dayOfMonth: number, hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 0, dayOfMonth, hour + 6, minute));
}
// Jan 2026: 5th = Monday, 9th = Friday, 10th = Saturday, 11th = Sunday.

describe("parseTime", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("09:30")).toBe(570);
    expect(parseTime("23:59")).toBe(1439);
  });

  it("tolerates a seconds suffix from Postgres", () => {
    expect(parseTime("09:30:00")).toBe(570);
  });

  it("returns null for missing or malformed input", () => {
    expect(parseTime(null)).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(parseTime("nope")).toBeNull();
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("10:75")).toBeNull();
  });
});

describe("zonedNow", () => {
  it("maps Monday to day 0 in the business timezone", () => {
    expect(zonedNow(CDMX, cdmx(5, 10, 15))).toEqual({ day: 0, minutes: 615 });
  });

  it("maps Sunday to day 6", () => {
    expect(zonedNow(CDMX, cdmx(11, 8))).toEqual({ day: 6, minutes: 480 });
  });

  it("reports midnight as 0, not 1440", () => {
    expect(zonedNow(CDMX, cdmx(5, 0))?.minutes).toBe(0);
  });

  it("returns null for an unusable timezone", () => {
    expect(zonedNow("Not/AZone", cdmx(5, 10))).toBeNull();
    expect(zonedNow("", cdmx(5, 10))).toBeNull();
  });
});

describe("isOpenNow — same-day spans", () => {
  const week = [day(0, "09:00", "18:30"), closed(6)];

  it("is open inside the range", () => {
    expect(isOpenNow(week, CDMX, cdmx(5, 12))).toBe(true);
  });

  it("is open exactly at opening time (inclusive)", () => {
    expect(isOpenNow(week, CDMX, cdmx(5, 9, 0))).toBe(true);
  });

  it("is closed exactly at closing time (exclusive)", () => {
    expect(isOpenNow(week, CDMX, cdmx(5, 18, 30))).toBe(false);
  });

  it("is closed before opening and after closing", () => {
    expect(isOpenNow(week, CDMX, cdmx(5, 8, 59))).toBe(false);
    expect(isOpenNow(week, CDMX, cdmx(5, 19))).toBe(false);
  });

  it("is closed on a day flagged is_closed", () => {
    expect(isOpenNow(week, CDMX, cdmx(11, 12))).toBe(false);
  });

  it("is closed on a day with no row at all", () => {
    // Tuesday isn't in the schedule, but hours exist → closed, not unknown.
    expect(isOpenNow(week, CDMX, cdmx(6, 12))).toBe(false);
  });
});

describe("isOpenNow — overnight spans", () => {
  // Saturday 22:00 → 02:00 Sunday.
  const week = [day(5, "22:00", "02:00")];

  it("is open late on the opening day", () => {
    expect(isOpenNow(week, CDMX, cdmx(10, 23))).toBe(true);
  });

  it("stays open after midnight, on the following day", () => {
    expect(isOpenNow(week, CDMX, cdmx(11, 1))).toBe(true);
  });

  it("closes at the overnight closing time", () => {
    expect(isOpenNow(week, CDMX, cdmx(11, 2))).toBe(false);
  });

  it("is closed in the gap before opening", () => {
    expect(isOpenNow(week, CDMX, cdmx(10, 21, 59))).toBe(false);
  });

  it("does not leak into an unrelated day", () => {
    // Monday has no row and Sunday's span is not overnight → closed.
    expect(isOpenNow(week, CDMX, cdmx(5, 1))).toBe(false);
  });
});

describe("isOpenNow — unknown states", () => {
  it("returns null when no hours are set", () => {
    expect(isOpenNow([], CDMX, cdmx(5, 12))).toBeNull();
    expect(isOpenNow(null, CDMX, cdmx(5, 12))).toBeNull();
    expect(isOpenNow(undefined, CDMX, cdmx(5, 12))).toBeNull();
  });

  it("returns null for an unusable timezone rather than guessing", () => {
    expect(isOpenNow([day(0, "09:00", "18:00")], "Not/AZone", cdmx(5, 12))).toBeNull();
    expect(isOpenNow([day(0, "09:00", "18:00")], null, cdmx(5, 12))).toBeNull();
  });

  it("treats malformed times as closed, not open", () => {
    const bad = [{ day_of_week: 0, opens_at: "oops", closes_at: "18:00", is_closed: false }];
    expect(isOpenNow(bad, CDMX, cdmx(5, 12))).toBe(false);
  });
});

describe("isOpenNow — timezone is the business's, not the device's", () => {
  const week = [day(0, "09:00", "18:00"), day(6, "09:00", "18:00")];

  it("gives different answers for the same instant in different zones", () => {
    // 2026-01-05 08:30 in Tijuana (UTC-8) is 10:30 in CDMX (UTC-6).
    const instant = new Date(Date.UTC(2026, 0, 5, 16, 30));
    expect(isOpenNow(week, "America/Tijuana", instant)).toBe(false);
    expect(isOpenNow(week, CDMX, instant)).toBe(true);
  });

  it("handles a zone where it is already the next day", () => {
    // Sunday 23:30 CDMX is Monday 05:30 UTC — Cancún (UTC-5) is Monday 00:30.
    const instant = new Date(Date.UTC(2026, 0, 12, 5, 30));
    expect(zonedNow("America/Cancun", instant)?.day).toBe(0);
    expect(zonedNow(CDMX, instant)?.day).toBe(6);
  });
});

describe("openMeta", () => {
  it("labels open and closed states", () => {
    expect(openMeta(true)?.label).toBe("Abierto");
    expect(openMeta(false)?.label).toBe("Cerrado");
  });

  it("returns null for unknown so no badge renders", () => {
    expect(openMeta(null)).toBeNull();
  });
});

describe("formatDayRange / weekSchedule", () => {
  it("formats an open day and a closed day", () => {
    expect(formatDayRange(day(0, "09:00", "18:30"))).toBe("09:00 – 18:30");
    expect(formatDayRange(closed(6))).toBe("Cerrado");
    expect(formatDayRange(undefined)).toBe("—");
  });

  it("returns seven Monday-first rows, filling gaps", () => {
    const week = weekSchedule([day(2, "10:00", "14:00")]);
    expect(week).toHaveLength(7);
    expect(week[0].label).toBe("Lunes");
    expect(week[6].label).toBe("Domingo");
    expect(week[2].hour).toBeDefined();
    expect(week[0].hour).toBeUndefined();
  });
});

describe("validateHoursRows", () => {
  const open = { day_of_week: 0, opens_at: "09:00", closes_at: "18:00", is_closed: false };

  it("accepts valid rows", () => {
    expect(validateHoursRows([open])).toBeNull();
  });

  it("ignores times on closed days", () => {
    expect(
      validateHoursRows([{ day_of_week: 6, opens_at: "", closes_at: "", is_closed: true }]),
    ).toBeNull();
  });

  it("rejects an open day missing a time, naming the day", () => {
    const message = validateHoursRows([{ ...open, closes_at: "" }]);
    expect(message).toContain("Lunes");
  });

  it("rejects equal open and close times (DB constraint)", () => {
    const message = validateHoursRows([{ ...open, closes_at: "09:00" }]);
    expect(message).toContain("iguales");
  });
});

describe("buildHoursPayload", () => {
  it("nulls out times on closed days", () => {
    const { hours } = buildHoursPayload([
      { day_of_week: 6, opens_at: "09:00", closes_at: "18:00", is_closed: true },
    ]);
    expect(hours[0]).toEqual({
      day_of_week: 6,
      opens_at: null,
      closes_at: null,
      is_closed: true,
    });
  });

  it("keeps times on open days", () => {
    const { hours } = buildHoursPayload([
      { day_of_week: 0, opens_at: "09:00", closes_at: "18:30", is_closed: false },
    ]);
    expect(hours[0]).toEqual({
      day_of_week: 0,
      opens_at: "09:00",
      closes_at: "18:30",
      is_closed: false,
    });
  });
});

describe("groupedSchedule", () => {
  it("collapses a consecutive run into one row", () => {
    const week = [
      day(0, "09:00", "18:30"),
      day(1, "09:00", "18:30"),
      day(2, "09:00", "18:30"),
      day(3, "09:00", "18:30"),
      day(4, "09:00", "18:30"),
      day(5, "22:00", "02:00"),
      closed(6),
    ];
    expect(groupedSchedule(week).map((g) => [g.label, g.range])).toEqual([
      ["Lunes a viernes", "09:00 – 18:30"],
      ["Sábado", "22:00 – 02:00"],
      ["Domingo", "Cerrado"],
    ]);
  });

  it('joins exactly two days with "y"', () => {
    const week = [day(0, "09:00", "14:00"), day(1, "09:00", "14:00"), closed(2)];
    const groups = groupedSchedule(week);
    expect(groups[0].label).toBe("Lunes y martes");
  });

  it("keeps a midweek exception separate instead of merging across it", () => {
    const week = [
      day(0, "09:00", "18:00"),
      closed(1), // exception in the middle
      day(2, "09:00", "18:00"),
    ];
    const groups = groupedSchedule(week);
    expect(groups.slice(0, 3).map((g) => g.label)).toEqual(["Lunes", "Martes", "Miércoles"]);
    // Same hours either side, but not adjacent → not merged.
    expect(groups[0].range).toBe(groups[2].range);
  });

  it("collapses an identical week into a single row", () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => day(d, "10:00", "20:00"));
    expect(groupedSchedule(week)).toEqual([
      { label: "Lunes a domingo", range: "10:00 – 20:00", days: [0, 1, 2, 3, 4, 5, 6] },
    ]);
  });

  it("groups days that have no row at all", () => {
    // Only Monday is defined; the rest are unknown and collapse together.
    const groups = groupedSchedule([day(0, "09:00", "18:00")]);
    expect(groups).toHaveLength(2);
    expect(groups[1]).toMatchObject({ label: "Martes a domingo", range: "—" });
  });

  it("exposes the covered days so callers can highlight today", () => {
    const week = [day(0, "09:00", "18:00"), day(1, "09:00", "18:00"), closed(2)];
    const groups = groupedSchedule(week);
    expect(groups[0].days).toEqual([0, 1]);
    expect(groups.find((g) => g.days.includes(1))?.label).toBe("Lunes y martes");
  });
});

describe("hours are optional (on-demand businesses)", () => {
  const blank = (d: number) => ({ day_of_week: d, opens_at: "", closes_at: "", is_closed: false });
  const week = [0, 1, 2, 3, 4, 5, 6].map(blank);

  it("accepts a completely blank week", () => {
    // A business without a fixed schedule must still be able to save settings.
    expect(validateHoursRows(week)).toBeNull();
  });

  it("sends an empty array for a blank week, which clears the schedule", () => {
    expect(buildHoursPayload(week)).toEqual({ hours: [] });
  });

  it("keeps only the days that were filled in", () => {
    const partial = [
      { day_of_week: 0, opens_at: "09:00", closes_at: "14:00", is_closed: false },
      blank(1),
      { day_of_week: 2, opens_at: "", closes_at: "", is_closed: true },
    ];
    const { hours } = buildHoursPayload(partial);
    expect(hours.map((h) => h.day_of_week)).toEqual([0, 2]);
    expect(hours[1]).toMatchObject({ is_closed: true, opens_at: null });
  });

  it("still rejects a half-filled day", () => {
    // Blank is fine, half-filled is a mistake worth surfacing.
    expect(validateHoursRows([{ ...blank(0), opens_at: "09:00" }])).toContain("Lunes");
  });

  it("shows no badge and no schedule when hours are absent", () => {
    expect(isOpenNow([], CDMX, cdmx(5, 12))).toBeNull();
    expect(openMeta(isOpenNow([], CDMX, cdmx(5, 12)))).toBeNull();
  });
});

describe("locale-aware hours labels", () => {
  it("translates day names and the open/closed badge", () => {
    expect(dayLabels("en")[0]).toBe("Monday");
    expect(dayLabels("es")[0]).toBe("Lunes");
    expect(openMeta(true, "en")?.label).toBe("Open");
    expect(openMeta(false, "en")?.label).toBe("Closed");
    expect(openMeta(null, "en")).toBeNull();
  });

  it("keeps each language's day-run grammar", () => {
    const week = [0, 1, 2, 3, 4].map((day) => ({
      day_of_week: day,
      opens_at: "09:00",
      closes_at: "18:00",
      is_closed: false,
    }));
    expect(groupedSchedule(week, "es")[0].label).toBe("Lunes a viernes");
    expect(groupedSchedule(week, "en")[0].label).toBe("Monday to Friday");

    const twoDays = week.slice(0, 2);
    expect(groupedSchedule(twoDays, "es")[0].label).toBe("Lunes y martes");
    expect(groupedSchedule(twoDays, "en")[0].label).toBe("Monday and Tuesday");
  });

  it("translates the closed range and validation messages", () => {
    expect(formatDayRange({ day_of_week: 0, opens_at: null, closes_at: null, is_closed: true }, "en")).toBe("Closed");
    const rows = [{ day_of_week: 0, opens_at: "09:00", closes_at: "", is_closed: false }];
    expect(validateHoursRows(rows, "en")).toBe("Monday: the opening or closing time is missing.");
    expect(validateHoursRows(rows, "es")).toBe("Lunes: falta la hora de apertura o de cierre.");
  });
});
