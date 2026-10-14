import Link from "next/link";
import { Check, Lock, Pencil, Undo2, Unlock } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { DownloadButton } from "@/components/download-button";
import { ActionCell, Alert, Badge, Button, Card, Cell, EmptyState, Field, Input, Row, Select, Table, Textarea, textLinkClass } from "@/components/ui";
import { TIMESHEET_STATUS, payCents } from "@/lib/finance";
import { formatDate, formatDay, formatMoney, personName } from "@/lib/format";
import { addDays, formatHours, formatShiftTime, formatWeekday, isDay, localParts, today, weekStart } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { lockTimesheets, setTimesheetsApproved, unlockTimesheets, updateTimesheet } from "../actions";

const APPROVAL_FORM = "timesheet-approval";

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; staff?: string; error?: string }>;
}) {
  const [params, { supabase, workspace, member }] = await Promise.all([searchParams, requireApp("scheduling")]);
  const tz = workspace.timezone;
  const admin = member.role !== "member";
  const thisWeek = weekStart(today(tz));
  const from = params.from && isDay(params.from) ? params.from : thisWeek;
  const to = params.to && isDay(params.to) && params.to >= from ? params.to : addDays(from, 6);
  const staffFilter = params.staff ?? "";
  const query = new URLSearchParams({ from, to, ...(staffFilter ? { staff: staffFilter } : {}) });
  const here = `/schedule/timesheets?${query}`;

  let entriesQuery = supabase
    .from("timesheet_entries")
    .select(
      "id, staff_id, work_date, starts_at, ends_at, break_minutes, worked_minutes, km, notes, status, synced, shift_id, staff:staff(first_name, last_name, email), contact:contacts(first_name, last_name, email)",
    )
    .eq("workspace_id", workspace.id)
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date")
    .order("starts_at");
  if (staffFilter) entriesQuery = entriesQuery.eq("staff_id", staffFilter);

  const [entries, staff, rates, exports, unlocks] = await Promise.all([
    entriesQuery,
    supabase.from("staff").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).order("first_name"),
    supabase.from("pay_rates").select("staff_id, hourly_cents, km_cents").eq("workspace_id", workspace.id),
    supabase
      .from("payroll_exports")
      .select("id, period_start, period_end, locked_at, exported_at, export_count, staff:staff(first_name, last_name, email), timesheet_entries(count)")
      .eq("workspace_id", workspace.id)
      .order("locked_at", { ascending: false })
      .limit(12),
    supabase
      .from("timesheet_unlocks")
      .select("id, reason, entry_count, actor_name, created_at, payroll_export:payroll_exports(period_start, period_end)")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (entries.error) throw entries.error;
  if (staff.error) throw staff.error;
  if (rates.error) throw rates.error;
  if (exports.error) throw exports.error;
  if (unlocks.error) throw unlocks.error;

  const rateFor = new Map(rates.data.map((r) => [r.staff_id, r]));
  const totals = entries.data.reduce(
    (sum, e) => {
      const rate = rateFor.get(e.staff_id);
      return {
        minutes: sum.minutes + (e.worked_minutes ?? 0),
        km: sum.km + Number(e.km),
        pay:
          sum.pay +
          payCents({
            worked_minutes: e.worked_minutes ?? 0,
            km: Number(e.km),
            hourly_cents: rate?.hourly_cents ?? null,
            km_cents: rate?.km_cents ?? null,
            sleepover_cents: null,
            broken_cents: 0,
          }),
        drafts: sum.drafts + (e.status === "draft" ? 1 : 0),
        approved: sum.approved + (e.status === "approved" ? 1 : 0),
      };
    },
    { minutes: 0, km: 0, pay: 0, drafts: 0, approved: 0 },
  );
  const rangeLink = (start: string, end: string) => `/schedule/timesheets?${new URLSearchParams({ from: start, to: end, ...(staffFilter ? { staff: staffFilter } : {}) })}`;

  return (
    <>
      <form className="flex flex-wrap items-end gap-3 px-9 pt-5 pb-3" action="/schedule/timesheets">
        <Field label="From">
          <Input type="date" name="from" defaultValue={from} className="w-40" />
        </Field>
        <Field label="To">
          <Input type="date" name="to" defaultValue={to} className="w-40" />
        </Field>
        <Field label="Staff">
          <Select name="staff" defaultValue={staffFilter} className="w-52">
            <option value="">Everyone</option>
            {staff.data.map((s) => (
              <option key={s.id} value={s.id}>
                {personName(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="h-9">
          Show
        </Button>
        <div className="ml-auto flex items-center gap-3 pb-2 text-[13px]">
          <Link href={rangeLink(addDays(from, -7), addDays(from, -1))} className={textLinkClass}>
            Previous week
          </Link>
          <Link href={rangeLink(addDays(to, 1), addDays(to, 7))} className={textLinkClass}>
            Next week
          </Link>
        </div>
      </form>

      {params.error ? (
        <div className="px-9 pb-3">
          <Alert>{params.error}</Alert>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-3 px-9 pb-4">
        <Stat label="Hours worked" value={formatHours(totals.minutes)} />
        <Stat label="Travel" value={`${Math.round(totals.km * 10) / 10} km`} />
        <Stat label="To approve" value={String(totals.drafts)} />
        {admin ? <Stat label="Estimated pay" value={formatMoney(totals.pay, workspace.currency)} /> : <Stat label="Approved" value={String(totals.approved)} />}
      </div>

      {admin ? (
        <form id={APPROVAL_FORM} className="flex items-center gap-2 px-9 pb-3">
          <input type="hidden" name="return" value={here} />
          <Button type="submit" variant="primary" formAction={setTimesheetsApproved.bind(null, true)}>
            <Check size={14} /> Approve selected
          </Button>
          <Button type="submit" formAction={setTimesheetsApproved.bind(null, false)}>
            <Undo2 size={14} /> Back to draft
          </Button>
          <span className="text-[12px] text-ink-3">Only approved entries are locked and exported for payroll.</span>
        </form>
      ) : null}

      {entries.data.length === 0 ? (
        <EmptyState icon={<Check size={18} />} title="No timesheets in this period" body="Timesheets are created for each worker when a shift is published." />
      ) : (
        <Table columns={[...(admin ? [""] : []), "Date", "Staff", "Client", "Time", "Worked", "Travel", "Status", ""]}>
          {entries.data.map((e) => {
            const status = TIMESHEET_STATUS[e.status];
            return (
              <Row key={e.id} href={e.shift_id ? `/schedule/shifts/${e.shift_id}` : undefined}>
                {admin ? (
                  <ActionCell>
                    {e.status === "locked" ? null : (
                      <input
                        type="checkbox"
                        name="entry"
                        value={e.id}
                        form={APPROVAL_FORM}
                        aria-label="Select entry"
                        className="size-4 accent-[var(--color-accent)]"
                      />
                    )}
                  </ActionCell>
                ) : null}
                <Cell>{formatWeekday(e.work_date)}</Cell>
                <Cell>{e.staff ? personName(e.staff) : "Staff member"}</Cell>
                <Cell className="text-ink-3">{e.contact ? personName(e.contact) : "—"}</Cell>
                <Cell className="tabular-nums">
                  {formatShiftTime(e.starts_at, e.ends_at, tz)}
                  {e.synced ? "" : <span className="text-ink-3"> · edited</span>}
                </Cell>
                <Cell className="tabular-nums">
                  {formatHours(e.worked_minutes ?? 0)}
                  {e.break_minutes ? <span className="text-ink-3"> ({e.break_minutes}m break)</span> : null}
                </Cell>
                <Cell className="tabular-nums">{Number(e.km) ? `${Number(e.km)} km` : "—"}</Cell>
                <Cell>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </Cell>
                <ActionCell>
                  {e.status === "locked" ? null : (
                    <FormDialog
                      triggerVariant="ghost"
                      trigger={<Pencil size={14} aria-label="Edit entry" />}
                      title="Edit timesheet"
                      description="Actual times replace the rostered ones. On a completed shift, the client's charges are recalculated."
                      action={updateTimesheet.bind(null, e.id)}
                      submitLabel="Save"
                    >
                      <input type="hidden" name="return" value={here} />
                      <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-3">
                        <Field label="Date">
                          <Input name="day" type="date" required defaultValue={localParts(e.starts_at, tz).day} />
                        </Field>
                        <Field label="Start">
                          <Input name="start" type="time" required defaultValue={localParts(e.starts_at, tz).clock} />
                        </Field>
                        <Field label="End">
                          <Input name="end" type="time" required defaultValue={localParts(e.ends_at, tz).clock} />
                        </Field>
                        <Field label="Break" hint="min">
                          <Input name="break" type="number" min={0} max={600} defaultValue={e.break_minutes} />
                        </Field>
                      </div>
                      <Field label="Travel" hint="Kilometres driven with or for the client">
                        <Input name="km" type="number" min={0} max={2000} step="0.1" defaultValue={Number(e.km)} />
                      </Field>
                      <Field label="Notes">
                        <Textarea name="notes" rows={2} maxLength={1000} defaultValue={e.notes} />
                      </Field>
                    </FormDialog>
                  )}
                </ActionCell>
              </Row>
            );
          })}
        </Table>
      )}

      {admin ? (
        <div className="grid grid-cols-[1fr_1.4fr] gap-4 px-9 py-6">
          <Card className="p-5">
            <h2 className="text-[13px] font-medium">Lock for payroll</h2>
            <p className="mt-1 text-[13px] text-ink-3">
              Locks the {totals.approved} approved {totals.approved === 1 ? "entry" : "entries"} from {formatDay(from)} to {formatDay(to)}
              {staffFilter ? " for this staff member" : ""}. Locked entries can&apos;t be edited until an admin unlocks them with a reason.
            </p>
            <form action={lockTimesheets} className="mt-4">
              <input type="hidden" name="return" value={here} />
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
              <input type="hidden" name="staff" value={staffFilter} />
              <Button type="submit" variant="primary" disabled={totals.approved === 0}>
                <Lock size={14} /> Lock period
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <h2 className="px-5 pt-4 pb-2 text-[13px] font-medium">Payroll exports</h2>
            {exports.data.length === 0 ? <p className="px-5 pb-4 text-[13px] text-ink-3">Locked pay periods appear here for download.</p> : null}
            <ul>
              {exports.data.map((x) => {
                const count = x.timesheet_entries[0]?.count ?? 0;
                return (
                  <li key={x.id} className="flex items-center gap-3 border-t border-line px-5 py-2.5 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {formatDay(x.period_start)} – {formatDay(x.period_end)}
                      </div>
                      <div className="text-[12px] text-ink-3">
                        {x.staff ? personName(x.staff) : "Everyone"} · {count} {count === 1 ? "entry" : "entries"} ·{" "}
                        {x.exported_at ? `downloaded ${x.export_count}×` : "not downloaded"}
                      </div>
                    </div>
                    <DownloadButton href={`/schedule/timesheets/export/${x.id}`} label="CSV" disabled={count === 0} />
                    {count ? (
                      <FormDialog
                        triggerVariant="ghost"
                        trigger={<Unlock size={14} aria-label="Unlock" />}
                        title="Unlock timesheets"
                        description={`Returns ${count} ${count === 1 ? "entry" : "entries"} to approved so they can be corrected. If payroll has already run, you'll need to adjust it.`}
                        action={unlockTimesheets.bind(null, x.id)}
                        submitLabel="Unlock"
                      >
                        <input type="hidden" name="return" value={here} />
                        <Field label="Reason">
                          <Textarea name="reason" required minLength={3} maxLength={500} rows={2} placeholder="Shift end time was recorded incorrectly" />
                        </Field>
                        <Field label="Your password">
                          <Input name="password" type="password" required autoComplete="current-password" />
                        </Field>
                      </FormDialog>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {unlocks.data.length ? (
              <div className="border-t border-line px-5 py-3">
                <h3 className="text-[12px] font-medium text-ink-3">Recent unlocks</h3>
                <ul className="mt-1 space-y-1 text-[12px] text-ink-3">
                  {unlocks.data.map((u) => (
                    <li key={u.id}>
                      {formatDate(u.created_at)} · {u.actor_name || "Admin"} unlocked {u.entry_count}
                      {u.payroll_export ? ` from ${formatDay(u.payroll_export.period_start)}` : ""}: {u.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className="mt-0.5 text-[16px] font-medium tabular-nums">{value}</div>
    </Card>
  );
}
