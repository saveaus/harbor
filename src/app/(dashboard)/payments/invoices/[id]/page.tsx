import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InvoiceLines } from "@/components/invoice-lines";
import { Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { invoiceNumber, invoiceStatus, recipientName } from "@/lib/payments";
import { requireApp } from "@/lib/workspace";
import { setInvoiceStatus } from "../../actions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireApp("payments");
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, company:companies(name), contact:contacts(first_name, last_name, email), invoice_items(*)")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!invoice) notFound();

  const status = invoiceStatus[invoice.status];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <Link href="/payments/invoices" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ChevronLeft size={14} /> Invoices
      </Link>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight">
            {invoiceNumber(invoice.number)} <Badge tone={status.tone}>{status.label}</Badge>
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {recipientName(invoice)} · Created {formatDate(invoice.created_at)}
            {invoice.paid_at ? ` · Paid ${formatDate(invoice.paid_at)}` : ""}
          </p>
        </div>
        {invoice.status === "open" ? (
          <div className="flex gap-2">
            <form action={setInvoiceStatus.bind(null, invoice.id, "void")}>
              <Button type="submit" variant="danger">
                Void
              </Button>
            </form>
            <form action={setInvoiceStatus.bind(null, invoice.id, "paid")}>
              <Button type="submit" variant="primary">
                Record payment
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <InvoiceLines items={invoice.invoice_items} currency={invoice.currency} />
      </div>

      <dl className="mt-6 grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
        <dt className="text-ink-3">Due</dt>
        <dd>{invoice.due_date ? formatDate(invoice.due_date) : "On receipt"}</dd>
        <dt className="text-ink-3">Collection</dt>
        <dd>{invoice.collection === "charge_automatically" ? "Charge saved payment method" : "Client pays from portal"}</dd>
        {invoice.memo ? (
          <>
            <dt className="text-ink-3">Memo</dt>
            <dd className="whitespace-pre-wrap">{invoice.memo}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
