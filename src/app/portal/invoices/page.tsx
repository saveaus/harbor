import { CreditCard } from "lucide-react";
import { Badge, Cell, EmptyState, PageHeader, Row, Table } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceStatus, invoiceTotal } from "@/lib/payments";
import { requirePortalApp } from "@/lib/portal";

export default async function PortalInvoicesPage() {
  const { supabase, workspace } = await requirePortalApp("payments");
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, number, status, currency, due_date, created_at, invoice_items(quantity, unit_amount_cents)").eq("workspace_id", workspace.id)
    .order("number", { ascending: false });
  if (error) throw error;

  return (
    <>
      <PageHeader title="Invoices" />
      <div className="flex-1 overflow-y-auto">
        {invoices.length === 0 ? (
          <EmptyState icon={<CreditCard size={18} />} title="No invoices" body="Invoices sent to you will appear here." />
        ) : (
          <Table columns={["Invoice", "Status", "Amount", "Due", "Issued"]}>
            {invoices.map((invoice) => {
              const status = invoiceStatus[invoice.status];
              return (
                <Row key={invoice.id} href={`/portal/invoices/${invoice.id}`}>
                  <Cell className="font-medium text-ink">{invoiceNumber(invoice.number)}</Cell>
                  <Cell>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Cell>
                  <Cell className="tabular-nums">{formatMoney(invoiceTotal(invoice.invoice_items), invoice.currency)}</Cell>
                  <Cell>{invoice.due_date ? formatDate(invoice.due_date) : "On receipt"}</Cell>
                  <Cell>{formatDate(invoice.created_at)}</Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
