import { Landmark, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Alert, Badge, Cell, EmptyState, Field, Input, Row, Table } from "@/components/ui";
import { claimLabel } from "@/lib/finance";
import { formatDate, formatDay, formatMoney } from "@/lib/format";
import { today } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { createClaim } from "../actions";

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error: notice }, { supabase, workspace, member }] = await Promise.all([searchParams, requireApp("finance")]);
  const admin = member.role !== "member";
  const now = today(workspace.timezone);

  const [claims, ready, payers] = await Promise.all([
    supabase
      .from("claims")
      .select("id, number, period_start, period_end, payment_status, exported_at, export_count, created_at, billables(amount_cents)")
      .eq("workspace_id", workspace.id)
      .order("number", { ascending: false }),
    supabase.from("billables").select("contact_id, amount_cents").eq("workspace_id", workspace.id).eq("status", "unbilled"),
    supabase.from("client_payers").select("contact_id").eq("workspace_id", workspace.id).eq("payer", "ndia"),
  ]);
  if (claims.error) throw claims.error;
  if (ready.error) throw ready.error;
  if (payers.error) throw payers.error;
  const ndia = new Set(payers.data.map((p) => p.contact_id));
  const claimable = ready.data.filter((b) => ndia.has(b.contact_id));
  const claimableCents = claimable.reduce((sum, b) => sum + (b.amount_cents ?? 0), 0);

  const newClaim = admin ? (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New claim
        </>
      }
      title="New NDIS claim"
      description="Collects every completed support for NDIA-managed participants in the period that isn't already invoiced or claimed."
      action={createClaim}
      submitLabel="Create claim"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Supports from">
          <Input type="date" name="from" required defaultValue={`${now.slice(0, 7)}-01`} />
        </Field>
        <Field label="To">
          <Input type="date" name="to" required defaultValue={now} />
        </Field>
      </div>
    </FormDialog>
  ) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-9 pt-5 pb-3">
        <div>
          <h1 className="text-[16px] font-medium">NDIS claims</h1>
          <p className="mt-1 text-[13px] text-ink-3">
          {formatMoney(claimableCents, workspace.currency)} ready to claim across {claimable.length} {claimable.length === 1 ? "line" : "lines"}. Claims
          export as a PRODA bulk upload file.
          </p>
        </div>
        {newClaim}
      </div>
      {notice ? (
        <div className="px-9 pb-3">
          <Alert>{notice}</Alert>
        </div>
      ) : null}
      {claims.data.length === 0 ? (
        <EmptyState
          icon={<Landmark size={18} />}
          title="No claims yet"
          body="Create a claim for a period to bundle completed supports for NDIA-managed participants into a PRODA upload."
          action={newClaim ?? undefined}
        />
      ) : (
        <Table columns={["Claim", "Period", "Lines", "Amount", "Exported", "Payment"]}>
          {claims.data.map((c) => (
            <Row key={c.id} href={`/finance/claims/${c.id}`}>
              <Cell className="font-medium">{claimLabel(c.period_start, c.number)}</Cell>
              <Cell>
                {formatDay(c.period_start)} – {formatDay(c.period_end)}
              </Cell>
              <Cell className="tabular-nums">{c.billables.length}</Cell>
              <Cell className="tabular-nums">{formatMoney(c.billables.reduce((sum, b) => sum + (b.amount_cents ?? 0), 0), workspace.currency)}</Cell>
              <Cell>{c.exported_at ? `${formatDate(c.exported_at)}${c.export_count > 1 ? ` (${c.export_count}×)` : ""}` : <Badge>Not exported</Badge>}</Cell>
              <Cell>{c.payment_status === "paid" ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Unpaid</Badge>}</Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}
