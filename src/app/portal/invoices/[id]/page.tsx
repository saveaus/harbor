import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InvoiceLines } from "@/components/invoice-lines";
import { Alert, Badge, Button } from "@/components/ui";
import { settleReturnedSession } from "@/lib/checkout";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceStatus, invoiceTotal } from "@/lib/payments";
import { requirePortalApp } from "@/lib/portal";
import { payInvoice } from "../../actions";

export default async function PortalInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; session_id?: string }>;
}) {
  const [{ id }, { error: notice, session_id: sessionId }, { supabase, workspace }] = await Promise.all([
    params,
    searchParams,
    requirePortalApp("payments"),
  ]);
  const returned = sessionId ? await settleReturnedSession(workspace.id, sessionId) : null;
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, number, status, currency, due_date, created_at, paid_at, memo, invoice_items(id, description, quantity, unit_amount_cents)").eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!invoice) notFound();

  const status = invoiceStatus[invoice.status];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <Link href="/portal/invoices" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Invoices
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight">
              {invoiceNumber(invoice.number)} <Badge tone={status.tone}>{status.label}</Badge>
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-3">
              From {workspace.name} · Issued {formatDate(invoice.created_at)}
              {invoice.paid_at ? ` · Paid ${formatDate(invoice.paid_at)}` : ""}
            </p>
          </div>
          {invoice.status === "open" ? (
            <form action={payInvoice.bind(null, invoice.id)}>
              <Button type="submit" variant="primary">
                Pay {formatMoney(invoiceTotal(invoice.invoice_items), invoice.currency)}
              </Button>
            </form>
          ) : null}
        </div>

        {returned === "paid" ? (
          <div className="mt-4">
            <Alert tone="success">Thanks, your payment went through.</Alert>
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4">
            <Alert>{notice}</Alert>
          </div>
        ) : null}

        <div className="mt-6">
          <InvoiceLines items={invoice.invoice_items} currency={invoice.currency} />
        </div>

        <dl className="mt-6 grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
          <dt className="text-ink-3">Due</dt>
          <dd>{invoice.due_date ? formatDate(invoice.due_date) : "On receipt"}</dd>
          {invoice.memo ? (
            <>
              <dt className="text-ink-3">Memo</dt>
              <dd className="whitespace-pre-wrap">{invoice.memo}</dd>
            </>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
