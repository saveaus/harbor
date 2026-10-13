import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { contactName, formatDate } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { recordSignature } from "../actions";
import { contractStatus } from "@/lib/contracts";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireApp("contracts");
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*, contact:contacts(first_name, last_name, email)")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!contract) notFound();
  const status = contractStatus[contract.status];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <Link href="/contracts" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ChevronLeft size={14} /> Contracts
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-[20px] font-semibold tracking-tight">
        {contract.name} <Badge tone={status.tone}>{status.label}</Badge>
      </h1>
      <p className="mt-0.5 text-[13px] text-ink-3">
        Sent to {contract.contact ? contactName(contract.contact) : "—"} on {formatDate(contract.sent_at)}
        {contract.signed_at ? ` · Signed by ${contract.signed_name} on ${formatDate(contract.signed_at)}` : ""}
      </p>

      <Card className="mt-6 px-6 py-5">
        <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{contract.body || "This contract has no body text."}</div>
      </Card>

      {contract.status === "awaiting_signature" ? (
        <Card className="mt-6 p-5">
          <form action={recordSignature.bind(null, contract.id)} className="space-y-3">
            <div className="text-[13px] font-semibold">Record a signature</div>
            <p className="text-[12px] text-ink-3">
              Clients will sign from their portal. Until the portal launches, record a signature received another way.
            </p>
            <Field label="Signer's full name">
              <Input name="signed_name" required maxLength={120} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Mark as signed
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
