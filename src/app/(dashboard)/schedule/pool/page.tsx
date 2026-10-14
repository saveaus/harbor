import { Hand, Inbox } from "lucide-react";
import { ActionCell, Alert, Button, Cell, EmptyState, Row, Table } from "@/components/ui";
import { personName } from "@/lib/format";
import { addDays, formatHours, formatShiftTime, formatWeekday, localParts, today, zonedInstant } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { shiftStep } from "../actions";

const POOL_DAYS = 56;

export default async function ShiftPoolPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error: notice }, { supabase, workspace, userId }] = await Promise.all([searchParams, requireApp("scheduling")]);
  const tz = workspace.timezone;
  const now = today(tz);

  const [shifts, me] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, starts_at, ends_at, rostered_minutes, address, shift_staff(staff_id), shift_clients(contact:contacts(first_name, last_name, email))")
      .eq("workspace_id", workspace.id)
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .lt("starts_at", zonedInstant(addDays(now, POOL_DAYS), "00:00", tz).toISOString())
      .order("starts_at"),
    supabase.from("staff").select("id").eq("workspace_id", workspace.id).eq("user_id", userId).maybeSingle(),
  ]);
  if (shifts.error) throw shifts.error;
  if (me.error) throw me.error;
  const open = shifts.data.filter((s) => s.shift_staff.length === 0);

  return (
    <>
      <div className="px-9 pt-5 pb-3 text-[13px] text-ink-3">
        Published shifts with nobody assigned over the next 8 weeks. The first staff member to take one is rostered on.
      </div>
      {notice ? (
        <div className="px-9 pb-3">
          <Alert>{notice}</Alert>
        </div>
      ) : null}
      {me.data ? null : (
        <div className="px-9 pb-3 text-[13px] text-ink-3">Your account isn&apos;t linked to a staff record, so you can view open shifts but not take them.</div>
      )}
      {open.length === 0 ? (
        <EmptyState icon={<Inbox size={18} />} title="No open shifts" body="Publish a shift without staff on the roster to offer it here." />
      ) : (
        <Table columns={["Day", "Time", "Hours", "Clients", "Address", ""]}>
          {open.map((s) => (
            <Row key={s.id} href={`/schedule/shifts/${s.id}`}>
              <Cell>{formatWeekday(localParts(s.starts_at, tz).day)}</Cell>
              <Cell className="tabular-nums">{formatShiftTime(s.starts_at, s.ends_at, tz)}</Cell>
              <Cell className="tabular-nums">{formatHours(s.rostered_minutes ?? 0)}</Cell>
              <Cell>{s.shift_clients.map((c) => (c.contact ? personName(c.contact) : "Client")).join(", ")}</Cell>
              <Cell>
                <span className="block max-w-60 truncate text-ink-3">{s.address || "—"}</span>
              </Cell>
              <ActionCell>
                {me.data ? (
                  <form action={shiftStep.bind(null, s.id, "take")}>
                    <Button type="submit" variant="primary">
                      <Hand size={14} /> Take
                    </Button>
                  </form>
                ) : null}
              </ActionCell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}
