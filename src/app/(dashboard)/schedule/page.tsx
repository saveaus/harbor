import Link from "next/link";
import { clsx } from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight, Mail, Plus, Send } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Alert, Button, ButtonLink, EmptyState, Field, Input, buttonClass } from "@/components/ui";
import { awardIssues, brokenShiftDays, shiftKind } from "@/lib/award";
import { compliance, complianceSummary } from "@/lib/care";
import { personName } from "@/lib/format";
import {
  addDays,
  formatHours,
  formatLongDay,
  formatMonth,
  formatShiftTime,
  formatWeekday,
  isDay,
  localParts,
  monthDays,
  monthStart,
  overlapping,
  today,
  weekDays,
  weekStart,
  zonedInstant,
} from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { emailRoster, publishWeek, saveShift } from "./actions";
import { loadAwardContext } from "./award-data";
import { loadShiftOptions } from "./data";
import { DayTimeline } from "./day-timeline";
import { cardTone, KindIcon, RosterBoard, type BoardCard, type BoardRow } from "./roster-board";
import { ShiftForm } from "./shift-form";

const GROUPINGS = { staff: "Staff", clients: "Clients", sites: "Sites" } as const;
type Grouping = keyof typeof GROUPINGS;

const weekLabel = (start: string) => {
  const format = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
  const end = addDays(start, 6);
  return `${format.format(new Date(`${start}T00:00:00Z`))} – ${format.format(new Date(`${end}T00:00:00Z`))} ${end.slice(0, 4)}`;
};

type Params = { week?: string; day?: string; month?: string; by?: string; error?: string; notice?: string };

export default async function RosterPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [params, ctx] = await Promise.all([searchParams, requireApp("scheduling")]);
  const { supabase, workspace, member } = ctx;
  const tz = workspace.timezone;
  const now = today(tz);
  const dayView = params.day !== undefined && isDay(params.day);
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) && isDay(`${params.month}-01`) ? `${params.month}-01` : null;
  const monthView = Boolean(month) && !dayView;
  const focusDay = dayView && params.day ? params.day : null;
  const week = weekStart(focusDay ?? (params.week && isDay(params.week) ? params.week : now));
  const days = month ? monthDays(month) : weekDays(week);
  const by: Grouping = params.by === "clients" || params.by === "sites" ? params.by : "staff";
  const shownFrom = focusDay ?? month ?? week;
  const shownTo = focusDay ? addDays(focusDay, 1) : month ? addDays(monthDays(month).at(-1) ?? month, 1) : addDays(week, 7);

  const [options, shifts, staffMeta, credentials, award] = await Promise.all([
    loadShiftOptions(ctx),
    supabase
      .from("shifts")
      .select(
        "id, starts_at, ends_at, status, rostered_minutes, sleepover, broken, site_id, site:sites(name), shift_staff(staff_id, staff:staff(first_name, last_name, email)), shift_clients(contact_id, contact:contacts(first_name, last_name, email))",
      )
      .eq("workspace_id", workspace.id)
      .gte("starts_at", zonedInstant(shownFrom, "00:00", tz).toISOString())
      .lt("starts_at", zonedInstant(shownTo, "00:00", tz).toISOString())
      .order("starts_at"),
    supabase.from("staff").select("id, required_credentials").eq("workspace_id", workspace.id),
    supabase.from("staff_credentials").select("staff_id, kind, expires_on, review").eq("workspace_id", workspace.id),
    loadAwardContext(ctx, zonedInstant(addDays(week, -1), "00:00", tz).toISOString(), zonedInstant(addDays(week, 8), "00:00", tz).toISOString()),
  ]);
  if (shifts.error) throw shifts.error;
  if (staffMeta.error) throw staffMeta.error;
  if (credentials.error) throw credentials.error;

  const unpublishedIds = shifts.data.filter((s) => s.status === "unpublished").map((s) => s.id);
  const publishReasons = unpublishedIds.length
    ? await supabase.rpc("list_shift_publish_reasons", { ws: workspace.id, ids: unpublishedIds })
    : { data: [] as { shift_id: string; reason: string }[], error: null };
  const gateLoadError = publishReasons.error ? "Couldn't load publish checks for this week." : null;
  const publishByShift = new Map<string, string[]>();
  for (const row of publishReasons.data ?? []) {
    const list = publishByShift.get(row.shift_id) ?? [];
    if (!list.includes(row.reason)) list.push(row.reason);
    publishByShift.set(row.shift_id, list);
  }

  const issues = awardIssues(award.shifts, award.rules, tz, award.limits);
  const issuesFor = (shiftId: string, staffId: string | null) =>
    issues.filter((i) => i.shiftId === shiftId && (staffId === null || i.staffId === staffId)).map((i) => i.message);
  const brokenDays = brokenShiftDays(
    award.shifts
      .filter((s) => days.includes(localParts(s.startsAt, tz).day))
      .map((s) => ({ staffId: s.staffId, day: localParts(s.startsAt, tz).day, broken: s.broken })),
    award.rules,
  );

  const cards: BoardCard[] = [];
  const minutesByRow = new Map<string | null, number>();
  const spansByStaff = new Map<string, { id: string; starts_at: string; ends_at: string }[]>();
  for (const shift of shifts.data) {
    const day = localParts(shift.starts_at, tz).day;
    const clientNames = shift.shift_clients.map((c) => (c.contact ? personName(c.contact) : "Client")).join(", ") || "No client";
    const staffNames = shift.shift_staff.map((s) => (s.staff ? personName(s.staff) : "Staff")).join(", ") || "Open shift";
    const rowIds: (string | null)[] = (() => {
      switch (by) {
        case "staff":
          return shift.shift_staff.length ? shift.shift_staff.map((s) => s.staff_id) : [null];
        case "clients":
          return shift.shift_clients.map((c) => c.contact_id);
        case "sites":
          return [shift.site_id];
        default: {
          const unknown: never = by;
          return unknown;
        }
      }
    })();
    for (const rowId of rowIds) {
      cards.push({
        key: `${shift.id}:${rowId ?? "none"}`,
        shiftId: shift.id,
        rowId,
        day,
        time: formatShiftTime(shift.starts_at, shift.ends_at, tz),
        label: by === "staff" ? clientNames : by === "clients" ? staffNames : `${clientNames} · ${staffNames}`,
        status: shift.status,
        kind: shiftKind(shift),
        clash: false,
        issues: shift.status === "cancelled" ? [] : issuesFor(shift.id, by === "staff" ? rowId : null),
        blocks: shift.status === "cancelled" ? [] : (publishByShift.get(shift.id) ?? []),
        workers: shift.shift_staff.length,
      });
      if (shift.status !== "cancelled") minutesByRow.set(rowId, (minutesByRow.get(rowId) ?? 0) + (shift.rostered_minutes ?? 0));
    }
    if (shift.status !== "cancelled") {
      for (const s of shift.shift_staff) spansByStaff.set(s.staff_id, [...(spansByStaff.get(s.staff_id) ?? []), shift]);
    }
  }
  const clashes = new Set<string>();
  for (const spans of spansByStaff.values()) for (const id of overlapping(spans)) clashes.add(id);
  for (const card of cards) card.clash = clashes.has(card.shiftId);

  const required = new Map(staffMeta.data.map((s) => [s.id, s.required_credentials]));
  const rows: BoardRow[] = await (async () => {
    const hours = (id: string | null) => formatHours(minutesByRow.get(id) ?? 0);
    switch (by) {
      case "staff": {
        const listed = new Set(options.staff.map((s) => s.id));
        const unlisted = [...new Set(cards.flatMap((c) => (c.rowId && !listed.has(c.rowId) ? [c.rowId] : [])))];
        const former = unlisted.length
          ? await supabase.from("staff").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).in("id", unlisted)
          : { data: [], error: null };
        if (former.error) throw former.error;
        return [
          { id: null, name: "Open shifts", hours: hours(null), flag: null, person: false },
          ...options.staff.map((s) => {
            const summary = complianceSummary(
              compliance(
                credentials.data.filter((c) => c.staff_id === s.id),
                required.get(s.id) ?? [],
              ),
            );
            const broken = [...brokenDays.values()].filter((b) => b.staffId === s.id).length;
            const flags = [summary.tone === "green" ? "" : `Credentials: ${summary.label}`, broken ? `${broken} broken shift day${broken === 1 ? "" : "s"}` : ""];
            return { id: s.id, name: s.name, hours: hours(s.id), flag: flags.filter(Boolean).join(" · ") || null, person: true };
          }),
          ...former.data.map((s) => ({ id: s.id, name: `${personName(s)} (inactive)`, hours: hours(s.id), flag: null, person: true })),
        ];
      }
      case "clients": {
        const shown = new Set(cards.map((c) => c.rowId));
        return options.clients
          .filter((c) => shown.has(c.id) || options.funding[c.id])
          .map((c) => {
            const short = (options.funding[c.id] ?? []).filter((l) => l.remainingCents < 0);
            return { id: c.id, name: c.name, hours: hours(c.id), flag: short.length ? `Over budget: ${short.map((l) => l.name).join(", ")}` : null, person: true };
          });
      }
      case "sites":
        return [
          { id: null, name: "No site", hours: hours(null), flag: null, person: false },
          ...options.sites.map((s) => ({ id: s.id, name: s.name, hours: hours(s.id), flag: null, person: false })),
        ];
      default: {
        const unknown: never = by;
        return unknown;
      }
    }
  })();

  const drafts = shifts.data.filter((s) => s.status === "unpublished").length;
  const clashCount = new Set(cards.filter((c) => c.clash).map((c) => c.shiftId)).size;
  const awardCount = new Set(issues.filter((i) => shifts.data.some((s) => s.id === i.shiftId)).map((i) => i.shiftId)).size;
  const blockedCount = publishByShift.size;
  const query = (patch: Partial<Record<"week" | "day" | "month" | "by", string | null>>) => {
    const next = new URLSearchParams();
    const merged = {
      week: focusDay || monthView ? null : week,
      day: focusDay,
      month: monthView && month ? month.slice(0, 7) : null,
      by: by === "staff" ? null : by,
      ...patch,
    };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const qs = next.toString();
    return qs ? `/schedule?${qs}` : "/schedule";
  };
  const anchor = focusDay ?? month ?? week;
  const move = (n: number) => {
    if (focusDay) return query({ day: addDays(anchor, n) });
    if (monthView && month) {
      const next = monthStart(addDays(month, n > 0 ? 32 : -1));
      return query({ month: next.slice(0, 7), week: null, day: null });
    }
    return query({ week: addDays(anchor, n) });
  };
  const rosteredClients = options.clients.filter((c) => cards.some((card) => by !== "clients" || card.rowId === c.id));

  const newShift = (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New shift
        </>
      }
      title="New shift"
      description="Draft shifts stay off timesheets and billing until you publish them."
      action={saveShift.bind(null, null)}
      submitLabel="Save"
      extraSubmit={{ name: "publish", value: "1", label: "Save & Publish" }}
    >
      <ShiftForm
        options={options}
        defaults={{
          title: "",
          day: focusDay ?? (days.includes(now) ? now : week),
          start: "09:00",
          end: "12:00",
          breakMinutes: 0,
          staffIds: [],
          clients: [],
          address: "",
          notes: "",
          siteId: "",
          award: "standard",
          pin: null,
          travelBetween: false,
          travelKm: 0,
        }}
        allowRepeat
        showCosts={member.role !== "member"}
        currency={workspace.currency}
      />
    </FormDialog>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-9 py-4">
        <Link
          href={move(focusDay ? -1 : monthView ? -1 : -7)}
          aria-label={focusDay ? "Previous day" : monthView ? "Previous month" : "Previous week"}
          className={buttonClass("secondary", "w-7 px-0")}
        >
          <ChevronLeft size={14} />
        </Link>
        <Link
          href={move(focusDay ? 1 : monthView ? 1 : 7)}
          aria-label={focusDay ? "Next day" : monthView ? "Next month" : "Next week"}
          className={buttonClass("secondary", "w-7 px-0")}
        >
          <ChevronRight size={14} />
        </Link>
        {(focusDay ? focusDay !== now : monthView ? month !== monthStart(now) : week !== weekStart(now)) ? (
          <ButtonLink href={focusDay ? query({ day: now }) : monthView ? query({ month: now.slice(0, 7) }) : query({ week: null })}>
            {focusDay ? "Today" : monthView ? "This month" : "This week"}
          </ButtonLink>
        ) : null}
        <span className="ml-1 text-[14px] font-medium text-ink">{focusDay ? formatLongDay(focusDay) : monthView && month ? formatMonth(month) : weekLabel(week)}</span>
        <span className="text-[13px] text-ink-3">
          · {drafts} draft{drafts === 1 ? "" : "s"}
          {clashCount ? ` · ${clashCount} overlapping` : ""}
          {blockedCount ? ` · ${blockedCount} blocked` : ""}
          {awardCount ? ` · ${awardCount} with award warnings` : ""}
          {brokenDays.size ? ` · ${brokenDays.size} broken shift day${brokenDays.size === 1 ? "" : "s"}` : ""}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented
            options={[
              { label: "Day", href: query({ day: focusDay ?? now, week: null, month: null }), active: Boolean(focusDay) },
              { label: "Week", href: query({ day: null, week, month: null }), active: !focusDay && !monthView },
              { label: "Month", href: query({ day: null, week: null, month: (month ?? monthStart(week)).slice(0, 7) }), active: monthView },
            ]}
          />
          <Segmented
            options={Object.entries(GROUPINGS).map(([key, label]) => ({ label, href: query({ by: key === "staff" ? null : key }), active: by === key }))}
          />
          <FormDialog
            trigger={
              <>
                <Mail size={14} /> Email rosters
              </>
            }
            triggerVariant="secondary"
            title="Email client rosters"
            description="Each client and their roster recipients get their published supports with times and staff names."
            action={emailRoster}
            submitLabel="Send rosters"
          >
            <input type="hidden" name="return" value={query({})} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <Input name="from" type="date" required defaultValue={week} />
              </Field>
              <Field label="To">
                <Input name="to" type="date" required defaultValue={addDays(week, 6)} />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-1.5 block text-[13px] font-medium text-ink">Clients</legend>
              <div className="max-h-48 overflow-y-auto rounded-control border border-line">
                {rosteredClients.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[13px] last:border-0 hover:bg-hover">
                    <input type="checkbox" name="client" value={c.id} defaultChecked className="size-4 accent-[var(--color-accent)]" />
                    {c.name}
                  </label>
                ))}
                {rosteredClients.length === 0 ? <p className="px-3 py-2 text-[13px] text-ink-3">No clients yet.</p> : null}
              </div>
            </fieldset>
          </FormDialog>
          {drafts && !focusDay && !monthView ? (
            <form action={publishWeek.bind(null, week)}>
              <Button type="submit">
                <Send size={14} /> Publish week
              </Button>
            </form>
          ) : null}
          {newShift}
        </div>
      </div>
      {params.error || gateLoadError ? (
        <div className="px-9 pb-3">
          <Alert>{params.error ?? gateLoadError}</Alert>
        </div>
      ) : null}
      {params.notice ? (
        <div className="px-9 pb-3">
          <Alert tone="success">{params.notice}</Alert>
        </div>
      ) : null}
      {options.staff.length === 0 && shifts.data.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={18} />}
          title="Add staff to start rostering"
          body="Shifts are worked by staff and delivered to clients. Add your team first, then build the week here."
          action={<ButtonLink href="/staff">Go to Staff</ButtonLink>}
        />
      ) : focusDay ? (
        <DayTimeline rows={rows} cards={cards} shifts={shifts.data} timeZone={tz} />
      ) : monthView ? (
        <MonthGrid days={days} cards={cards} today={now} hrefFor={(day) => query({ day, month: null, week: null })} />
      ) : (
        <div className="overflow-x-auto">
          <RosterBoard
            days={days.map((day) => ({ day, label: formatWeekday(day), today: day === now }))}
            rows={rows}
            cards={cards}
            week={week}
            rowLabel={GROUPINGS[by]}
            reassign={by === "staff"}
          />
        </div>
      )}
    </>
  );
}

function MonthGrid({ days, cards, today, hrefFor }: { days: string[]; cards: BoardCard[]; today: string; hrefFor: (day: string) => string }) {
  const pad = (new Date(`${days[0]}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array.from({ length: pad }, () => null), ...days];
  while (cells.length % 7) cells.push(null);
  return (
    <div className="px-9 pb-10">
      <div className="grid grid-cols-7 border-t border-l border-line">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="border-r border-b border-line bg-surface px-3 py-2 text-[12px] font-medium text-ink-3">
            {label}
          </div>
        ))}
        {cells.map((day, i) => (
          <div key={day ?? `empty-${i}`} className={clsx("min-h-[120px] space-y-1 border-r border-b border-line p-1.5", day === today && "bg-info-soft/40")}>
            {day ? (
              <>
                <Link href={hrefFor(day)} className={clsx("text-[12px] font-medium", day === today ? "text-link" : "text-ink-3")}>
                  {Number(day.slice(8))}
                </Link>
                {cards
                  .filter((c) => c.day === day)
                  .slice(0, 4)
                  .map((card) => (
                    <Link
                      key={card.key}
                      href={`/schedule/shifts/${card.shiftId}`}
                      title={card.blocks[0] ?? card.issues[0]}
                      className={clsx("block truncate rounded-control border px-1.5 py-0.5 text-[11px]", cardTone[card.status], card.blocks.length && "ring-1 ring-danger")}
                    >
                      <KindIcon kind={card.kind} /> {card.time} {card.label}
                    </Link>
                  ))}
                {cards.filter((c) => c.day === day).length > 4 ? (
                  <Link href={hrefFor(day)} className="block px-1 text-[11px] text-ink-3">
                    +{cards.filter((c) => c.day === day).length - 4} more
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Segmented({ options }: { options: { label: string; href: string; active: boolean }[] }) {
  return (
    <div className="inline-flex rounded-control border border-line bg-surface p-0.5">
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          className={clsx("rounded-[5px] px-2.5 py-1 text-[12px] font-medium", o.active ? "bg-canvas text-ink shadow-card" : "text-ink-3 hover:text-ink")}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
