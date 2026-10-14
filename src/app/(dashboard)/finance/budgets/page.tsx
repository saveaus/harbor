import Link from "next/link";
import { clsx } from "clsx";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Alert, Button, ButtonLink, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { FUNDING, PLAN_MANAGEMENT, planEndTone } from "@/lib/care";
import { NDIS_CATEGORIES, budgetLineName, budgetUsage } from "@/lib/finance";
import { formatDay, formatMoney, personName } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { deleteBudgetLine, saveBudgetLine } from "../actions";
import { PlanManagerField } from "../plan-manager-field";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error: notice }, { supabase, workspace, member }] = await Promise.all([searchParams, requireApp("finance")]);
  const admin = member.role !== "member";

  const [profiles, lines, finance, contacts] = await Promise.all([
    supabase
      .from("client_profiles")
      .select("contact_id, funding, plan_management, plan_start, plan_end, contact:contacts(first_name, last_name, email)")
      .eq("workspace_id", workspace.id)
      .neq("status", "inactive"),
    supabase.from("budget_lines").select("id, contact_id, category, label, amount_cents, starts_on, ends_on, temporary").eq("workspace_id", workspace.id),
    supabase.from("client_finance").select("contact_id, plan_manager_id").eq("workspace_id", workspace.id),
    supabase.from("contacts").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).order("first_name"),
  ]);
  if (profiles.error) throw profiles.error;
  if (lines.error) throw lines.error;
  if (finance.error) throw finance.error;
  if (contacts.error) throw contacts.error;
  const managers = new Map(finance.data.map((row) => [row.contact_id, row.plan_manager_id]));

  const charges = profiles.data.length
    ? await supabase
        .from("billables")
        .select("contact_id, support_number, service_date, amount_cents, status")
        .eq("workspace_id", workspace.id)
        .neq("status", "void")
        .in(
          "contact_id",
          profiles.data.map((p) => p.contact_id),
        )
    : { data: [], error: null };
  if (charges.error) throw charges.error;

  const plans = new Map(profiles.data.map((p) => [p.contact_id, { plan_start: p.plan_start, plan_end: p.plan_end }]));
  const usage = budgetUsage(lines.data, charges.data, plans);
  const byClient = new Map<string, typeof usage>();
  for (const line of usage) {
    const list = byClient.get(line.contact_id) ?? [];
    list.push(line);
    byClient.set(line.contact_id, list);
  }

  const rows = profiles.data
    .map((p) => ({ ...p, name: p.contact ? personName(p.contact) : "Client", lines: byClient.get(p.contact_id) ?? [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const money = (cents: number) => formatMoney(cents, workspace.currency);

  const addLine = admin ? (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> Add line
        </>
      }
      title="Budget line"
      description="A slice of a client's funding. Leave the category blank to cover every support."
      action={saveBudgetLine.bind(null, null)}
      submitLabel="Add line"
    >
      <Field label="Client">
        <Select name="client" required>
          <option value="">Choose client</option>
          {rows.map((r) => (
            <option key={r.contact_id} value={r.contact_id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Label">
        <Input name="label" maxLength={120} placeholder="Core supports" />
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue="">
          <option value="">All supports</option>
          {Object.entries(NDIS_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {value} {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Amount">
        <Input name="amount" type="number" min={0} step="0.01" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <Input name="starts" type="date" />
        </Field>
        <Field label="To">
          <Input name="ends" type="date" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" name="temporary" className="size-4 accent-[var(--color-accent)]" /> Top-up (needs an end date)
      </label>
    </FormDialog>
  ) : null;

  return (
    <div className="w-full max-w-[1100px] space-y-4 px-9 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-medium">Client budgets</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Each line is a pocket of funding. Pending roster charges count as scheduled; completed ones as delivered.
          </p>
        </div>
        {addLine}
      </div>
      {notice ? <Alert>{notice}</Alert> : null}
      {rows.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={18} />}
          title="No client profiles"
          body="Add funding and plan details to a client's profile to track their budget here."
          action={
            <ButtonLink href="/clients">Go to Clients</ButtonLink>
          }
        />
      ) : (
        <Card>
          {rows.map((r) => {
            const budget = r.lines.reduce((sum, l) => sum + l.amount_cents, 0);
            const delivered = r.lines.reduce((sum, l) => sum + l.deliveredCents, 0);
            const scheduled = r.lines.reduce((sum, l) => sum + l.scheduledCents, 0);
            const used = budget ? (delivered + scheduled) / budget : 0;
            const endTone = planEndTone(r.plan_end);
            return (
              <div key={r.contact_id} className="border-b border-line px-5 py-3 text-[13px] last:border-0 hover:bg-hover">
                <div className="grid grid-cols-[1.2fr_1.6fr] items-center gap-6">
                  <div className="min-w-0">
                    <Link href={`/clients/${r.contact_id}`} className="font-medium text-ink hover:text-ink-3">
                      {r.name}
                    </Link>
                    <div className="text-[12px] text-ink-3">
                      {r.funding ? FUNDING[r.funding].label : "Funding not set"}
                      {r.funding === "ndis" && r.plan_management ? ` · ${PLAN_MANAGEMENT[r.plan_management]}` : ""}
                    </div>
                    <div className={clsx("text-[12px]", endTone === "red" ? "text-danger" : endTone === "amber" ? "text-warning" : "text-ink-3")}>
                      {r.plan_start || r.plan_end ? `Plan ${formatDay(r.plan_start)} – ${formatDay(r.plan_end)}` : "No plan dates"}
                    </div>
                    <PlanManagerField
                      contactId={r.contact_id}
                      managerId={managers.get(r.contact_id) ?? null}
                      contacts={contacts.data}
                      required={r.plan_management === "plan_managed"}
                      admin={admin}
                    />
                  </div>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-hover">
                      <div className="flex h-full">
                        <div className={clsx("h-full", used > 1 ? "bg-danger" : "bg-accent")} style={{ width: `${Math.min(100, budget ? (delivered / budget) * 100 : 0)}%` }} />
                        <div className="h-full bg-info-soft" style={{ width: `${Math.min(100, budget ? (scheduled / budget) * 100 : 0)}%` }} />
                      </div>
                    </div>
                    <div className="mt-1.5 flex justify-between text-[12px] text-ink-3">
                      <span>
                        {money(delivered)} delivered · {money(scheduled)} scheduled
                      </span>
                      <span className={used > 1 ? "text-danger" : undefined}>{budget === 0 ? "No budget lines" : `${money(budget - delivered - scheduled)} left`}</span>
                    </div>
                  </div>
                </div>
                {r.lines.length ? (
                  <ul className="mt-2 space-y-1">
                    {r.lines.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-3 text-[12px] text-ink-3">
                        <span>
                          {budgetLineName(l)} · {money(l.amount_cents)} · {money(l.remainingCents)} left
                        </span>
                        {admin ? (
                          <form action={deleteBudgetLine.bind(null, l.id)}>
                            <Button type="submit" variant="ghost" aria-label={`Delete ${budgetLineName(l)}`}>
                              <Trash2 size={13} />
                            </Button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
