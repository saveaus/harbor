"use client";

import { LocateFixed, Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SHIFT_KINDS, type ShiftKind } from "@/lib/award";
import { FUNDING } from "@/lib/care";
import { UNITS, supportCategory } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { REPEATS } from "@/lib/roster";
import type { ShiftOptions } from "./data";

export type ShiftDefaults = {
  title: string;
  day: string;
  start: string;
  end: string;
  breakMinutes: number;
  staffIds: string[];
  clients: { contactId: string; itemId: string; share: number }[];
  address: string;
  notes: string;
  siteId: string;
  award: ShiftKind;
  pin: { latitude: number; longitude: number } | null;
  travelBetween: boolean;
  travelKm: number;
};

type ClientRow = { key: number; contactId: string; itemId: string; share: string };

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff <= 0 ? diff + 24 * 60 : diff;
}

const toRows = (clients: ShiftDefaults["clients"]): ClientRow[] =>
  (clients.length ? clients : [{ contactId: "", itemId: "", share: 100 }]).map((c, key) => ({
    key,
    contactId: c.contactId,
    itemId: c.itemId,
    share: String(c.share),
  }));

export function ShiftForm({
  options,
  defaults,
  allowRepeat,
  showCosts,
  currency,
}: {
  options: ShiftOptions;
  defaults: ShiftDefaults;
  allowRepeat: boolean;
  showCosts: boolean;
  currency: string;
}) {
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [breakMinutes, setBreakMinutes] = useState(String(defaults.breakMinutes));
  const [staffIds, setStaffIds] = useState(new Set(defaults.staffIds));
  const [repeat, setRepeat] = useState("");
  const [siteId, setSiteId] = useState(defaults.siteId);
  const [pin, setPin] = useState(defaults.pin);
  const [locating, setLocating] = useState<"idle" | "busy" | "failed">("idle");
  const [rows, setRows] = useState<ClientRow[]>(() => toRows(defaults.clients));
  const [address, setAddress] = useState(defaults.address);
  const [travelBetween, setTravelBetween] = useState(defaults.travelBetween);

  const items = new Map(options.items.map((i) => [i.id, i]));
  const site = options.sites.find((s) => s.id === siteId);
  const workedMinutes = Math.max(0, minutesBetween(start, end) - (Number(breakMinutes) || 0));
  const hours = Math.round((workedMinutes / 60) * 100) / 100;
  const workers = options.staff.filter((s) => staffIds.has(s.id));
  const staffCost = workers.reduce((sum, s) => sum + Math.round(hours * (s.hourlyCents ?? 0)), 0);
  const chargeFor = (row: ClientRow) => {
    const item = items.get(row.itemId);
    if (!row.contactId || !item) return 0;
    const quantity = item.unit === "hour" ? hours : 1;
    return Math.max(1, workers.length) * Math.round(quantity * Math.round((item.rateCents * (Number(row.share) || 0)) / 100));
  };
  const charged = rows.reduce((sum, row) => sum + chargeFor(row), 0);
  const unratedStaff = workers.filter((s) => s.hourlyCents === null).length;

  const update = (key: number, patch: Partial<ClientRow>) => setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const locate = () => {
    if (!navigator.geolocation) {
      setLocating("failed");
      return;
    }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPin({ latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)) });
        setLocating("idle");
      },
      () => setLocating("failed"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const pickClient = (key: number, contactId: string) => {
    update(key, { contactId });
    if (address) return;
    const chosen = options.clients.find((c) => c.id === contactId);
    if (chosen?.address) setAddress(chosen.address);
  };

  return (
    <>
      <Field label="Title">
        <Input name="title" maxLength={160} defaultValue={defaults.title} placeholder="Community access" />
      </Field>
      <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-3">
        <Field label="Date">
          <Input name="day" type="date" required defaultValue={defaults.day} />
        </Field>
        <Field label="Start">
          <Input name="start" type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="End">
          <Input name="end" type="time" required value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <Field label="Break" hint="min">
          <Input name="break" type="number" min={0} max={600} value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
        </Field>
      </div>
      {end <= start ? <p className="-mt-2 text-[12px] text-ink-3">Finishes the next day.</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Shift type" hint="Sleepovers are paid the sleepover allowance; broken shifts earn broken shift allowances.">
          <Select name="award" defaultValue={defaults.award}>
            {Object.entries(SHIFT_KINDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Site">
          <Select name="site_id" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">No site</option>
            {options.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Group label="Clients" hint="Each client is charged their share of the support item.">
        {options.groups.length ? (
          <Select
            aria-label="Load a saved group"
            className="mb-2"
            value=""
            onChange={(e) => {
              const group = options.groups.find((g) => g.id === e.target.value);
              if (group) setRows(toRows(group.clients));
            }}
          >
            <option value="">Load a saved group…</option>
            {options.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.clients.length})
              </option>
            ))}
          </Select>
        ) : null}
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="grid grid-cols-[1.2fr_1.4fr_72px_28px] items-center gap-2">
                <Select name="client_id" value={row.contactId} onChange={(e) => pickClient(row.key, e.target.value)} aria-label="Client">
                  <option value="">Choose client</option>
                  {options.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.funding ? ` · ${FUNDING[c.funding].label}` : ""}
                    </option>
                  ))}
                </Select>
                <Select name="item_id" value={row.itemId} onChange={(e) => update(row.key, { itemId: e.target.value })} aria-label="Support item">
                  <option value="">No charge</option>
                  {options.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} · {formatMoney(i.rateCents, currency)}/{UNITS[i.unit].short}
                    </option>
                  ))}
                </Select>
                <Input
                  name="share"
                  type="number"
                  min={1}
                  max={100}
                  step="0.01"
                  aria-label="Share %"
                  value={row.share}
                  onChange={(e) => update(row.key, { share: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove client"
                  disabled={rows.length === 1}
                  className="rounded-control p-1 text-ink-3 hover:bg-hover hover:text-ink disabled:opacity-40"
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                >
                  <X size={14} />
                </button>
              </div>
              <Funding options={options} row={row} charge={chargeFor(row)} currency={currency} />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-link hover:text-ink"
              onClick={() => setRows((current) => [...current, { key: Math.max(...current.map((r) => r.key)) + 1, contactId: "", itemId: "", share: "100" }])}
            >
              <Plus size={13} /> Add client
            </button>
            <Input name="group_name" maxLength={80} placeholder="Save clients as a group (optional name)" className="h-7 max-w-64 text-[12px]" />
          </div>
        </div>
      </Group>

      <Group label="Staff" hint="Leave empty to offer the shift in the pool.">
        <div className="max-h-36 overflow-y-auto rounded-control border border-line">
          {options.staff.length === 0 ? <p className="px-3 py-2 text-[13px] text-ink-3">Add staff first.</p> : null}
          {options.staff.map((s) => (
            <label key={s.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[13px] last:border-0 hover:bg-hover">
              <input
                type="checkbox"
                name="staff_id"
                value={s.id}
                checked={staffIds.has(s.id)}
                onChange={(e) =>
                  setStaffIds((current) => {
                    const next = new Set(current);
                    if (e.target.checked) next.add(s.id);
                    else next.delete(s.id);
                    return next;
                  })
                }
                className="size-4 accent-[var(--color-accent)]"
              />
              {s.name}
            </label>
          ))}
        </div>
      </Group>

      <Field label="Address" hint={address ? undefined : "Filled from the first client, or the site."}>
        <Input name="address" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={site?.address || "Where the support happens"} />
      </Field>
      <Group label="More" hint="Travel between supports is billed from the timesheet once the shift is completed.">
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            name="travel_between"
            checked={travelBetween}
            onChange={(e) => setTravelBetween(e.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          Apply a travel claim in-between
        </label>
        {travelBetween ? (
          <Field label="Kilometres" hint="Copied onto draft timesheets for each worker">
            <Input name="travel_km" type="number" min={0.1} max={2000} step="0.1" defaultValue={defaults.travelKm || ""} required />
          </Field>
        ) : null}
      </Group>
      <Group
        label="Check-in location"
        hint={
          pin
            ? "Workers checking in further than the check-in radius from this pin are asked for a reason."
            : site?.latitude !== null && site
              ? `Uses ${site.name}'s location.`
              : "Without a pin, check-ins aren't distance checked."
        }
      >
        <input type="hidden" name="latitude" value={pin?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={pin?.longitude ?? ""} />
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {pin ? <span className="tabular-nums text-ink">{`${pin.latitude}, ${pin.longitude}`}</span> : null}
          <button type="button" onClick={locate} className="inline-flex items-center gap-1 font-medium text-link hover:text-ink">
            <LocateFixed size={13} /> {locating === "busy" ? "Locating…" : "Use this device's location"}
          </button>
          {pin ? (
            <button type="button" onClick={() => setPin(null)} className="font-medium text-ink-3 hover:text-ink">
              Clear
            </button>
          ) : null}
          {locating === "failed" ? <span className="text-warning">Location isn&apos;t available on this device.</span> : null}
        </div>
      </Group>
      <Field label="Notes">
        <Textarea name="notes" rows={2} maxLength={2000} defaultValue={defaults.notes} />
      </Field>

      {allowRepeat ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Repeat">
            <Select name="repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
              <option value="">Doesn&apos;t repeat</option>
              {Object.entries(REPEATS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {repeat ? (
            <Field label="Until" hint="Up to 60 shifts">
              <Input name="repeat_until" type="date" required />
            </Field>
          ) : null}
        </div>
      ) : null}

      {showCosts ? (
        <div className="grid grid-cols-3 gap-3 rounded-card border border-line bg-surface px-4 py-3 text-[13px]">
          <Total label="Charged" value={formatMoney(charged, currency)} />
          <Total label="Staff cost" value={formatMoney(staffCost, currency)} note={unratedStaff ? `${unratedStaff} without a pay rate` : undefined} />
          <Total label="Margin" value={formatMoney(charged - staffCost, currency)} />
        </div>
      ) : null}
    </>
  );
}

/** The client's funding left on the budget lines this charge would draw from. */
function Funding({ options, row, charge, currency }: { options: ShiftOptions; row: ClientRow; charge: number; currency: string }) {
  const lines = options.funding[row.contactId];
  if (!row.contactId || !lines?.length) return null;
  const item = options.items.find((i) => i.id === row.itemId);
  const category = item ? supportCategory(item.supportNumber) : "";
  const relevant = lines.filter((l) => l.category === "" || l.category === category);
  if (!relevant.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-1 text-[12px]">
      {relevant.map((l) => {
        const after = l.remainingCents - charge;
        return (
          <span key={l.name} className={after < 0 ? "text-danger" : "text-ink-3"}>
            {l.name}: {formatMoney(l.remainingCents, currency)} left
            {charge ? ` · ${formatMoney(after, currency)} after this shift` : ""}
          </span>
        );
      })}
    </div>
  );
}

function Group({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-[13px] font-medium text-ink">{label}</legend>
      {children}
      <p className="mt-1 text-[13px] text-ink-3">{hint}</p>
    </fieldset>
  );
}

function Total({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <div className="text-ink-3">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
      {note ? <div className="text-[12px] text-warning">{note}</div> : null}
    </div>
  );
}
