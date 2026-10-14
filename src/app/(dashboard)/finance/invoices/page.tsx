import { FileText } from "lucide-react";
import { Badge, ButtonLink, Cell, EmptyState, Row, Table } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceStatus, invoiceTotal, recipientName } from "@/lib/payments";
import { requireApp } from "@/lib/workspace";
import { InvoicingTabs } from "../finance-nav";

export default async function FinanceInvoicesPage() {
  const { supabase, workspace, installedApps } = await requireApp("finance");

  return (
    <div className="space-y-4 py-5">
      <div className="px-9">
        <InvoicingTabs active="invoices" />
      </div>
      {installedApps.has("payments") ? <InvoiceList supabase={supabase} workspaceId={workspace.id} /> : (
        <EmptyState
          icon={<FileText size={18} />}
          title="Invoices are sent from Payments"
          body="Add the Payments app to create and send invoices. Bulk draft stays here for supports that are ready to bill."
          action={<ButtonLink href="/apps">Add Payments</ButtonLink>}
        />
      )}
    </div>
  );
}

async function InvoiceList({
  supabase,
  workspaceId,
}: {
  supabase: Awaited<ReturnType<typeof requireApp>>["supabase"];
  workspaceId: string;
}) {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, number, status, currency, due_date, created_at, company:companies(name), contact:contacts(first_name, last_name, email), invoice_items(quantity, unit_amount_cents)",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={18} />}
        title="No invoices yet"
        body="Invoices you send from Payments show up here. Use Bulk draft to invoice completed supports."
        action={<ButtonLink href="/finance/invoicing">Open bulk draft</ButtonLink>}
      />
    );
  }
  return (
    <Table columns={["Invoice", "Recipient", "Amount", "Status", "Due", "Created"]}>
      {data.map((invoice) => {
        const status = invoiceStatus[invoice.status];
        return (
          <Row key={invoice.id} href={`/payments/invoices/${invoice.id}`}>
            <Cell>{invoiceNumber(invoice.number)}</Cell>
            <Cell>{recipientName(invoice)}</Cell>
            <Cell className="tabular-nums">{formatMoney(invoiceTotal(invoice.invoice_items), invoice.currency)}</Cell>
            <Cell>
              <Badge tone={status.tone}>{status.label}</Badge>
            </Cell>
            <Cell>{formatDate(invoice.due_date)}</Cell>
            <Cell>{formatDate(invoice.created_at)}</Cell>
          </Row>
        );
      })}
    </Table>
  );
}
