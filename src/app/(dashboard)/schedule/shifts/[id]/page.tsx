import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, Copy, Pencil, RotateCcw, Send, Trash2, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { FormDialog } from "@/components/dialog";
import { Alert, Badge, Button, Card, Cell, Field, Input, Person, Row, Select, Table, Textarea } from "@/components/ui";
import {
  BILLABLE_KIND,
  BILLABLE_STATUS,
  CANCELLATION_REASONS,
  SHORT_NOTICE_HOURS,
  TIMESHEET_STATUS,
  formatQuantity,
  hoursUntilChargeFree,
  insideShortNotice,
} from "@/lib/finance";
import { formatMoney, personName } from "@/lib/format";
import { SHIFT_STATUS, formatHours, formatLongDay, formatShiftTime, localParts, weekStart } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { cancelShift, deleteShift, duplicateShift, saveShift, saveSleepoverHours, saveSupportNote, shiftStep } from "../../actions";
import { loadShiftOptions } from "../../data";
import { ShiftForm } from "../../shift-form";

export default async function ShiftPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error: notice }, ctx] = await Promise.all([params, searchParams, requireApp("scheduling")]);
  const { supabase, workspace, member, installedApps } = ctx;
  const tz = workspace.timezone;
  const admin = member.role !== "member";

  const [shift, entries, billables, options, settings] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "id, title, starts_at, ends_at, break_minutes, rostered_minutes, status, address, notes, support_note, series_id, client_charged, staff_paid, cancellation_reason, sleepover, broken, site_id, latitude, longitude, travel_between, travel_km, shift_staff(staff_id, staff:staff(first_name, last_name, email)), shift_clients(contact_id, item_id, share_percent, item_rate_cents, contact:contacts(first_name, last_name, email), item:price_book_items(name, support_number, unit, rate_cents))",
      )
      .eq("workspace_id", workspace.id)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("timesheet_entries")
      .select("id, starts_at, ends_at, worked_minutes, km, status, synced, staff:staff(first_name, last_name, email)")
      .eq("workspace_id", workspace.id)
      .eq("shift_id", id)
      .order("starts_at"),
    supabase
      .from("billables")
      .select("id, kind, description, quantity, unit, amount_cents, status, invoice_id, claim_id, contact:contacts(first_name, last_name, email)")
      .eq("workspace_id", workspace.id)
      .eq("shift_id", id)
      .neq("status", "void")
      .order("created_at"),
    loadShiftOptions(ctx),
    supabase.from("finance_settings").select("short_notice_hours").eq("workspace_id", workspace.id).maybeSingle(),
  ]);
  if (shift.error) throw shift.error;
  if (!shift.data) notFound();
  if (entries.error) throw entries.error;
  if (billables.error) throw billables.error;
  if (settings.error) throw settings.error;

  const s = shift.data;
  const gates =
    s.status === "unpublished"
      ? await supabase.rpc("list_shift_publish_reasons", { ws: workspace.id, ids: [s.id] })
      : { data: [] as { reason: string }[], error: null };
  const gateLoadError = gates.error ? "Couldn't load why this shift is blocked from publishing." : null;
  const local = localParts(s.starts_at, tz);
  const week = weekStart(local.day);
  const status = SHIFT_STATUS[s.status];
  const editable = s.status === "unpublished" || s.status === "published";
  const step = (name: Parameters<typeof shiftStep>[1]) => shiftStep.bind(null, s.id, name);
  const noticeHours = settings.data?.short_notice_hours ?? SHORT_NOTICE_HOURS;
  const shortNotice = insideShortNotice(s.starts_at, noticeHours);
  const chargeFreeIn = hoursUntilChargeFree(s.starts_at, noticeHours);
  const publishReasons = [...new Set((gates.data ?? []).map((row) => row.reason))];
  const noticeIsGates = Boolean(notice && publishReasons.length && publishReasons.every((reason) => notice.includes(reason)));

  const editDialog = (
    <FormDialog
      triggerVariant="secondary"
      trigger={
        <>
          <Pencil size={14} /> Edit
        </>
      }
      title="Edit shift"
      description={s.series_id ? "Changes apply to this shift only, not the rest of its series." : undefined}
      action={saveShift.bind(null, s.id)}
      submitLabel="Save shift"
    >
      <ShiftForm
        options={options}
        defaults={{
          title: s.title,
          day: local.day,
          start: local.clock,
          end: localParts(s.ends_at, tz).clock,
          breakMinutes: s.break_minutes,
          staffIds: s.shift_staff.map((x) => x.staff_id),
          clients: s.shift_clients.map((c) => ({ contactId: c.contact_id, itemId: c.item_id ?? "", share: Number(c.share_percent) })),
          address: s.address,
          notes: s.notes,
          siteId: s.site_id ?? "",
          award: s.sleepover ? "sleepover" : s.broken ? "broken" : "standard",
          pin: s.latitude !== null && s.longitude !== null ? { latitude: s.latitude, longitude: s.longitude } : null,
          travelBetween: s.travel_between,
          travelKm: Number(s.travel_km),
        }}
        allowRepeat={false}
        showCosts={admin}
        currency={workspace.currency}
      />
    </FormDialog>
  );

  const cancelDialog = (
    <FormDialog
      triggerVariant="danger"
      trigger={
        <>
          <Ban size={14} /> Cancel shift
        </>
      }
      title="Cancel shift"
      description={
        shortNotice
          ? `Inside the ${noticeHours}-hour short-notice window. A cancellation billable is raised with the reason you choose.`
          : `Outside the ${noticeHours}-hour short-notice window${chargeFreeIn ? ` · ${chargeFreeIn} hours until a cancellation would be charged` : ""}. The shift is cancelled with no charge.`
      }
      action={cancelShift.bind(null, s.id)}
      submitLabel="Cancel shift"
    >
      {shortNotice ? (
        <Field label="Reason" hint="Sent to the NDIA with the cancellation claim.">
          <Select name="reason" required defaultValue="">
            <option value="">Choose a reason</option>
            {Object.entries(CANCELLATION_REASONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" name="pay" className="size-4 accent-[var(--color-accent)]" /> Pay staff for the rostered hours
      </label>
    </FormDialog>
  );

  return (
    <div className="w-full max-w-[1000px] space-y-5 px-9 py-6">
      <Link href={`/schedule?week=${week}`} className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft size={13} /> Roster
      </Link>
      {notice && !noticeIsGates ? <Alert>{notice}</Alert> : null}
      {gateLoadError ? <Alert>{gateLoadError}</Alert> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-medium text-ink">{s.title || formatLongDay(local.day)}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            {s.title ? `${formatLongDay(local.day)} · ` : ""}
            {formatShiftTime(s.starts_at, s.ends_at, tz)} · {formatHours(s.rostered_minutes ?? 0)} rostered
            {s.break_minutes ? ` · ${s.break_minutes} min break` : ""}
            {s.travel_between ? ` · ${Number(s.travel_km)} km travel` : ""}
            {s.series_id ? " · Repeating" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={duplicateShift.bind(null, s.id)}>
            <Button type="submit" variant="secondary">
              <Copy size={14} /> Duplicate
            </Button>
          </form>
          {editable ? editDialog : null}
          {s.status === "unpublished" ? (
            <>
              <StepButton action={step("publish")} variant="primary" icon={<Send size={14} />} label="Publish" />
              <form action={deleteShift.bind(null, s.id, week)}>
                <Button type="submit" variant="ghost" aria-label="Delete shift">
                  <Trash2 size={14} /> Delete
                </Button>
              </form>
            </>
          ) : null}
          {s.status === "published" ? (
            <>
              <StepButton action={step("unpublish")} icon={<Undo2 size={14} />} label="Unpublish" />
              <StepButton
                action={step("complete")}
                variant="primary"
                icon={<CheckCircle2 size={14} />}
                label="Complete"
                disabled={!s.support_note}
                title={s.support_note ? undefined : "Write the support note first"}
              />
            </>
          ) : null}
          {editable ? cancelDialog : null}
          {s.status === "completed" ? <StepButton action={step("reopen")} icon={<RotateCcw size={14} />} label="Reopen" /> : null}
          {s.status === "cancelled" ? <StepButton action={step("restore")} icon={<RotateCcw size={14} />} label="Restore" /> : null}
        </div>
      </div>

      {publishReasons.length ? (
        <Card className="space-y-2 p-5">
          <h2 className="text-[13px] font-medium text-danger">Can&apos;t publish yet</h2>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink">
            {publishReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {s.status === "published" && !s.support_note ? (
        <p className="text-[13px] text-ink-3">Completing this shift needs the support note. Write it below or at check-out.</p>
      ) : null}

      {s.support_note || s.status === "published" || s.status === "unpublished" ? (
        <Card className="space-y-3 p-5">
          <div>
            <h2 className="text-[13px] font-medium">Support note</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              Written at check-out, stored on this shift, and copied to each participant&apos;s notes. Required before the shift can be completed.
            </p>
          </div>
          {s.support_note ? <p className="whitespace-pre-wrap text-[13px]">{s.support_note}</p> : <p className="text-[13px] text-ink-3">No support note yet.</p>}
          {editable ? (
            <form action={saveSupportNote.bind(null, s.id)} className="space-y-3">
              <Field label={s.support_note ? "Update note" : "Write note"}>
                <Textarea name="note" required maxLength={20000} rows={4} defaultValue={s.support_note} placeholder="What support was delivered" />
              </Field>
              <Button type="submit">Save note</Button>
            </form>
          ) : null}
        </Card>
      ) : null}

      {s.status === "cancelled" ? (
        <p className="text-[13px] text-ink-3">
          {s.client_charged && s.cancellation_reason ? `Client charged: ${CANCELLATION_REASONS[s.cancellation_reason]}.` : "Client not charged."}{" "}
          {s.staff_paid ? "Staff are paid for the rostered hours." : "Staff aren't paid."}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-[13px] font-medium">Staff</h2>
          <ul className="mt-3 space-y-2">
            {s.shift_staff.length === 0 ? <li className="text-[13px] text-ink-3">Open shift. Staff can take it from the shift pool once it&apos;s published.</li> : null}
            {s.shift_staff.map((x) => (
              <li key={x.staff_id}>
                <Link href={`/staff/${x.staff_id}`}>
                  <Person name={x.staff ? personName(x.staff) : "Staff member"} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-[13px] font-medium">Clients</h2>
          <ul className="mt-3 space-y-2">
            {s.shift_clients.map((c) => (
              <li key={c.contact_id} className="flex items-center justify-between gap-3">
                <Link href={`/clients/${c.contact_id}`}>
                  <Person
                    name={c.contact ? personName(c.contact) : "Client"}
                    detail={c.item ? `${c.item.support_number || "No item number"} · ${c.item.name}` : "No charge"}
                  />
                </Link>
                <span className="text-[12px] text-ink-3 tabular-nums">
                  {Number(c.share_percent) === 100 ? "" : `${Number(c.share_percent)}% · `}
                  {c.item
                    ? `${formatMoney(c.item_rate_cents ?? c.item.rate_cents, workspace.currency)}/${c.item.unit}${c.item_rate_cents !== null ? " held" : ""}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {s.sleepover ? (
        <Card className="p-5">
          <h2 className="text-[13px] font-medium">Active hours</h2>
          <p className="mt-1 text-[13px] text-ink-3">Time the worker was awake during the sleepover. Hours beyond the free allowance are billed when the shift is completed.</p>
          {admin ? (
            <form action={saveSleepoverHours.bind(null, s.id)} className="mt-4 grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] items-end gap-3">
              <Field label="Date">
                <Input name="day" type="date" required defaultValue={local.day} />
              </Field>
              <Field label="From">
                <Input name="start" type="time" required />
              </Field>
              <Field label="To">
                <Input name="end" type="time" required />
              </Field>
              <Field label="Notes">
                <Input name="notes" maxLength={200} />
              </Field>
              <Button type="submit">Log hours</Button>
            </form>
          ) : null}
        </Card>
      ) : null}

      {s.address || s.notes ? (
        <Card className="space-y-2 p-5 text-[13px]">
          {s.address ? (
            <p>
              <span className="text-ink-3">Address:</span> {s.address}
            </p>
          ) : null}
          {s.notes ? <p className="whitespace-pre-wrap">{s.notes}</p> : null}
        </Card>
      ) : null}

      <Section title="Timesheets" description="Created for each worker when the shift is published. Actual times recorded here drive both pay and billing.">
        {entries.data.length === 0 ? (
          <p className="px-5 pb-4 text-[13px] text-ink-3">Publish the shift to create timesheets.</p>
        ) : (
          <Table columns={["Staff", "Time", "Worked", "Travel", "Status"]}>
            {entries.data.map((e) => (
              <Row key={e.id} href={`/schedule/timesheets?from=${local.day}&to=${local.day}`}>
                <Cell>{e.staff ? personName(e.staff) : "Staff member"}</Cell>
                <Cell className="tabular-nums">
                  {formatShiftTime(e.starts_at, e.ends_at, tz)}
                  {e.synced ? "" : " · edited"}
                </Cell>
                <Cell className="tabular-nums">{formatHours(e.worked_minutes ?? 0)}</Cell>
                <Cell className="tabular-nums">{Number(e.km) ? `${Number(e.km)} km` : "—"}</Cell>
                <Cell>
                  <Badge tone={TIMESHEET_STATUS[e.status].tone}>{TIMESHEET_STATUS[e.status].label}</Badge>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>

      <Section
        title="Billing"
        description="Pending while the shift is published; ready to invoice or claim once it's completed, using the hours actually worked."
      >
        {billables.data.length === 0 ? (
          <p className="px-5 pb-4 text-[13px] text-ink-3">
            {s.shift_clients.some((c) => c.item)
              ? "Publish the shift to create pending charges."
              : "No charges. Choose a support item for each client to bill this shift."}
          </p>
        ) : (
          <Table columns={["Client", "Charge", "Quantity", "Amount", "Status"]}>
            {billables.data.map((b) => (
              <Row
                key={b.id}
                href={
                  installedApps.has("payments") && b.invoice_id
                    ? `/payments/invoices/${b.invoice_id}`
                    : installedApps.has("finance") && b.claim_id
                      ? `/finance/claims/${b.claim_id}`
                      : undefined
                }
              >
                <Cell>{b.contact ? personName(b.contact) : "Client"}</Cell>
                <Cell>
                  <span className="block max-w-72 truncate">
                    {BILLABLE_KIND[b.kind]} · {b.description}
                  </span>
                </Cell>
                <Cell className="tabular-nums">{formatQuantity(Number(b.quantity), b.unit)}</Cell>
                <Cell className="tabular-nums">{formatMoney(b.amount_cents ?? 0, workspace.currency)}</Cell>
                <Cell>
                  <Badge tone={BILLABLE_STATUS[b.status].tone}>{BILLABLE_STATUS[b.status].label}</Badge>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

function StepButton({
  action,
  label,
  icon,
  variant = "secondary",
  disabled = false,
  title,
}: {
  action: () => Promise<void>;
  label: string;
  icon: ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <form action={disabled ? undefined : action} title={title}>
      <Button type="submit" variant={variant} disabled={disabled}>
        {icon} {label}
      </Button>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <h2 className="text-[13px] font-medium">{title}</h2>
        <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>
      </div>
      {children}
    </Card>
  );
}
