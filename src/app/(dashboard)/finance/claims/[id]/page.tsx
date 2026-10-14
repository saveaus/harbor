import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, MinusCircle, PlusCircle, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { DownloadButton } from "@/components/download-button";
import { Alert, Badge, Button, Card, Cell, Row, Table, textLinkClass } from "@/components/ui";
import { BILLABLE_STATUS, CLAIM_TYPES, GST, claimLabel, formatQuantity } from "@/lib/finance";
import { formatDate, formatDay, formatMoney } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { claimStep, setClaimEntries } from "../../actions";
import { loadClaim, type ClaimEntry } from "./claim-data";

export default async function ClaimPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error: notice }, ctx] = await Promise.all([params, searchParams, requireApp("finance")]);
  const loaded = await loadClaim(ctx, id);
  if (!loaded) notFound();
  const { claim, entries, excluded, problems } = loaded;
  const admin = ctx.member.role !== "member";
  const currency = ctx.workspace.currency;
  const paid = claim.payment_status === "paid";
  const total = entries.reduce((sum, e) => sum + e.amount_cents, 0);
  const participants = new Set(entries.map((e) => e.participant)).size;

  return (
    <div className="w-full max-w-[1100px] space-y-5 px-9 py-6">
      <Link href="/finance/claims" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft size={13} /> NDIS claims
      </Link>
      {notice ? <Alert>{notice}</Alert> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-medium">{claimLabel(claim.period_start, claim.number)}</h1>
            {paid ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Unpaid</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            Supports {formatDay(claim.period_start)} – {formatDay(claim.period_end)} · {entries.length} lines · {participants}{" "}
            {participants === 1 ? "participant" : "participants"} · {formatMoney(total, currency)}
            {claim.exported_at ? ` · Exported ${formatDate(claim.exported_at)}${claim.export_count > 1 ? ` (${claim.export_count}×)` : ""}` : ""}
          </p>
        </div>
        {admin ? (
          <div className="flex flex-wrap items-start gap-2">
            {paid ? null : <Step action={claimStep.bind(null, claim.id, "sync")} icon={<RefreshCw size={14} />} label="Add new supports" />}
            {paid ? null : (
              <DownloadButton
                href={`/finance/claims/${claim.id}/export`}
                label={claim.exported_at ? "Download again" : "Export for PRODA"}
                variant={claim.exported_at ? "secondary" : "primary"}
                disabled={problems.length > 0}
              />
            )}
            {claim.exported_at && !paid ? <Step action={claimStep.bind(null, claim.id, "paid")} icon={<CheckCircle2 size={14} />} label="Mark paid" /> : null}
            {paid ? <Step action={claimStep.bind(null, claim.id, "unpaid")} icon={<RotateCcw size={14} />} label="Mark unpaid" /> : null}
            {claim.exported_at ? null : <Step action={claimStep.bind(null, claim.id, "delete")} icon={<Trash2 size={14} />} label="Delete" variant="ghost" />}
          </div>
        ) : null}
      </div>

      {problems.length ? (
        <Card className="border-warning p-4">
          <h2 className="text-[13px] font-medium text-warning">Fix these before exporting</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-ink-3">
            Business details are in{" "}
            <Link href="/finance/settings" className={textLinkClass}>
              Finance settings
            </Link>
            ; NDIS numbers and plan management are on each client&apos;s profile.
          </p>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <h2 className="text-[13px] font-medium">Included</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">Each line becomes one row of the bulk upload, referenced by its billable id.</p>
          </div>
          {admin && !paid && entries.length ? (
            <form id="exclude" action={setClaimEntries.bind(null, claim.id, false)}>
              <Button type="submit">
                <MinusCircle size={14} /> Exclude selected
              </Button>
            </form>
          ) : null}
        </div>
        <EntryTable entries={entries} currency={currency} selectable={admin && !paid} formId="exclude" />
      </Card>

      {excluded.length ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div>
              <h2 className="text-[13px] font-medium">Excluded</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">Kept out of this claim and left ready, so they can go in a later claim or be voided.</p>
            </div>
            {admin && !paid ? (
              <form id="include" action={setClaimEntries.bind(null, claim.id, true)}>
                <Button type="submit">
                  <PlusCircle size={14} /> Include selected
                </Button>
              </form>
            ) : null}
          </div>
          <EntryTable entries={excluded} currency={currency} selectable={admin && !paid} formId="include" />
        </Card>
      ) : null}
    </div>
  );
}

function EntryTable({ entries, currency, selectable, formId }: { entries: ClaimEntry[]; currency: string; selectable: boolean; formId: string }) {
  if (entries.length === 0) return <p className="px-5 pb-4 text-[13px] text-ink-3">No lines.</p>;
  return (
    <Table columns={[...(selectable ? [""] : []), "Date", "Participant", "Support item", "Quantity", "Price", "Amount", "Type", "Status"]}>
      {entries.map((e) => (
        <Row key={e.id}>
          {selectable ? (
            <Cell className="w-8">
              <input type="checkbox" name="billable" value={e.id} form={formId} aria-label="Select line" className="size-4 accent-[var(--color-accent)]" />
            </Cell>
          ) : null}
          <Cell>{formatDay(e.service_date)}</Cell>
          <Cell>
            {e.participant}
            <span className={e.ndis_number ? "block text-[12px] text-ink-3" : "block text-[12px] text-danger"}>{e.ndis_number ?? "No NDIS number"}</span>
          </Cell>
          <Cell>
            <span className={e.support_number ? "block" : "block text-danger"}>{e.support_number || "No item number"}</span>
            <span className="block max-w-64 truncate text-[12px] text-ink-3">{e.description}</span>
          </Cell>
          <Cell className="tabular-nums">{formatQuantity(e.quantity, e.unit)}</Cell>
          <Cell className="tabular-nums">
            {formatMoney(e.unit_price_cents, currency)}
            <span className="block text-[12px] text-ink-3">{GST[e.gst_code]}</span>
          </Cell>
          <Cell className="tabular-nums">{formatMoney(e.amount_cents, currency)}</Cell>
          <Cell className="text-ink-3">{e.claim_type ? CLAIM_TYPES[e.claim_type] : "Standard"}</Cell>
          <Cell>
            <Badge tone={BILLABLE_STATUS[e.status].tone}>{BILLABLE_STATUS[e.status].label}</Badge>
          </Cell>
        </Row>
      ))}
    </Table>
  );
}

function Step({ action, icon, label, variant = "secondary" }: { action: () => Promise<void>; icon: ReactNode; label: string; variant?: "secondary" | "ghost" }) {
  return (
    <form action={action}>
      <Button type="submit" variant={variant}>
        {icon} {label}
      </Button>
    </form>
  );
}
