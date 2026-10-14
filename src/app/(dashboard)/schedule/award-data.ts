import { AWARD_COLUMNS, awardRules, type AwardRules, type RosteredShift, type WorkerLimits } from "@/lib/award";
import type { WorkspaceContext } from "@/lib/workspace";

export type AwardContext = { rules: AwardRules; shifts: RosteredShift[]; limits: Map<string, WorkerLimits> };

/**
 * Everything the SCHADS checks need for a period: the workspace rules, every
 * worker's non-cancelled shifts starting in it, and per-worker daily limits.
 * Callers pass a period at least a day wider than what they show so rest gaps
 * at the edges are seen.
 */
export async function loadAwardContext({ supabase, workspace }: WorkspaceContext, fromIso: string, toIso: string): Promise<AwardContext> {
  const [settings, rostered, finance] = await Promise.all([
    supabase.from("finance_settings").select(AWARD_COLUMNS).eq("workspace_id", workspace.id).maybeSingle(),
    supabase
      .from("shift_staff")
      .select("staff_id, shift:shifts!inner(id, starts_at, ends_at, break_minutes, sleepover, broken, status)")
      .eq("workspace_id", workspace.id)
      .gte("shift.starts_at", fromIso)
      .lt("shift.starts_at", toIso)
      .neq("shift.status", "cancelled"),
    supabase.from("staff_finance").select("staff_id, max_daily_hours").eq("workspace_id", workspace.id).not("max_daily_hours", "is", null),
  ]);
  if (settings.error) throw settings.error;
  if (rostered.error) throw rostered.error;
  if (finance.error) throw finance.error;

  return {
    rules: awardRules(settings.data),
    shifts: rostered.data.map(({ staff_id, shift }) => ({
      shiftId: shift.id,
      staffId: staff_id,
      startsAt: shift.starts_at,
      endsAt: shift.ends_at,
      breakMinutes: shift.break_minutes,
      sleepover: shift.sleepover,
      broken: shift.broken,
    })),
    limits: new Map(finance.data.map((f) => [f.staff_id, { maxDailyMinutes: Math.round(Number(f.max_daily_hours) * 60) }])),
  };
}
