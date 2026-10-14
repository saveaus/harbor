import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Link2, Repeat, Store } from "lucide-react";
import type { ReactNode } from "react";
import { Menu } from "@/components/menu";
import { Card, buttonClass } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { invoiceTotal } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";
import { requireApp } from "@/lib/workspace";

const RANGES = {
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
  "365d": { label: "Last 12 months", days: 365 },
  all: { label: "All time", days: null },
} as const;

type RangeKey = keyof typeof RANGES;

function parseRange(value: string | undefined): RangeKey {
  return Object.keys(RANGES).find((key): key is RangeKey => key === value) ?? "30d";
}

function rangeStart(days: number | null): string | null {
  return days === null ? null : new Date(Date.now() - days * 86_400_000).toISOString();
}

export default async function PaymentsOverview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const rangeKey = parseRange((await searchParams).range);
  const range = RANGES[rangeKey];
  const { supabase, workspace } = await requireApp("payments");
  const since = rangeStart(range.days);

  let invoicesQuery = supabase
    .from("invoices")
    .select("status, created_at, paid_at, invoice_items(quantity, unit_amount_cents)")
    .eq("workspace_id", workspace.id)
    .eq("currency", workspace.currency)
    .in("status", ["open", "paid"]);
  let ordersQuery = supabase
    .from("orders")
    .select("amount_cents, paid_at")
    .eq("workspace_id", workspace.id)
    .eq("currency", workspace.currency)
    .eq("status", "paid");
  if (since) {
    invoicesQuery = invoicesQuery.or(`created_at.gte.${since},paid_at.gte.${since}`);
    ordersQuery = ordersQuery.gte("paid_at", since);
  }
  const [invoices, orders, payout] = await Promise.all([
    invoicesQuery,
    ordersQuery,
    supabase.from("payout_accounts").select("stripe_account_id, charges_enabled").eq("workspace_id", workspace.id).maybeSingle(),
  ]);
  if (invoices.error) throw invoices.error;
  if (orders.error) throw orders.error;
  if (payout.error) throw payout.error;

  const inRange = (value: string | null) => value !== null && (since === null || value >= since);
  const notPaid = invoices.data
    .filter((i) => i.status === "open" && inRange(i.created_at))
    .reduce((sum, i) => sum + invoiceTotal(i.invoice_items), 0);
  const paid =
    invoices.data.filter((i) => i.status === "paid" && inRange(i.paid_at)).reduce((sum, i) => sum + invoiceTotal(i.invoice_items), 0) +
    orders.data.reduce((sum, o) => sum + o.amount_cents, 0);

  const balance = await stripeBalance(payout.data?.stripe_account_id ?? null, workspace.currency);

  return (
    <div className="w-full max-w-[920px] space-y-6 px-11 py-6">
      <Menu
        label="Date range"
        align="start"
        triggerClassName={buttonClass("secondary", "h-8 gap-2 px-3 font-normal")}
        trigger={
          <>
            <CalendarDays className="size-3.5!" /> {range.label}
          </>
        }
        items={Object.entries(RANGES).map(([key, { label }]) => ({ label, href: key === "30d" ? "/payments" : `/payments?range=${key}` }))}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Not paid" value={formatMoney(notPaid, workspace.currency)} />
        <StatCard label="Paid" value={formatMoney(paid, workspace.currency)} />
      </div>

      <Card className="p-5">
        <div className="text-[13px] font-medium">Total balance</div>
        <div className="mt-1 text-[20px] font-medium">{formatMoney(balance ?? 0, workspace.currency)}</div>
        {payout.data?.charges_enabled ? (
          <p className="mt-3 text-[13px] text-ink-3">Available and pending funds in your connected account.</p>
        ) : (
          <Link href="/settings/payout-account" className="mt-3 inline-flex items-center gap-1 text-[13px] text-link hover:text-ink">
            Connect bank <ArrowRight size={13} />
          </Link>
        )}
      </Card>

      <TileSection title="Bill specific clients" description="Send a client or company an invoice, or put them on a recurring plan.">
        <Tile icon={<FileText size={16} />} title="Invoice for one-off work" href="/payments/invoices/new" cta="New invoice" />
        <Tile icon={<Repeat size={16} />} title="Recurring billing for ongoing work" href="/payments/subscriptions" cta="New subscription" />
      </TileSection>

      <TileSection title="Sell to anyone" description="Offer packaged services in a store, or share a checkout link wherever you like.">
        <Tile icon={<Store size={16} />} title="A storefront for your services" href="/payments/store" cta="Set up store" />
        <Tile icon={<Link2 size={16} />} title="Links that take payment" href="/payments/links" cta="New payment link" />
      </TileSection>

      <TileSection title="Accounting software" description="Send paid invoices to your books automatically.">
        <div className="col-span-2 flex flex-wrap gap-2">
          <button type="button" disabled className={buttonClass("secondary")} title="Not available yet">
            Connect QuickBooks
          </button>
          <button type="button" disabled className={buttonClass("secondary")} title="Not available yet">
            Connect Xero
          </button>
          <span className="self-center text-[12px] text-ink-3">Accounting sync isn&apos;t available yet.</span>
        </div>
      </TileSection>
    </div>
  );
}

async function stripeBalance(accountId: string | null, currency: string): Promise<number | null> {
  const stripe = getStripe();
  if (!stripe || !accountId) return null;
  const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });
  return [...balance.available, ...balance.pending].filter((b) => b.currency === currency).reduce((sum, b) => sum + b.amount, 0);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="text-[13px] font-medium">{label}</div>
      <div className="mt-1 text-[20px] font-medium">{value}</div>
    </Card>
  );
}

function TileSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-[14px] font-medium">{title}</h2>
      <p className="mt-1 text-[13px] text-ink-3">{description}</p>
      <div className="mt-4 grid grid-cols-2 gap-4">{children}</div>
    </Card>
  );
}

function Tile({ icon, title, href, cta }: { icon: ReactNode; title: string; href: string; cta: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-card border border-line-strong p-3 transition-colors hover:bg-hover">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-line bg-surface">{icon}</span>
      <div className="min-w-0">
        <div className="truncate text-[13px]">{title}</div>
        <span className="inline-flex items-center gap-1 text-[13px] text-ink-3 group-hover:text-ink">
          {cta} <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
