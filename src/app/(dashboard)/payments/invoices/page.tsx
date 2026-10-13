import { Plus } from "lucide-react";
import { Badge, ButtonLink, Cell, Row, Table } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceStatus, invoiceTotal, recipientName } from "@/lib/payments";
import { requireApp } from "@/lib/workspace";
import { DocumentPreview, PaymentsHero } from "../hero";

export default async function InvoicesPage() {
  const { supabase, workspace } = await requireApp("payments");
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, number, status, currency, due_date, created_at, company:companies(name), contact:contacts(first_name, last_name, email), invoice_items(quantity, unit_amount_cents)",
    )
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  if (data.length === 0)
    return (
      <PaymentsHero
        title="Send invoices and get paid online"
        body="Bill a client with an itemised, branded invoice they can pay by card or bank transfer."
        action={
          <ButtonLink href="/payments/invoices/new" variant="primary">
            <Plus /> Create invoice
          </ButtonLink>
        }
        preview={<DocumentPreview heading="New invoice" />}
      />
    );

  return (
    <div className="pt-2">
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
    </div>
  );
}
