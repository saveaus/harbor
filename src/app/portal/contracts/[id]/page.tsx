import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";
import { contractStatus } from "@/lib/contracts";
import { contactName, formatDate } from "@/lib/format";
import { requirePortalApp } from "@/lib/portal";
import { signPortalContract } from "../../actions";

export default async function PortalContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error: notice }, { supabase, workspace, contact }] = await Promise.all([params, searchParams, requirePortalApp("contracts")]);
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, name, body, status, sent_at, signed_at, signed_name").eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!contract) notFound();

  const status = contractStatus[contract.status];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <Link href="/portal/contracts" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Contracts
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-[20px] font-semibold tracking-tight">
          {contract.name} <Badge tone={status.tone}>{status.label}</Badge>
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Sent {formatDate(contract.sent_at)}
          {contract.signed_at ? ` · Signed by ${contract.signed_name} on ${formatDate(contract.signed_at)}` : ""}
        </p>

        <Card className="mt-6 p-6">
          <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{contract.body || "This contract has no body text."}</div>
        </Card>

        {contract.status === "awaiting_signature" ? (
          <form action={signPortalContract.bind(null, contract.id)} className="mt-6 space-y-4">
            {notice ? <Alert>{notice}</Alert> : null}
            <Field label="Type your full name to sign">
              <Input name="name" required minLength={2} maxLength={120} defaultValue={contactName(contact)} />
            </Field>
            <label className="flex items-start gap-2 text-[13px] text-ink-2">
              <input type="checkbox" name="agree" required className="mt-0.5 size-4 accent-[var(--color-accent)]" />
              I have read this agreement and agree to its terms. Typing my name counts as my signature.
            </label>
            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Sign contract
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
