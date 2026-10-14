import { csv, csvResponse } from "@/lib/csv";
import { payrollRows } from "@/lib/finance";
import { personName } from "@/lib/format";
import { localParts } from "@/lib/roster";
import { getWorkspace } from "@/lib/workspace";

/** POST because each download is recorded against the export. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, workspace, member, installedApps }] = await Promise.all([params, getWorkspace()]);
  if (!installedApps.has("scheduling")) return new Response("Scheduling isn't installed", { status: 404 });
  if (member.role === "member") return new Response("Only workspace owners and admins can export payroll.", { status: 403 });

  const [payroll, entries, rates] = await Promise.all([
    supabase.from("payroll_exports").select("id, period_start, period_end, export_count").eq("workspace_id", workspace.id).eq("id", id).maybeSingle(),
    supabase
      .from("timesheet_entries")
      .select("staff_id, work_date, starts_at, ends_at, break_minutes, worked_minutes, km, notes, staff:staff(first_name, last_name, email), contact:contacts(first_name, last_name, email)")
      .eq("workspace_id", workspace.id)
      .eq("payroll_export_id", id)
      .order("staff_id")
      .order("starts_at"),
    supabase.from("pay_rates").select("staff_id, hourly_cents, km_cents").eq("workspace_id", workspace.id),
  ]);
  if (payroll.error) throw payroll.error;
  if (!payroll.data) return new Response("Export not found", { status: 404 });
  if (entries.error) throw entries.error;
  if (rates.error) throw rates.error;

  const rateFor = new Map(rates.data.map((r) => [r.staff_id, r]));
  const tz = workspace.timezone;
  const body = csv(
    payrollRows(
      entries.data.map((e) => ({
        staff: e.staff ? personName(e.staff) : "",
        email: e.staff?.email ?? "",
        work_date: e.work_date,
        start: localParts(e.starts_at, tz).clock,
        end: localParts(e.ends_at, tz).clock,
        break_minutes: e.break_minutes,
        worked_minutes: e.worked_minutes ?? 0,
        km: Number(e.km),
        client: e.contact ? personName(e.contact) : "",
        notes: e.notes,
        hourly_cents: rateFor.get(e.staff_id)?.hourly_cents ?? null,
        km_cents: rateFor.get(e.staff_id)?.km_cents ?? null,
        sleepover_cents: null,
        broken_cents: 0,
      })),
    ),
  );

  const recorded = await supabase
    .from("payroll_exports")
    .update({ exported_at: new Date().toISOString(), export_count: payroll.data.export_count + 1 })
    .eq("id", id);
  if (recorded.error) throw recorded.error;

  return csvResponse(body, `payroll-${payroll.data.period_start}-to-${payroll.data.period_end}.csv`);
}
