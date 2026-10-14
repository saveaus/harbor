import { formatHours, localParts, weekStart } from "@/lib/roster";
import type { Tables } from "@/lib/supabase/database.types";

/** SCHADS limits and allowances the roster is checked against. Workspaces set them in Finance settings. */
export type AwardRules = {
  maxDailyMinutes: number;
  maxWeeklyMinutes: number;
  minRestMinutes: number;
  breakAfterMinutes: number;
  minBreakMinutes: number;
  brokenOneCents: number;
  brokenTwoCents: number;
  sleepoverCents: number;
  checkInRadiusM: number;
};

export const SHIFT_KINDS = { standard: "Standard", sleepover: "Sleepover", broken: "Broken shift" } as const;
export type ShiftKind = keyof typeof SHIFT_KINDS;

export function shiftKind(shift: { sleepover: boolean; broken: boolean }): ShiftKind {
  if (shift.sleepover) return "sleepover";
  return shift.broken ? "broken" : "standard";
}

/** Minimum engagement for each portion of a home care broken shift. */
export const BROKEN_PORTION_MINUTES = 120;

type AwardColumns = Pick<
  Tables<"finance_settings">,
  | "max_daily_minutes"
  | "max_weekly_minutes"
  | "min_rest_minutes"
  | "break_after_minutes"
  | "min_break_minutes"
  | "broken_one_cents"
  | "broken_two_cents"
  | "sleepover_cents"
  | "check_in_radius_m"
>;

export const AWARD_COLUMNS =
  "max_daily_minutes, max_weekly_minutes, min_rest_minutes, break_after_minutes, min_break_minutes, broken_one_cents, broken_two_cents, sleepover_cents, check_in_radius_m";

const DEFAULTS: AwardColumns = {
  max_daily_minutes: 600,
  max_weekly_minutes: 2280,
  min_rest_minutes: 600,
  break_after_minutes: 300,
  min_break_minutes: 30,
  broken_one_cents: 2082,
  broken_two_cents: 2756,
  sleepover_cents: 0,
  check_in_radius_m: 100,
};

/** Rules from a workspace's settings row; a workspace without one uses the column defaults. */
export function awardRules(row: AwardColumns | null): AwardRules {
  const r = row ?? DEFAULTS;
  return {
    maxDailyMinutes: r.max_daily_minutes,
    maxWeeklyMinutes: r.max_weekly_minutes,
    minRestMinutes: r.min_rest_minutes,
    breakAfterMinutes: r.break_after_minutes,
    minBreakMinutes: r.min_break_minutes,
    brokenOneCents: r.broken_one_cents,
    brokenTwoCents: r.broken_two_cents,
    sleepoverCents: r.sleepover_cents,
    checkInRadiusM: r.check_in_radius_m,
  };
}

export type RosteredShift = {
  shiftId: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  sleepover: boolean;
  broken: boolean;
};

export type AwardIssueKind = "missed_break" | "daily_hours" | "weekly_hours" | "short_rest" | "short_portion";
export type AwardIssue = { kind: AwardIssueKind; shiftId: string; staffId: string; message: string };

export const AWARD_ISSUE: Record<AwardIssueKind, string> = {
  missed_break: "Missed break",
  daily_hours: "Over daily hours",
  weekly_hours: "Over weekly hours",
  short_rest: "Short rest",
  short_portion: "Short broken shift portion",
};

/** Per-worker limits from their employment details override the workspace rules. */
export type WorkerLimits = { maxDailyMinutes?: number; maxWeeklyMinutes?: number };

const minutesBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 60_000);
const worked = (s: RosteredShift) => minutesBetween(s.startsAt, s.endsAt) - s.breakMinutes;

/**
 * SCHADS risks in a set of rostered shifts: no meal break on a long shift, a
 * worker over their daily or weekly hours, too little rest between shifts, and
 * broken shift portions under the minimum engagement. Sleepovers don't count
 * as worked hours, and back-to-back shifts are treated as one continuous shift.
 * Pass every shift a worker has around the period so rest and totals are complete.
 */
export function awardIssues(
  shifts: readonly RosteredShift[],
  rules: AwardRules,
  timeZone: string,
  limits: ReadonlyMap<string, WorkerLimits> = new Map(),
): AwardIssue[] {
  const issues: AwardIssue[] = [];
  const byStaff = new Map<string, RosteredShift[]>();
  for (const s of shifts) byStaff.set(s.staffId, [...(byStaff.get(s.staffId) ?? []), s]);

  for (const [staffId, list] of byStaff) {
    const sorted = [...list].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const maxDaily = limits.get(staffId)?.maxDailyMinutes ?? rules.maxDailyMinutes;
    const maxWeekly = limits.get(staffId)?.maxWeeklyMinutes ?? rules.maxWeeklyMinutes;
    const daily = new Map<string, RosteredShift[]>();
    const weekly = new Map<string, RosteredShift[]>();

    for (const [i, s] of sorted.entries()) {
      const minutes = worked(s);
      if (!s.sleepover && minutes > rules.breakAfterMinutes && s.breakMinutes < rules.minBreakMinutes) {
        issues.push({
          kind: "missed_break",
          shiftId: s.shiftId,
          staffId,
          message: `${formatHours(minutes)} without a ${rules.minBreakMinutes} min break`,
        });
      }
      if (s.broken && minutes < BROKEN_PORTION_MINUTES) {
        issues.push({
          kind: "short_portion",
          shiftId: s.shiftId,
          staffId,
          message: `Broken shift portion of ${formatHours(minutes)} is under the ${formatHours(BROKEN_PORTION_MINUTES)} minimum`,
        });
      }
      const previous = sorted[i - 1];
      if (previous) {
        const rest = minutesBetween(previous.endsAt, s.startsAt);
        const sameBrokenDay = previous.broken && s.broken && localParts(previous.startsAt, timeZone).day === localParts(s.startsAt, timeZone).day;
        if (rest > 0 && rest < rules.minRestMinutes && !sameBrokenDay) {
          issues.push({
            kind: "short_rest",
            shiftId: s.shiftId,
            staffId,
            message: `Only ${formatHours(rest)} rest since the previous shift (minimum ${formatHours(rules.minRestMinutes)})`,
          });
        }
      }
      if (s.sleepover) continue;
      const day = localParts(s.startsAt, timeZone).day;
      daily.set(day, [...(daily.get(day) ?? []), s]);
      const week = weekStart(day);
      weekly.set(week, [...(weekly.get(week) ?? []), s]);
    }

    for (const group of daily.values()) {
      const total = group.reduce((sum, s) => sum + worked(s), 0);
      if (total > maxDaily) {
        const last = group[group.length - 1];
        issues.push({ kind: "daily_hours", shiftId: last.shiftId, staffId, message: `${formatHours(total)} in one day (maximum ${formatHours(maxDaily)})` });
      }
    }
    for (const group of weekly.values()) {
      const total = group.reduce((sum, s) => sum + worked(s), 0);
      if (total > maxWeekly) {
        const last = group[group.length - 1];
        issues.push({ kind: "weekly_hours", shiftId: last.shiftId, staffId, message: `${formatHours(total)} this week (maximum ${formatHours(maxWeekly)})` });
      }
    }
  }
  return issues;
}

export type BrokenDay = { staffId: string; day: string; breaks: 1 | 2; cents: number };

/**
 * Broken shift allowances: a worker whose broken shifts on one day are split
 * by one unpaid break earns the first allowance, by two or more the second.
 */
export function brokenShiftDays(
  entries: readonly { staffId: string; day: string; broken: boolean }[],
  rules: AwardRules,
): Map<string, BrokenDay> {
  const portions = new Map<string, number>();
  for (const e of entries) {
    if (!e.broken) continue;
    const key = `${e.staffId}:${e.day}`;
    portions.set(key, (portions.get(key) ?? 0) + 1);
  }
  const days = new Map<string, BrokenDay>();
  for (const [key, count] of portions) {
    if (count < 2) continue;
    const [staffId, day] = key.split(":");
    const breaks = count >= 3 ? 2 : 1;
    days.set(key, { staffId, day, breaks, cents: breaks === 2 ? rules.brokenTwoCents : rules.brokenOneCents });
  }
  return days;
}
