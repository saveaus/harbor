import { clsx } from "clsx";
import { Plus, Trash2, Workflow } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { RelativeTime } from "@/components/relative-time";
import { Cell, EmptyState, Field, Input, PageHeader, Row, Select, Table, Textarea } from "@/components/ui";
import { AUTOMATION_ACTIONS, AUTOMATION_TRIGGERS, actionLabels, parseAction, parseTrigger, triggerLabels } from "@/lib/automations";
import { getWorkspace } from "@/lib/workspace";
import { createAutomation, deleteAutomation, setAutomationEnabled } from "./actions";

export default async function AutomationsPage() {
  const { supabase, workspace } = await getWorkspace();
  const { data: automations, error } = await supabase
    .from("automations")
    .select("id, name, trigger, action, message, enabled, run_count, last_run_at")
    .eq("workspace_id", workspace.id)
    .order("created_at");
  if (error) throw error;

  const create = (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New automation
        </>
      }
      title="New automation"
      description="Runs by itself whenever the event happens."
      action={createAutomation}
      submitLabel="Create automation"
    >
      <Field label="Name">
        <Input name="name" required maxLength={120} placeholder="Thank clients for payment" />
      </Field>
      <Field label="When">
        <Select name="trigger" required defaultValue="invoice_paid">
          {AUTOMATION_TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {triggerLabels[t].label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Then">
        <Select name="action" required defaultValue="send_message">
          {AUTOMATION_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {actionLabels[a]}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Message"
        hint="Use {{client_name}} for the client and {{detail}} for the invoice number, contract or form name, email or message."
      >
        <Textarea name="message" rows={4} maxLength={2000} placeholder="Thanks {{client_name}}, we received payment for {{detail}}." />
      </Field>
    </FormDialog>
  );

  return (
    <>
      <PageHeader title="Automations" actions={automations.length ? create : null} />
      <div className="flex-1 overflow-y-auto">
        {automations.length === 0 ? (
          <EmptyState
            icon={<Workflow size={18} />}
            title="No automations yet"
            body="Send a message or alert staff when a client pays, signs, fills in a form, writes to you or is added."
            action={create}
          />
        ) : (
          <Table columns={["Name", "When", "Then", "Runs", "Last run", "", ""]}>
            {automations.map((rule) => {
              const trigger = parseTrigger(rule.trigger);
              const action = parseAction(rule.action);
              return (
                <Row key={rule.id}>
                  <Cell className="font-medium text-ink">
                    <span className="block max-w-64 truncate" title={rule.message}>
                      {rule.name}
                    </span>
                  </Cell>
                  <Cell>{trigger ? triggerLabels[trigger].label : rule.trigger}</Cell>
                  <Cell>{action ? actionLabels[action] : rule.action}</Cell>
                  <Cell className="tabular-nums">{rule.run_count}</Cell>
                  <Cell>{rule.last_run_at ? <RelativeTime value={rule.last_run_at} /> : "Never"}</Cell>
                  <Cell className="w-16">
                    <form action={setAutomationEnabled.bind(null, rule.id, !rule.enabled)}>
                      <button
                        type="submit"
                        role="switch"
                        aria-checked={rule.enabled}
                        aria-label={rule.enabled ? `Turn off ${rule.name}` : `Turn on ${rule.name}`}
                        className={clsx(
                          "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                          rule.enabled ? "bg-accent" : "bg-line-strong",
                        )}
                      >
                        <span
                          className={clsx(
                            "size-3 rounded-full bg-white shadow-control transition-transform",
                            rule.enabled ? "translate-x-3.5" : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </form>
                  </Cell>
                  <Cell className="w-10 text-right">
                    <form action={deleteAutomation.bind(null, rule.id)}>
                      <button type="submit" aria-label={`Delete ${rule.name}`} className="rounded-control p-1 text-ink-4 hover:bg-hover hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
