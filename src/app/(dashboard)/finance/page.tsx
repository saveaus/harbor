import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import type { ReactNode } from "react";
import { Card, textLinkClass } from "@/components/ui";
import type { BillableStatus } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { addDays, today } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";

const OPEN: BillableStatus[] = ["pending", "unbilled", "invoiced", "claimed", "exported"];

export default async function FinanceOverview() {
  const { supabase, workspace, installedApps } = await requireApp("finance");
  const since = addDays(today(workspace.timezone), -30);

  const [open, paid, payers, items, settings] = await Promise.all([
    supabase.from("billables").select("status, amount_cents, contact_id").eq("workspace_id", workspace.id).in("status", OPEN),
    supabase.from("billables").select("amount_cents").eq("workspace_id", workspace.id).eq("status", "paid").gte("service_date", since),
    supabase.from("client_payers").select("contact_id, payer").eq("workspace_id", workspace.id).eq("payer", "ndia"),
    supabase.from("price_book_items").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("archived", false),
    supabase.from("finance_settings").select("abn, ndis_registration_number, travel_item_id").eq("workspace_id", workspace.id).maybeSingle(),
  ]);
  if (open.error) throw open.error;
  if (paid.error) throw paid.error;
  if (payers.error) throw payers.error;
  if (items.error) throw items.error;
  if (settings.error) throw settings.error;

  const ndia = new Set(payers.data.map((p) => p.contact_id));
  const sum = (filter: (b: { status: BillableStatus; contact_id: string }) => boolean) =>
    open.data.filter(filter).reduce((total, b) => total + (b.amount_cents ?? 0), 0);
  const money = (cents: number) => formatMoney(cents, workspace.currency);

  const setup = [
    { done: (items.count ?? 0) > 0, label: "Add your support items and rates to the price book", href: "/finance/price-book" },
    { done: Boolean(settings.data?.abn && settings.data.ndis_registration_number), label: "Add your ABN and NDIS registration number", href: "/finance/settings" },
    { done: Boolean(settings.data?.travel_item_id), label: "Choose a travel item so kilometres are billed", href: "/finance/settings" },
    { done: installedApps.has("scheduling"), label: "Add Scheduling so completed shifts become billables", href: "/apps" },
    { done: installedApps.has("payments"), label: "Add Payments to invoice private and plan-managed clients", href: "/apps" },
  ];

  return (
    <div className="w-full max-w-[920px] space-y-6 px-9 py-6">
      <div>
        <h1 className="text-[16px] font-medium">Overview</h1>
        <p className="mt-1 text-[13px] text-ink-3">What is waiting to be invoiced, claimed, or paid.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Pending" value={money(sum((b) => b.status === "pending"))} note="Published shifts not yet completed" href="/finance/billables?status=pending" />
        <Stat
          label="Ready to invoice"
          value={money(sum((b) => b.status === "unbilled" && !ndia.has(b.contact_id)))}
          note="Private and plan-managed"
          href="/finance/invoicing"
        />
        <Stat
          label="Ready to claim"
          value={money(sum((b) => b.status === "unbilled" && ndia.has(b.contact_id)))}
          note="NDIA-managed participants"
          href="/finance/claims"
        />
        <Stat label="Invoiced, unpaid" value={money(sum((b) => b.status === "invoiced"))} note="Open invoices in Payments" href="/finance/billables?status=invoiced" />
        <Stat
          label="Claimed, unpaid"
          value={money(sum((b) => b.status === "claimed" || b.status === "exported"))}
          note="In a claim awaiting payment"
          href="/finance/claims"
        />
        <Stat label="Paid" value={money(paid.data.reduce((t, b) => t + (b.amount_cents ?? 0), 0))} note="Supports delivered in the last 30 days" href="/finance/billables?status=paid" />
      </div>

      <Card className="p-5">
        <h2 className="text-[14px] font-medium">How money flows</h2>
        <p className="mt-1 text-[13px] text-ink-3">Every charge starts on the roster, so pay, invoices and claims always agree with the hours worked.</p>
        <ol className="mt-4 grid grid-cols-4 gap-3 text-[13px]">
          <Step n={1} title="Publish a shift">Each client gets a pending charge from their support item and share.</Step>
          <Step n={2} title="Complete it">Charges become ready, priced on the timesheet&apos;s actual hours plus travel.</Step>
          <Step n={3} title="Invoice or claim">Private and plan-managed clients are invoiced; NDIA-managed are claimed through PRODA.</Step>
          <Step n={4} title="Get paid">Paying an invoice or claim marks its charges paid. Voiding one releases them again.</Step>
        </ol>
      </Card>

      {setup.some((s) => !s.done) ? (
        <Card className="p-5">
          <h2 className="text-[14px] font-medium">Set up Finance</h2>
          <ul className="mt-3 space-y-2">
            {setup.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-[13px]">
                {s.done ? <CheckCircle2 size={15} className="text-success" /> : <Circle size={15} className="text-ink-4" />}
                {s.done ? (
                  <span className="text-ink-3 line-through">{s.label}</span>
                ) : (
                  <Link href={s.href} className={textLinkClass}>
                    {s.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value, note, href }: { label: string; value: string; note: string; href: string }) {
  return (
    <Link href={href} className="group block">
      <Card className="p-5 transition-colors group-hover:bg-hover">
        <div className="flex items-center justify-between text-[13px] font-medium">
          {label} <ArrowRight size={13} className="text-ink-4 group-hover:text-ink" />
        </div>
        <div className="mt-1 text-[20px] font-medium tabular-nums">{value}</div>
        <div className="mt-1 text-[12px] text-ink-3">{note}</div>
      </Card>
    </Link>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="rounded-card border border-line-strong p-3">
      <span className="flex size-6 items-center justify-center rounded-full bg-info-soft text-[12px] font-medium text-link">{n}</span>
      <div className="mt-2 font-medium">{title}</div>
      <p className="mt-1 text-ink-3">{children}</p>
    </li>
  );
}
