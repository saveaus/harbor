import { Ban, Plus, Receipt, RefreshCw } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { DownloadButton } from "@/components/download-button";
import { ActionCell, Alert, Badge, Button, Cell, EmptyState, Field, Input, Row, Select, Table } from "@/components/ui";
import { enumValue } from "@/lib/care";
import { BILLABLE_KIND, BILLABLE_STATUS, GST, UNITS, formatQuantity } from "@/lib/finance";
import { formatDay, formatMoney, personName } from "@/lib/format";
import { isDay, today } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { addBillable, convertPending, reconcileBillables, voidBillable } from "../actions";

const CONVERT_FORM = "convert-pending";

const PAGE = 200;

export default async function BillablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string; from?: string; to?: string; error?: string; notice?: string }>;
}) {
  const [params, { supabase, workspace, member, installedApps }] = await Promise.all([searchParams, requireApp("finance")]);
  const admin = member.role !== "member";
  const status = params.status ? enumValue(BILLABLE_STATUS, params.status) : null;
  const from = params.from && isDay(params.from) ? params.from : "";
  const to = params.to && isDay(params.to) ? params.to : "";
  const client = params.client ?? "";
  const here = `/finance/billables?${new URLSearchParams(Object.entries({ status: status ?? "", client, from, to }).filter(([, v]) => v))}`;

  let query = supabase
    .from("billables")
    .select(
      "id, kind, description, support_number, service_date, quantity, unit, amount_cents, status, void_reason, shift_id, invoice_id, claim_id, contact:contacts(first_name, last_name, email), shift:shifts(shift_staff(staff:staff(first_name, last_name, email)))",
    )
    .eq("workspace_id", workspace.id)
    .order("service_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(PAGE);
  query = status ? query.eq("status", status) : query.neq("status", "void");
  if (client) query = query.eq("contact_id", client);
  if (from) query = query.gte("service_date", from);
  if (to) query = query.lte("service_date", to);

  const [billables, clients] = await Promise.all([
    query,
    supabase.from("contacts").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).order("first_name"),
  ]);
  if (billables.error) throw billables.error;
  if (clients.error) throw clients.error;

  const link = (b: (typeof billables.data)[number]) =>
    b.invoice_id && installedApps.has("payments")
      ? `/payments/invoices/${b.invoice_id}`
      : b.claim_id
        ? `/finance/claims/${b.claim_id}`
        : b.shift_id && installedApps.has("scheduling")
          ? `/schedule/shifts/${b.shift_id}`
          : undefined;

  const addDialog = admin ? (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> Add charge
        </>
      }
      title="Add a charge"
      description="For expenses or supports delivered outside a shift. It's ready to invoice or claim straight away."
      action={addBillable}
      submitLabel="Add charge"
    >
      <input type="hidden" name="return" value={here} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client">
          <Select name="client" required defaultValue={client}>
            <option value="">Choose client</option>
            {clients.data.map((c) => (
              <option key={c.id} value={c.id}>
                {personName(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type">
          <Select name="kind" defaultValue="manual">
            <option value="manual">Support</option>
            <option value="expense">Expense</option>
          </Select>
        </Field>
      </div>
      <Field label="Description">
        <Input name="description" required maxLength={300} placeholder="Community access – art class fees" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date delivered">
          <Input name="date" type="date" required defaultValue={today(workspace.timezone)} />
        </Field>
        <Field label="Support item number" hint="Needed for NDIS claims">
          <Input name="support_number" maxLength={50} placeholder="04_590_0125_6_1" />
        </Field>
      </div>
      <div className="grid grid-cols-4 gap-3">
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
        <Field label="Unit price">
          <Input name="price" type="number" min={0} step="0.01" required placeholder="0.00" />
        </Field>
        <Field label="GST">
          <Select name="gst" defaultValue="P2">
            {Object.entries(GST).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </FormDialog>
  ) : null;

  return (
    <>
      <div className="px-9 pt-5">
        <h1 className="text-[16px] font-medium">Billable entries</h1>
      </div>
      <form className="flex flex-wrap items-end gap-3 px-9 pt-3 pb-3" action="/finance/billables">
        <Field label="Status">
          <Select name="status" defaultValue={status ?? ""} className="w-36">
            <option value="">All but void</option>
            {Object.entries(BILLABLE_STATUS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Client">
          <Select name="client" defaultValue={client} className="w-52">
            <option value="">All clients</option>
            {clients.data.map((c) => (
              <option key={c.id} value={c.id}>
                {personName(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From">
          <Input type="date" name="from" defaultValue={from} className="w-40" />
        </Field>
        <Field label="To">
          <Input type="date" name="to" defaultValue={to} className="w-40" />
        </Field>
        <Button type="submit" className="h-9">
          Filter
        </Button>
        <div className="ml-auto flex items-center gap-2 pb-1">
          <DownloadButton href={`/finance/billables/export?${new URLSearchParams(Object.entries({ status: status ?? "", client, from, to }).filter(([, v]) => v))}`} label="Export" />
          {admin ? (
            <form action={reconcileBillables}>
              <Button type="submit" variant="secondary">
                <RefreshCw size={14} /> Reconcile
              </Button>
            </form>
          ) : null}
          {addDialog}
        </div>
      </form>
      {params.error ? (
        <div className="px-9 pb-3">
          <Alert>{params.error}</Alert>
        </div>
      ) : null}
      {params.notice ? (
        <div className="px-9 pb-3">
          <Alert tone="success">{params.notice}</Alert>
        </div>
      ) : null}
      {admin && billables.data.some((b) => b.status === "pending") ? (
        <form id={CONVERT_FORM} className="flex items-center gap-2 px-9 pb-3">
          <input type="hidden" name="return" value={here} />
          <Button type="submit" variant="primary" formAction={convertPending}>
            Convert to billable
          </Button>
          <span className="text-[12px] text-ink-3">Turns selected pending charges (incomplete shifts) into ready charges. At most 20 at a time.</span>
        </form>
      ) : null}

      {billables.data.length === 0 ? (
        <EmptyState
          icon={<Receipt size={18} />}
          title="No billables"
          body="Charges appear here when shifts are published and become ready to bill when they're completed."
          action={addDialog ?? undefined}
        />
      ) : (
        <>
          <Table columns={[...(admin ? [""] : []), "Date", "Client", "Charge", "Employee", "Quantity", "Amount", "Status", ""]}>
            {billables.data.map((b) => (
              <Row key={b.id} href={link(b)}>
                {admin ? (
                  <ActionCell>
                    {b.status === "pending" ? (
                      <input type="checkbox" name="billable" value={b.id} form={CONVERT_FORM} aria-label="Select charge" className="size-4 accent-[var(--color-accent)]" />
                    ) : null}
                  </ActionCell>
                ) : null}
                <Cell>{formatDay(b.service_date)}</Cell>
                <Cell>{b.contact ? personName(b.contact) : "Client"}</Cell>
                <Cell>
                  <span className="block max-w-80 truncate">
                    <span className="text-ink-3">{BILLABLE_KIND[b.kind]} · </span>
                    {b.description}
                  </span>
                  {b.support_number ? <span className="block text-[12px] text-ink-3">{b.support_number}</span> : null}
                </Cell>
                <Cell className="text-ink-3">
                  {(b.shift?.shift_staff ?? []).map((s) => (s.staff ? personName(s.staff) : "Staff")).join(", ") || "—"}
                </Cell>
                <Cell className="tabular-nums">{formatQuantity(Number(b.quantity), b.unit)}</Cell>
                <Cell className="tabular-nums">{formatMoney(b.amount_cents ?? 0, workspace.currency)}</Cell>
                <Cell>
                  <span title={b.void_reason || undefined}>
                    <Badge tone={BILLABLE_STATUS[b.status].tone}>{BILLABLE_STATUS[b.status].label}</Badge>
                  </span>
                </Cell>
                <ActionCell>
                  {admin && b.status === "unbilled" ? (
                    <FormDialog
                      triggerVariant="ghost"
                      trigger={<Ban size={14} aria-label="Void charge" />}
                      title="Void charge"
                      description="The charge won't be invoiced or claimed. Shift charges come back if the shift is reopened and completed again."
                      action={voidBillable.bind(null, b.id)}
                      submitLabel="Void"
                    >
                      <input type="hidden" name="return" value={here} />
                      <Field label="Reason">
                        <Input name="reason" required maxLength={200} placeholder="Agreed with the client not to charge" />
                      </Field>
                    </FormDialog>
                  ) : null}
                </ActionCell>
              </Row>
            ))}
          </Table>
          {billables.data.length === PAGE ? (
            <p className="px-9 py-3 text-[12px] text-ink-3">Showing the latest {PAGE}. Narrow the dates or client to see more.</p>
          ) : null}
        </>
      )}
    </>
  );
}
