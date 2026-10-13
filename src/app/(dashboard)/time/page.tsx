import { Clock, Plus, Receipt, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Alert, Badge, Button, Card, Cell, EmptyState, Field, Input, PageHeader, Row, Select, Table } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { listRecipients, recipientName } from "@/lib/payments";
import { entryAmountCents, formatDuration } from "@/lib/time";
import { requireApp } from "@/lib/workspace";
import { deleteTimeEntry, invoiceUnbilledTime, logTime } from "./actions";

type Unbilled = { key: string; name: string; minutes: number; amountCents: number };

export default async function TimePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error: notice }, ctx] = await Promise.all([searchParams, requireApp("timetracker")]);
  const { supabase, workspace, installedApps } = ctx;
  const [recipients, entries] = await Promise.all([
    listRecipients(ctx),
    supabase
      .from("time_entries")
      .select(
        "id, description, entry_date, minutes, billable, hourly_rate_cents, invoice_id, member_name, company_id, contact_id, company:companies(name), contact:contacts(first_name, last_name, email)",
      )
      .eq("workspace_id", workspace.id)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (entries.error) throw entries.error;

  const unbilled = new Map<string, Unbilled>();
  for (const entry of entries.data) {
    if (!entry.billable || entry.invoice_id || entry.hourly_rate_cents === 0) continue;
    const key = entry.company_id ? `company:${entry.company_id}` : entry.contact_id ? `contact:${entry.contact_id}` : null;
    if (!key) continue;
    const row = unbilled.get(key) ?? { key, name: recipientName(entry), minutes: 0, amountCents: 0 };
    row.minutes += entry.minutes;
    row.amountCents += entryAmountCents(entry);
    unbilled.set(key, row);
  }

  const logDialog = (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> Log time
        </>
      }
      title="Log time"
      action={logTime}
      submitLabel="Save entry"
    >
      <Field label="Client">
        <Select name="recipient" defaultValue="">
          <option value="">No client (internal)</option>
          {recipients.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="What did you work on?">
        <Input name="description" required maxLength={500} placeholder="Homepage wireframes" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date">
          <Input name="entry_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Duration" hint="1:30 or 1.5">
          <Input name="duration" required placeholder="1:30" />
        </Field>
        <Field label="Hourly rate" hint="USD">
          <Input name="rate" type="number" min={0} step="0.01" placeholder="150" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" name="billable" defaultChecked className="size-4 accent-[var(--color-accent)]" />
        Billable
      </label>
    </FormDialog>
  );

  return (
    <>
      <PageHeader title="Time tracker" actions={logDialog} />
      <div className="flex-1 overflow-y-auto">
        {notice ? (
          <div className="px-5 pt-4">
            <Alert>{notice}</Alert>
          </div>
        ) : null}

        {unbilled.size ? (
          <div className="px-5 pt-5">
            <Card>
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-[13px] font-semibold">Unbilled time</h2>
              </div>
              <ul>
                {[...unbilled.values()].map((row) => (
                  <li key={row.key} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-0">
                    <span className="flex-1 font-medium">{row.name}</span>
                    <span className="text-ink-3">{formatDuration(row.minutes)}</span>
                    <span className="w-24 text-right tabular-nums">{formatMoney(row.amountCents)}</span>
                    {installedApps.has("payments") ? (
                      <form action={invoiceUnbilledTime.bind(null, row.key)}>
                        <Button type="submit">
                          <Receipt size={14} /> Create invoice
                        </Button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
            {installedApps.has("payments") ? null : (
              <p className="mt-2 text-[12px] text-ink-3">Add the Payments app to turn unbilled time into invoices.</p>
            )}
          </div>
        ) : null}

        {entries.data.length === 0 ? (
          <EmptyState icon={<Clock size={18} />} title="No time logged" body="Record hours against clients, then bill them in one step." action={logDialog} />
        ) : (
          <div className="pt-4">
            <Table columns={["Date", "Client", "Description", "Who", "Time", "Amount", "", ""]}>
              {entries.data.map((entry) => (
                <Row key={entry.id}>
                  <Cell>{formatDate(entry.entry_date)}</Cell>
                  <Cell className="text-ink">{entry.company || entry.contact ? recipientName(entry) : "Internal"}</Cell>
                  <Cell>
                    <span className="block max-w-72 truncate">{entry.description}</span>
                  </Cell>
                  <Cell>{entry.member_name || "—"}</Cell>
                  <Cell className="tabular-nums">{formatDuration(entry.minutes)}</Cell>
                  <Cell className="tabular-nums">{entry.billable && entry.hourly_rate_cents ? formatMoney(entryAmountCents(entry)) : "—"}</Cell>
                  <Cell>
                    {entry.invoice_id ? <Badge tone="success">Invoiced</Badge> : entry.billable ? <Badge>Unbilled</Badge> : <Badge>Non-billable</Badge>}
                  </Cell>
                  <Cell className="w-10 text-right">
                    {entry.invoice_id ? null : (
                      <form action={deleteTimeEntry.bind(null, entry.id)}>
                        <button type="submit" aria-label="Delete entry" className="rounded-control p-1 text-ink-4 hover:bg-hover hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    )}
                  </Cell>
                </Row>
              ))}
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
