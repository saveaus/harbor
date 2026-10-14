import type { Enums } from "@/lib/supabase/database.types";

export type ShiftStatus = Enums<"shift_status">;
type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export const SHIFT_STATUS: Record<ShiftStatus, { label: string; tone: Tone }> = {
  unpublished: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "accent" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const REPEATS = {
  daily: "Every day",
  weekly: "Every week",
  fortnightly: "Every fortnight",
  monthly: "Every month",
} as const;

export type Repeat = keyof typeof REPEATS;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function isClock(value: string): boolean {
  return CLOCK.test(value);
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function wallParts(instant: Date, timeZone: string) {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function offsetMs(instant: number, timeZone: string): number {
  const whole = Math.floor(instant / 1000) * 1000;
  const p = wallParts(new Date(whole), timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole;
}

/** The instant a wall-clock `day` + `HH:MM` occurs in `timeZone`. Times skipped by daylight saving move forward. */
export function zonedInstant(day: string, clock: string, timeZone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = clock.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min);
  const guess = wall - offsetMs(wall, timeZone);
  return new Date(wall - offsetMs(guess, timeZone));
}

/** `YYYY-MM-DD` and `HH:MM` for an instant as seen in `timeZone`. */
export function localParts(instant: Date | string, timeZone: string): { day: string; clock: string } {
  const p = wallParts(typeof instant === "string" ? new Date(instant) : instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { day: `${p.year}-${pad(p.month)}-${pad(p.day)}`, clock: `${pad(p.hour)}:${pad(p.minute)}` };
}

export function today(timeZone: string): string {
  return localParts(new Date(), timeZone).day;
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function monthDays(start: string): string[] {
  const [year, month] = start.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${start.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`);
}

export function formatMonth(start: string): string {
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${start}T00:00:00Z`));
}

/** Whole days from `from` to `to`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function formatClock(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(instant)).replace(" ", "");
}

export function formatShiftTime(starts: string, ends: string, timeZone: string): string {
  return `${formatClock(starts, timeZone)} – ${formatClock(ends, timeZone)}`;
}

export function formatWeekday(day: string): string {
  return new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

export function formatLongDay(day: string): string {
  return new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

type Span = { id: string; starts_at: string; ends_at: string };

/** Ids of spans that overlap another span in the same list. */
export function overlapping(spans: readonly Span[]): Set<string> {
  const sorted = [...spans].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const clashes = new Set<string>();
  let latest: Span | null = null;
  for (const span of sorted) {
    if (latest && Date.parse(span.starts_at) < Date.parse(latest.ends_at)) {
      clashes.add(span.id);
      clashes.add(latest.id);
    }
    if (!latest || Date.parse(span.ends_at) > Date.parse(latest.ends_at)) latest = span;
  }
  return clashes;
}
