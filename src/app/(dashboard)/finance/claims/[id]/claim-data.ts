import { claimProblems, type BillableStatus, type BillingUnit, type ClaimLine } from "@/lib/finance";
import { personName } from "@/lib/format";
import type { WorkspaceContext } from "@/lib/workspace";

export type ClaimEntry = ClaimLine & {
  participant: string;
  description: string;
  unit: BillingUnit;
  amount_cents: number;
  status: BillableStatus;
};

const ENTRY = "id, contact_id, service_date, support_number, description, quantity, unit, unit_price_cents, amount_cents, gst_code, claim_type, cancellation_reason, status, contact:contacts(first_name, last_name, email)";

/** A claim with its lines, excluded lines and what would block a PRODA export. */
export async function loadClaim({ supabase, workspace }: WorkspaceContext, claimId: string) {
  const [claim, lines, exclusions, settings] = await Promise.all([
    supabase
      .from("claims")
      .select("id, number, period_start, period_end, payment_status, exported_at, export_count")
      .eq("workspace_id", workspace.id)
      .eq("id", claimId)
      .maybeSingle(),
    supabase.from("billables").select(ENTRY).eq("workspace_id", workspace.id).eq("claim_id", claimId).order("service_date").order("created_at"),
    supabase.from("claim_exclusions").select(`billable:billables(${ENTRY})`).eq("workspace_id", workspace.id).eq("claim_id", claimId),
    supabase.from("finance_settings").select("abn, ndis_registration_number").eq("workspace_id", workspace.id).maybeSingle(),
  ]);
  if (claim.error) throw claim.error;
  if (lines.error) throw lines.error;
  if (exclusions.error) throw exclusions.error;
  if (settings.error) throw settings.error;
  if (!claim.data) return null;

  const excludedRows = exclusions.data.flatMap((x) => (x.billable && x.billable.status === "unbilled" ? [x.billable] : []));
  const contactIds = [...new Set([...lines.data, ...excludedRows].map((b) => b.contact_id))];
  const payers = contactIds.length
    ? await supabase.from("client_payers").select("contact_id, ndis_number").eq("workspace_id", workspace.id).in("contact_id", contactIds)
    : { data: [], error: null };
  if (payers.error) throw payers.error;
  const ndisNumber = new Map(payers.data.map((p) => [p.contact_id, p.ndis_number || null]));

  const entry = (b: (typeof lines.data)[number]): ClaimEntry => ({
    id: b.id,
    ndis_number: ndisNumber.get(b.contact_id) ?? null,
    service_date: b.service_date,
    support_number: b.support_number,
    quantity: Number(b.quantity),
    unit_price_cents: b.unit_price_cents,
    gst_code: b.gst_code,
    claim_type: b.claim_type,
    cancellation_reason: b.cancellation_reason,
    participant: b.contact ? personName(b.contact) : "Participant",
    description: b.description,
    unit: b.unit,
    amount_cents: b.amount_cents ?? 0,
    status: b.status,
  });
  const entries = lines.data.map(entry);
  return {
    claim: claim.data,
    entries,
    excluded: excludedRows.map(entry),
    provider: settings.data,
    problems: claimProblems(settings.data, entries),
  };
}
