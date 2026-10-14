import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Alert, Badge, Card, EmptyState } from "@/components/ui";
import { personName } from "@/lib/format";
import { addDays, formatHours, formatLongDay, formatShiftTime, localParts, today, zonedInstant } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { CheckIn } from "../check-in";

type Entry = {
  id: string;
  starts_at: string;
  ends_at: string;
  worked_minutes: number | null;
  km: number;
  checked_in_at: string | null;
  checked_out_at: string | null;
  shift_id: string | null;
  shift: {
    address: string;
    title: string;
    status: "unpublished" | "published" | "completed" | "cancelled";
    travel_km: number;
    shift_clients: { contact: { first_name: string; last_name: string; email: string } | null }[];
  } | null;
};

function visit(entry: Entry): { label: string; tone: "neutral" | "accent" | "success" | "warning" } {
  if (entry.checked_out_at) return { label: "Done", tone: "success" };
  if (entry.checked_in_at) return { label: "In progress", tone: "accent" };
  if (entry.shift?.status === "published") return { label: "Arrive", tone: "warning" };
  return { label: "Closed", tone: "neutral" };
}

function ShiftCard({ entry, tz, now }: { entry: Entry; tz: string; now: string }) {
  const day = localParts(entry.starts_at, tz).day;
  const clients = (entry.shift?.shift_clients ?? []).map((c) => (c.contact ? personName(c.contact) : "Client")).join(", ") || "No client";
  const open = entry.shift?.status === "published" && !entry.checked_out_at;
  const status = visit(entry);
  const current = day === now && open;
  return (
    <Card className={current ? "space-y-3 border-ink p-5" : "space-y-3 p-5"}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={entry.shift_id ? `/schedule/shifts/${entry.shift_id}` : "/schedule"} className="text-[14px] font-medium text-ink hover:text-ink-3">
            {entry.shift?.title || formatLongDay(day)}
          </Link>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="mt-1 text-[13px] text-ink">{clients}</p>
        <p className="mt-0.5 text-[13px] text-ink-3">
          {day === now ? formatShiftTime(entry.starts_at, entry.ends_at, tz) : `${formatLongDay(day)} · ${formatShiftTime(entry.starts_at, entry.ends_at, tz)}`}
          {` · ${formatHours(entry.worked_minutes ?? 0)}`}
        </p>
        {entry.shift?.address ? <p className="mt-0.5 text-[13px] text-ink-3">{entry.shift.address}</p> : null}
      </div>
      {open ? <CheckIn entryId={entry.id} mode={entry.checked_in_at ? "out" : "in"} defaultKm={Number(entry.km) || Number(entry.shift?.travel_km) || 0} /> : null}
      {entry.checked_in_at ? (
        <p className="text-[12px] text-ink-3">
          Checked in {formatShiftTime(entry.checked_in_at, entry.checked_out_at ?? entry.checked_in_at, tz).split(" – ")[0]}
          {entry.checked_out_at ? ` · out ${formatShiftTime(entry.checked_out_at, entry.checked_out_at, tz).split(" – ")[0]}` : ""}
          {Number(entry.km) ? ` · ${Number(entry.km)} km` : ""}
        </p>
      ) : null}
    </Card>
  );
}

export default async function MyShiftsPage({ searchParams }: { searchParams: Promise<{ error?: string; entry?: string }> }) {
  const [params, { supabase, workspace, userId }] = await Promise.all([searchParams, requireApp("scheduling")]);
  const tz = workspace.timezone;
  const now = today(tz);

  const me = await supabase.from("staff").select("id").eq("workspace_id", workspace.id).eq("user_id", userId).maybeSingle();
  if (me.error) throw me.error;

  const entries = me.data
    ? await supabase
        .from("timesheet_entries")
        .select(
          "id, starts_at, ends_at, worked_minutes, km, checked_in_at, checked_out_at, shift_id, shift:shifts(address, title, status, travel_km, shift_clients(contact:contacts(first_name, last_name, email)))",
        )
        .eq("workspace_id", workspace.id)
        .eq("staff_id", me.data.id)
        .gte("starts_at", zonedInstant(addDays(now, -1), "00:00", tz).toISOString())
        .lt("starts_at", zonedInstant(addDays(now, 14), "00:00", tz).toISOString())
        .order("starts_at")
    : { data: [] as Entry[], error: null };
  if (entries.error) throw entries.error;

  const rows = entries.data as Entry[];
  const overdue = rows.filter((e) => localParts(e.starts_at, tz).day < now && e.shift?.status === "published" && !e.checked_out_at);
  const todays = rows.filter((e) => localParts(e.starts_at, tz).day === now);
  const upcoming = rows.filter((e) => localParts(e.starts_at, tz).day > now);
  const groups = [
    { label: "Still open", empty: null, rows: overdue },
    { label: "Today", empty: "Nothing rostered today.", rows: todays },
    { label: "Coming up", empty: null, rows: upcoming },
  ] as const;

  return (
    <div className="w-full max-w-[560px] space-y-4 px-9 py-6">
      <p className="text-[13px] text-ink-3">Check in when you arrive. Check out with a note and kilometres.</p>
      {params.error ? <Alert>{params.error}</Alert> : null}
      {!me.data ? (
        <EmptyState
          icon={<CalendarClock size={18} />}
          title="Your account isn't linked to a staff record"
          body="Ask an admin to connect your login to a staff profile so you can check in."
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={<CalendarClock size={18} />} title="No upcoming shifts" body="Published shifts you're rostered on appear here the day before they start." />
      ) : (
        <div className="space-y-6">
          {groups.map((group) =>
            group.rows.length === 0 ? (
              group.empty ? (
                <p key={group.label} className="text-[13px] text-ink-3">
                  {group.empty}
                </p>
              ) : null
            ) : (
              <section key={group.label} className="space-y-3">
                <h2 className="text-[13px] font-medium text-ink-3">{group.label}</h2>
                {group.rows.map((entry) => (
                  <ShiftCard key={entry.id} entry={entry} tz={tz} now={now} />
                ))}
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
