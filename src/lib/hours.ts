import type { BusinessHour } from "@/types/api";

/**
 * Opening-hours helpers.
 *
 * `day_of_week` is **0 = Monday … 6 = Sunday** (matches the API/DB convention).
 * Open/closed is computed here, on the client, rather than server-side: a
 * cached or server-rendered answer goes stale the moment a business opens or
 * closes. Everything below is pure — `now` is always injected.
 */

/** Spanish day names indexed by day_of_week (0 = Monday). */
export const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

/** en-US short weekday → day_of_week (0 = Monday). */
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Minutes since midnight for "HH:MM". Null when missing or malformed. */
export function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export interface ZonedNow {
  /** 0 = Monday … 6 = Sunday, in the business's timezone. */
  day: number;
  /** Minutes since midnight, in the business's timezone. */
  minutes: number;
}

/**
 * Current weekday + time inside an IANA timezone. Returns null for an
 * unusable timezone so callers can fall back to "unknown" instead of showing a
 * confidently wrong answer.
 */
export function zonedNow(timezone: string, now: Date = new Date()): ZonedNow | null {
  try {
    // hourCycle h23 avoids the "24:00" that hour12:false yields at midnight
    // in some runtimes.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const lookup = (type: string) => parts.find((part) => part.type === type)?.value;
    const day = WEEKDAY_INDEX[lookup("weekday") ?? ""];
    const hour = Number(lookup("hour"));
    const minute = Number(lookup("minute"));

    if (day === undefined || Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return { day, minutes: hour * 60 + minute };
  } catch {
    return null;
  }
}

/**
 * Is the business open right now?
 *
 * `true` open, `false` closed, `null` **unknown** — no hours set, or an
 * unusable timezone. Callers must render null as "no badge", never as "cerrado".
 */
export function isOpenNow(
  hours: BusinessHour[] | null | undefined,
  timezone: string | null | undefined,
  now: Date = new Date(),
): boolean | null {
  if (!hours || hours.length === 0) return null;
  const zoned = zonedNow(timezone || "", now);
  if (!zoned) return null;

  const byDay = new Map(hours.map((hour) => [hour.day_of_week, hour]));

  const today = byDay.get(zoned.day);
  if (today && !today.is_closed) {
    const opens = parseTime(today.opens_at);
    const closes = parseTime(today.closes_at);
    if (opens !== null && closes !== null) {
      if (closes > opens) {
        // Same-day span: open at opens_at, closed at closes_at.
        if (zoned.minutes >= opens && zoned.minutes < closes) return true;
      } else if (zoned.minutes >= opens) {
        // Overnight span — still open through to midnight.
        return true;
      }
    }
  }

  // Yesterday's overnight span can still be running after midnight.
  const yesterday = byDay.get((zoned.day + 6) % 7);
  if (yesterday && !yesterday.is_closed) {
    const opens = parseTime(yesterday.opens_at);
    const closes = parseTime(yesterday.closes_at);
    if (opens !== null && closes !== null && closes < opens && zoned.minutes < closes) {
      return true;
    }
  }

  return false;
}

export interface OpenMeta {
  label: string;
  bg: string;
  fg: string;
  dot: string;
}

/** Spanish label + palette tokens for an open/closed state (null → no badge). */
export function openMeta(open: boolean | null): OpenMeta | null {
  if (open === null) return null;
  return open
    ? { label: "Abierto", bg: "bg-success-soft", fg: "text-success", dot: "bg-success" }
    : { label: "Cerrado", bg: "bg-surface-secondary", fg: "text-text-muted", dot: "bg-text-muted" };
}

/** "09:00 – 18:30" for a day, or "Cerrado" / "—" when not applicable. */
export function formatDayRange(hour: BusinessHour | undefined): string {
  if (!hour) return "—";
  if (hour.is_closed) return "Cerrado";
  if (!hour.opens_at || !hour.closes_at) return "—";
  return `${hour.opens_at} – ${hour.closes_at}`;
}

/** All seven days in Monday-first order, filling gaps with undefined. */
export function weekSchedule(
  hours: BusinessHour[] | null | undefined,
): Array<{ day: number; label: string; hour: BusinessHour | undefined }> {
  const byDay = new Map((hours ?? []).map((hour) => [hour.day_of_week, hour]));
  return DAY_LABELS.map((label, day) => ({ day, label, hour: byDay.get(day) }));
}

export interface ScheduleGroup {
  /** "Lunes", "Lunes y martes", "Lunes a viernes". */
  label: string;
  /** Shared range for the run: "09:00 – 18:30", "Cerrado" or "—". */
  range: string;
  /** day_of_week values covered, in week order. */
  days: number[];
}

/** "Lunes" · "Lunes y martes" · "Lunes a viernes" for a run of days. */
function dayRunLabel(days: number[]): string {
  const first = DAY_LABELS[days[0]];
  if (days.length === 1) return first;
  const last = DAY_LABELS[days[days.length - 1]].toLowerCase();
  // Two days read better joined with "y" than as a range.
  return days.length === 2 ? `${first} y ${last}` : `${first} a ${last}`;
}

/**
 * Weekly schedule with **consecutive** days that share a range merged into one
 * row ("Lunes a viernes: 09:00 – 18:30"). Only adjacent runs collapse, so the
 * week stays in order and a midweek exception still stands out.
 */
export function groupedSchedule(hours: BusinessHour[] | null | undefined): ScheduleGroup[] {
  const groups: Array<{ range: string; days: number[] }> = [];

  for (const entry of weekSchedule(hours)) {
    const range = formatDayRange(entry.hour);
    const previous = groups[groups.length - 1];
    if (previous && previous.range === range) {
      previous.days.push(entry.day);
    } else {
      groups.push({ range, days: [entry.day] });
    }
  }

  return groups.map((group) => ({ ...group, label: dayRunLabel(group.days) }));
}

// ── Owner editor ────────────────────────────────────────────────────────────

/** One row of the settings form, before it becomes an API payload. */
export interface HoursFormRow {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
}

/**
 * A day left entirely blank (and not marked closed) is **unset**, not invalid.
 * Opening hours are optional: a business that takes orders on demand can leave
 * the whole week blank, and clearing every day removes the schedule again.
 */
export function isUnsetRow(row: HoursFormRow): boolean {
  return !row.is_closed && !row.opens_at && !row.closes_at;
}

/**
 * Mirror of the DB constraint, so owners get a readable message instead of a
 * relayed 500: a closed day carries no times; a day with times needs both, and
 * they must differ. Blank days are skipped. Returns the first problem, or null.
 */
export function validateHoursRows(rows: HoursFormRow[]): string | null {
  for (const row of rows) {
    if (row.is_closed || isUnsetRow(row)) continue;
    const label = DAY_LABELS[row.day_of_week] ?? `Día ${row.day_of_week}`;
    if (!row.opens_at || !row.closes_at) {
      return `${label}: falta la hora de apertura o de cierre.`;
    }
    if (row.opens_at === row.closes_at) {
      return `${label}: la apertura y el cierre no pueden ser iguales.`;
    }
  }
  return null;
}

/**
 * Form rows → PUT /businesses/:id/hours body. Closed days send null times and
 * blank days are dropped, so an all-blank form sends `[]` — which the API
 * treats as "no schedule" (it replaces the whole week).
 */
export function buildHoursPayload(rows: HoursFormRow[]): { hours: BusinessHour[] } {
  return {
    hours: rows
      .filter((row) => !isUnsetRow(row))
      .map((row) =>
        row.is_closed
          ? { day_of_week: row.day_of_week, opens_at: null, closes_at: null, is_closed: true }
          : {
              day_of_week: row.day_of_week,
              opens_at: row.opens_at,
              closes_at: row.closes_at,
              is_closed: false,
            },
      ),
  };
}
