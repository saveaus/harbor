import Link from "next/link";
import { FileText } from "lucide-react";
import { Alert, Button, Card, EmptyState, Field, Input, textLinkClass } from "@/components/ui";
import { formatDay, formatMoney, personName } from "@/lib/format";
import { addDays, isDay, today } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { generateInvoices } from "../actions";
import { InvoicingTabs } from "../finance-nav";

type Ready = { contactId: string; name: string; billTo: string | null; planManaged: boolean; lines: number; cents: number; first: string; last: string };

export default async function InvoicingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; error?: string }> }) {
  const [params, { supabase, workspace, member, installedApps }] = await Promise.all([searchParams, requireApp("finance")]);
  const admin = member.role !== "member";
  const now = today(workspace.timezone);
  const from = params.from && isDay(params.from) ? params.from : `${now.slice(0, 7)}-01`;
  const to = params.to && isDay(params.to) && params.to >= from ? params.to : now;
  const here = `/finance/invoicing?${new URLSearchParams({ from, to })}`;

  const [billables, payers, finance, contacts, profiles] = await Promise.all([
    supabase
      .from("billables")
      .select("contact_id, amount_cents, service_date, contact:contacts(first_name, last_name, email)")
      .eq("workspace_id", workspace.id)
      .eq("status", "unbilled")
      .gte("service_date", from)
      .lte("service_date", to),
    supabase.from("client_payers").select("contact_id").eq("workspace_id", workspace.id).eq("payer", "ndia"),
    supabase.from("client_finance").select("contact_id, plan_manager_id").eq("workspace_id", workspace.id),
    supabase.from("contacts").select("id, first_name, last_name, email").eq("workspace_id", workspace.id),
    supabase.from("client_profiles").select("contact_id, plan_management").eq("workspace_id", workspace.id),
  ]);
  if (billables.error) throw billables.error;
  if (payers.error) throw payers.error;
  if (finance.error) throw finance.error;
  if (contacts.error) throw contacts.error;
  if (profiles.error) throw profiles.error;
  const billedTo = new Map(finance.data.map((row) => [row.contact_id, row.plan_manager_id]));
  const names = new Map(contacts.data.map((c) => [c.id, personName(c)]));
  const planManaged = new Set(profiles.data.filter((p) => p.plan_management === "plan_managed").map((p) => p.contact_id));

  const ndia = new Set(payers.data.map((p) => p.contact_id));
  const ready = new Map<string, Ready>();
  for (const b of billables.data) {
    if (ndia.has(b.contact_id)) continue;
    const managerId = billedTo.get(b.contact_id);
    const row = ready.get(b.contact_id) ?? {
      contactId: b.contact_id,
      name: b.contact ? personName(b.contact) : "Client",
      billTo: managerId ? (names.get(managerId) ?? "Plan manager") : null,
      planManaged: planManaged.has(b.contact_id),
      lines: 0,
      cents: 0,
      first: b.service_date,
      last: b.service_date,
    };
    row.lines += 1;
    row.cents += b.amount_cents ?? 0;
    if (b.service_date < row.first) row.first = b.service_date;
    if (b.service_date > row.last) row.last = b.service_date;
    ready.set(b.contact_id, row);
  }
  const rows = [...ready.values()].sort((a, b) => a.name.localeCompare(b.name));
  const total = rows.reduce((sum, r) => sum + r.cents, 0);
  const canInvoice = admin && installedApps.has("payments");

  return (
    <div className="w-full max-w-[920px] space-y-5 px-9 py-6">
      <InvoicingTabs active="draft" />
      <div>
        <p className="text-[13px] text-ink-3">
          One invoice per client for everything ready in the period. NDIA-managed participants are left out; claim them under{" "}
          <Link href="/finance/claims" className={textLinkClass}>
            NDIS claims
          </Link>
          .
        </p>
      </div>
      {params.error ? <Alert>{params.error}</Alert> : null}
      {installedApps.has("payments") ? null : <Alert>Add the Payments app to send invoices.</Alert>}

      <form className="flex items-end gap-3" action="/finance/invoicing">
        <Field label="Supports from">
          <Input type="date" name="from" defaultValue={from} className="w-40" />
        </Field>
        <Field label="To">
          <Input type="date" name="to" defaultValue={to} className="w-40" />
        </Field>
        <Button type="submit" className="h-9">
          Preview
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText size={18} />}
          title="Nothing ready to invoice"
          body={`No completed supports for privately funded or plan-managed clients between ${formatDay(from)} and ${formatDay(to)}.`}
        />
      ) : (
        <form action={generateInvoices}>
          <input type="hidden" name="return" value={here} />
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="to" value={to} />
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[28px_1fr_160px_80px_120px] gap-3 border-b border-line px-4 py-2 text-[12px] font-medium text-ink-3">
              <span />
              <span>Client</span>
              <span>Supports delivered</span>
              <span className="text-right">Lines</span>
              <span className="text-right">Amount</span>
            </div>
            {rows.map((r) => (
              <label key={r.contactId} className="grid grid-cols-[28px_1fr_160px_80px_120px] items-center gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-0 hover:bg-hover">
                <input type="checkbox" name="client" value={r.contactId} defaultChecked disabled={!canInvoice} className="size-4 accent-[var(--color-accent)]" />
                <span>
                  <span className="font-medium">{r.name}</span>
                  {r.billTo ? (
                    <span className="mt-0.5 block text-[12px] text-ink-3">Addressed to {r.billTo}</span>
                  ) : r.planManaged ? (
                    <span className="mt-0.5 block text-[12px] text-warning">No plan manager — invoice goes to {r.name}</span>
                  ) : null}
                </span>
                <span className="text-ink-3">
                  {formatDay(r.first)}
                  {r.first === r.last ? "" : ` – ${formatDay(r.last)}`}
                </span>
                <span className="text-right tabular-nums">{r.lines}</span>
                <span className="text-right tabular-nums">{formatMoney(r.cents, workspace.currency)}</span>
              </label>
            ))}
            <div className="flex items-center justify-between bg-surface px-4 py-2.5 text-[13px] font-medium">
              <span>
                {rows.length} {rows.length === 1 ? "client" : "clients"}
              </span>
              <span className="tabular-nums">{formatMoney(total, workspace.currency)}</span>
            </div>
          </Card>
          {canInvoice ? (
            <div className="mt-4 flex items-end gap-3">
              <Field label="Due date">
                <Input type="date" name="due" required defaultValue={addDays(now, 14)} className="w-40" />
              </Field>
              <Button type="submit" variant="primary" className="h-9">
                Create and send invoices
              </Button>
              <span className="pb-2 text-[12px] text-ink-3">Invoices go to the plan manager when one is set; otherwise to the participant.</span>
            </div>
          ) : admin ? null : (
            <p className="mt-3 text-[13px] text-ink-3">Only owners and admins can create invoices.</p>
          )}
        </form>
      )}
    </div>
  );
}
