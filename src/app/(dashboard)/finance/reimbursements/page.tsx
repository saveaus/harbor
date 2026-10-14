import { Plus, Wallet } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Alert, Badge, Cell, EmptyState, Field, Input, Row, Select, Table } from "@/components/ui";
import { BILLABLE_STATUS, GST, UNITS, formatQuantity } from "@/lib/finance";
import { formatDay, formatMoney, personName } from "@/lib/format";
import { today } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { addBillable } from "../actions";

export default async function ReimbursementsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, { supabase, workspace, member }] = await Promise.all([searchParams, requireApp("finance")]);
  const admin = member.role !== "member";
  const [rows, clients] = await Promise.all([
    supabase
      .from("billables")
      .select("id, description, service_date, quantity, unit, amount_cents, status, contact:contacts(first_name, last_name, email)")
      .eq("workspace_id", workspace.id)
      .eq("kind", "expense")
      .neq("status", "void")
      .order("service_date", { ascending: false })
      .limit(200),
    supabase.from("contacts").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).order("first_name"),
  ]);
  if (rows.error) throw rows.error;
  if (clients.error) throw clients.error;

  const add = admin ? (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> Add reimbursement
        </>
      }
      title="Reimbursement"
      description="An expense paid on behalf of a client. It's ready to invoice or claim straight away."
      action={addBillable}
      submitLabel="Add reimbursement"
    >
      <input type="hidden" name="return" value="/finance/reimbursements" />
      <input type="hidden" name="kind" value="expense" />
      <Field label="Client">
        <Select name="client" required>
          <option value="">Choose client</option>
          {clients.data.map((c) => (
            <option key={c.id} value={c.id}>
              {personName(c)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description">
        <Input name="description" required maxLength={300} placeholder="Art class fees" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input name="date" type="date" required defaultValue={today(workspace.timezone)} />
        </Field>
        <Field label="Support item number">
          <Input name="support_number" maxLength={50} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Quantity">
          <Input name="quantity" type="number" min={0.01} step="0.01" required defaultValue={1} />
        </Field>
        <Field label="Unit">
          <Select name="unit" defaultValue="each">
            {Object.entries(UNITS).map(([value, u]) => (
              <option key={value} value={value}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount">
          <Input name="price" type="number" min={0} step="0.01" required />
        </Field>
      </div>
      <Field label="GST">
        <Select name="gst" defaultValue="P2">
          {Object.entries(GST).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
    </FormDialog>
  ) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-9 pt-5 pb-3">
        <div>
          <h1 className="text-[16px] font-medium">Reimbursements</h1>
          <p className="mt-1 text-[13px] text-ink-3">Client expenses paid by the organisation. They invoice and claim with other billables.</p>
        </div>
        {add}
      </div>
      {params.error ? (
        <div className="px-9 pb-3">
          <Alert>{params.error}</Alert>
        </div>
      ) : null}
      {rows.data.length === 0 ? (
        <EmptyState icon={<Wallet size={18} />} title="No reimbursements" body="Add an expense when you pay something on a client's behalf." action={add ?? undefined} />
      ) : (
        <Table columns={["Date", "Client", "Description", "Quantity", "Amount", "Status"]}>
          {rows.data.map((b) => (
            <Row key={b.id} href="/finance/billables">
              <Cell>{formatDay(b.service_date)}</Cell>
              <Cell>{b.contact ? personName(b.contact) : "Client"}</Cell>
              <Cell>
                <span className="block max-w-80 truncate">{b.description}</span>
              </Cell>
              <Cell className="tabular-nums">{formatQuantity(Number(b.quantity), b.unit)}</Cell>
              <Cell className="tabular-nums">{formatMoney(b.amount_cents ?? 0, workspace.currency)}</Cell>
              <Cell>
                <Badge tone={BILLABLE_STATUS[b.status].tone}>{BILLABLE_STATUS[b.status].label}</Badge>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}
