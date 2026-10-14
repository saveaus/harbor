import { Check, ListTodo, Plus, RotateCcw } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { ActionCell, Alert, Badge, Button, Cell, EmptyState, Field, Input, Row, Select, Table, Textarea } from "@/components/ui";
import { BILLABLE_TASK_STATUS } from "@/lib/finance";
import { formatDay, personName } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { completeTask, reopenTask, saveTask } from "../actions";
import { loadShiftOptions } from "../data";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, ctx] = await Promise.all([searchParams, requireApp("scheduling")]);
  const { supabase, workspace, member } = ctx;
  const admin = member.role !== "member";
  const [tasks, options] = await Promise.all([
    supabase
      .from("billable_tasks")
      .select(
        "id, title, notes, due_on, minutes, status, contact:contacts(first_name, last_name, email), assignee:staff(first_name, last_name, email), item:price_book_items(name)",
      )
      .eq("workspace_id", workspace.id)
      .order("due_on", { nullsFirst: false })
      .order("created_at", { ascending: false }),
    loadShiftOptions(ctx),
  ]);
  if (tasks.error) throw tasks.error;

  const create = admin ? (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New task
        </>
      }
      title="New billable task"
      description="Report writing and other work that isn't a shift. Completing it with a support item creates a ready charge."
      action={saveTask}
      submitLabel="Create task"
    >
      <Field label="Title">
        <Input name="title" required maxLength={200} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client">
          <Select name="client" required>
            <option value="">Choose client</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assignee">
          <Select name="staff">
            <option value="">Unassigned</option>
            {options.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Due">
          <Input name="due" type="date" />
        </Field>
        <Field label="Minutes">
          <Input name="minutes" type="number" min={0} max={10080} defaultValue={0} />
        </Field>
      </div>
      <Field label="Support item" hint="Needed to bill the task when it's completed">
        <Select name="item">
          <option value="">Don&apos;t bill</option>
          {options.items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes">
        <Textarea name="notes" rows={2} maxLength={4000} />
      </Field>
    </FormDialog>
  ) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-9 pt-5 pb-3">
        <p className="text-[13px] text-ink-3">Work that isn&apos;t a shift — report writing, coordination — billed when marked done.</p>
        {create}
      </div>
      {params.error ? (
        <div className="px-9 pb-3">
          <Alert>{params.error}</Alert>
        </div>
      ) : null}
      {tasks.data.length === 0 ? (
        <EmptyState icon={<ListTodo size={18} />} title="No tasks" body="Create a task for work that should be billed without a shift." action={create ?? undefined} />
      ) : (
        <Table columns={["Task", "Client", "Assignee", "Due", "Status", ""]}>
          {tasks.data.map((t) => {
            const status = BILLABLE_TASK_STATUS[t.status];
            return (
              <Row key={t.id}>
                <Cell>
                  <span className="block font-medium">{t.title}</span>
                  {t.item ? <span className="block text-[12px] text-ink-3">{t.item.name}</span> : null}
                </Cell>
                <Cell>{t.contact ? personName(t.contact) : "Client"}</Cell>
                <Cell className="text-ink-3">{t.assignee ? personName(t.assignee) : "—"}</Cell>
                <Cell className="text-ink-3">{t.due_on ? formatDay(t.due_on) : "—"}</Cell>
                <Cell>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </Cell>
                <ActionCell>
                  {admin && t.status === "outstanding" ? (
                    <>
                      <form action={completeTask.bind(null, t.id, true)}>
                        <Button type="submit" variant="ghost" aria-label="Complete and bill">
                          <Check size={14} />
                        </Button>
                      </form>
                      <form action={completeTask.bind(null, t.id, false)}>
                        <Button type="submit" variant="ghost">
                          Non-billable
                        </Button>
                      </form>
                    </>
                  ) : null}
                  {admin && t.status !== "outstanding" ? (
                    <form action={reopenTask.bind(null, t.id)}>
                      <Button type="submit" variant="ghost" aria-label="Reopen">
                        <RotateCcw size={14} />
                      </Button>
                    </form>
                  ) : null}
                </ActionCell>
              </Row>
            );
          })}
        </Table>
      )}
    </>
  );
}
