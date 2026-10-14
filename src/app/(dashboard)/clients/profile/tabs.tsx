import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { FormDialog } from "@/components/dialog";
import { ActionSelect } from "@/components/action-select";
import { FileLink } from "@/components/file-link";
import { AttributeGroup, Highlight, Highlights, OverviewNotes, TabBar, TabEmpty } from "@/components/profile";
import { Chip, GridCell, GridNameCell, GridRow, GridTable } from "@/components/record-list";
import { NewNoteButton, RecordNotes } from "@/components/record-notes";
import { UploadDialog } from "@/components/upload-dialog";
import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import {
  ASSESSMENT_TYPE,
  CLIENT_CONTACT_KIND,
  CREDENTIALS,
  DOCUMENT_FOLDER,
  FUNDING,
  GOAL_STATUS,
  HCP_LEVELS,
  OBSERVATION_KIND,
  OBSERVATION_SEVERITY,
  PLAN_MANAGEMENT,
  PROFESSIONAL_TYPE,
} from "@/lib/care";
import { formatDate, formatDay, formatMoney, personName } from "@/lib/format";
import { formatLongDay, formatShiftTime, localParts } from "@/lib/roster";
import type { Tables } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";
import { setListMembership } from "../actions";
import {
  deleteBudgetLine,
  deleteCarePlan,
  deleteClientContact,
  deleteDocument,
  deleteGoal,
  deleteObservation,
  deleteTask,
  removeStaffPreference,
  resolveObservation,
  saveBudgetLine,
  saveCarePlan,
  saveClientContact,
  saveDocument,
  saveGoal,
  saveObservation,
  saveTask,
  setGoalStatus,
  setRequiredCredentials,
  setStaffPreference,
  setTaskDone,
} from "../profile-actions";
import { ClientDetails } from "./details";

export type ClientTabKey = "overview" | "notes" | "budget" | "care" | "observe" | "tasks" | "files" | "contacts";

const options = (entries: Record<string, string | { label: string }>) =>
  Object.entries(entries).map(([value, option]) => ({ value, label: typeof option === "string" ? option : option.label }));

const control = "h-7 rounded-control border border-line-strong bg-canvas px-2 text-[13px] text-ink";

export async function OverviewTab({
  ctx,
  contact,
  profile,
  href,
}: {
  ctx: WorkspaceContext;
  contact: Tables<"contacts">;
  profile: Tables<"client_profiles">;
  href: (change: { tab?: ClientTabKey }) => string;
}) {
  const worker = profile.key_worker_id
    ? await ctx.supabase.from("staff").select("first_name, last_name, email").eq("id", profile.key_worker_id).maybeSingle()
    : { data: null, error: null };
  if (worker.error) throw worker.error;
  const level =
    profile.hcp_level && Object.hasOwn(HCP_LEVELS, String(profile.hcp_level))
      ? HCP_LEVELS[String(profile.hcp_level) as keyof typeof HCP_LEVELS]
      : profile.funding
        ? FUNDING[profile.funding].label
        : null;

  return (
    <div className="space-y-8 px-9 py-6">
      <Highlights>
        <Highlight label="Funding" value={profile.funding ? FUNDING[profile.funding].label : null} href={href({ tab: "budget" })} />
        <Highlight
          label="Classification"
          value={profile.plan_management ? PLAN_MANAGEMENT[profile.plan_management] : null}
          href={href({ tab: "budget" })}
        />
        <Highlight label="Level / Type" value={level} href={href({ tab: "budget" })} />
        <Highlight label="Care manager" value={worker.data ? personName(worker.data) : null} />
        <Highlight label="Languages" value={profile.languages || null} />
        <Highlight label="Allergies" value={profile.allergies || null} />
      </Highlights>
      <OverviewNotes href={href({ tab: "notes" })} add={<NewNoteButton ctx={ctx} subject={{ kind: "client", id: contact.id }} variant="secondary" />}>
        <RecordNotes ctx={ctx} subject={{ kind: "client", id: contact.id }} limit={3} />
      </OverviewNotes>
    </div>
  );
}

export async function NotesTab({
  ctx,
  contactId,
  query,
  type,
  keep,
}: {
  ctx: WorkspaceContext;
  contactId: string;
  query: string;
  type: "general" | "appointment" | null;
  keep: Record<string, string>;
}) {
  return <RecordNotes ctx={ctx} subject={{ kind: "client", id: contactId }} query={query} type={type} keep={keep} />;
}

export async function BudgetTab({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const { supabase, workspace } = ctx;
  const [lines, billables] = await Promise.all([
    supabase.from("budget_lines").select("*").eq("workspace_id", workspace.id).eq("contact_id", contactId).order("created_at"),
    supabase
      .from("billables")
      .select("id, description, service_date, amount_cents, status")
      .eq("workspace_id", workspace.id)
      .eq("contact_id", contactId)
      .order("service_date", { ascending: false })
      .limit(8),
  ]);
  if (lines.error) throw lines.error;
  if (billables.error) throw billables.error;
  const total = lines.data.reduce((sum, line) => sum + line.amount_cents, 0);

  return (
    <>
      <TabBar title={`${lines.data.length} funding ${lines.data.length === 1 ? "line" : "lines"} · ${formatMoney(total, workspace.currency)}`}>
        <FormDialog trigger={<><Plus /> Line</>} title="Add funding" action={saveBudgetLine.bind(null, contactId)} submitLabel="Add line">
          <Field label="Label">
            <Input name="label" maxLength={120} placeholder="Core supports" />
          </Field>
          <Field label="Amount">
            <Input name="amount" type="number" min="0" step="0.01" required />
          </Field>
          <Field label="Support category" hint="Two digits from the NDIS support number, or leave blank.">
            <Input name="category" maxLength={2} placeholder="01" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <Input name="starts_on" type="date" />
            </Field>
            <Field label="Ends">
              <Input name="ends_on" type="date" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="temporary" /> Temporary top-up
          </label>
        </FormDialog>
      </TabBar>
      {lines.data.length ? (
        <GridTable
          label="Funding"
          columns={[{ label: "Line" }, { label: "Amount" }, { label: "Dates" }, { label: "" }]}
          footer={`${formatMoney(total, workspace.currency)} allocated`}
        >
          {lines.data.map((line) => (
            <GridRow key={line.id}>
              <GridNameCell name={line.label || "Funding"} detail={line.temporary ? "Temporary" : line.category ? `Category ${line.category}` : undefined} />
              <GridCell>{formatMoney(line.amount_cents, workspace.currency)}</GridCell>
              <GridCell>
                {[line.starts_on ? formatDay(line.starts_on) : null, line.ends_on ? formatDay(line.ends_on) : null].filter(Boolean).join(" – ") || null}
              </GridCell>
              <GridCell className="w-10">
                <form action={deleteBudgetLine.bind(null, contactId, line.id)}>
                  <ConfirmSubmit confirm="Remove this funding line?" label="Remove funding line" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                    <Trash2 size={14} />
                  </ConfirmSubmit>
                </form>
              </GridCell>
            </GridRow>
          ))}
        </GridTable>
      ) : (
        <TabEmpty>No funding lines yet. Add the amounts from the client&apos;s plan.</TabEmpty>
      )}
      {billables.data.length ? (
        <div className="px-9 py-6">
          <h2 className="text-[13px] font-medium">Recent billables</h2>
          <ul className="mt-3 divide-y divide-line rounded-card border border-line">
            {billables.data.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <span>
                  {b.description || "Billable"}
                  <span className="ml-2 text-ink-3">{formatDay(b.service_date)}</span>
                </span>
                <span className="tabular-nums">{b.amount_cents != null ? formatMoney(b.amount_cents, workspace.currency) : b.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export async function CareTab({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const { supabase, workspace } = ctx;
  const [plans, goals] = await Promise.all([
    supabase.from("care_plans").select("*").eq("workspace_id", workspace.id).eq("contact_id", contactId).order("created_on", { ascending: false }),
    supabase.from("client_goals").select("*").eq("workspace_id", workspace.id).eq("contact_id", contactId).order("created_at", { ascending: false }),
  ]);
  if (plans.error) throw plans.error;
  if (goals.error) throw goals.error;

  return (
    <>
      <TabBar title={`${plans.data.length} ${plans.data.length === 1 ? "plan" : "plans"}`}>
        <FormDialog trigger={<><Plus /> Plan</>} title="Add care plan" action={saveCarePlan.bind(null, contactId)} submitLabel="Add plan">
          <Field label="Title">
            <Input name="title" required maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Created">
              <Input name="created_on" type="date" required />
            </Field>
            <Field label="Renews">
              <Input name="renews_on" type="date" required />
            </Field>
          </div>
          <Field label="Summary">
            <Textarea name="summary" rows={4} maxLength={5000} />
          </Field>
        </FormDialog>
      </TabBar>
      {plans.data.length ? (
        <ul className="space-y-3 px-9 py-5">
          {plans.data.map((plan) => (
            <li key={plan.id} className="rounded-card border border-line px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-medium">{plan.title}</h3>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {formatDay(plan.created_on)} – renews {formatDay(plan.renews_on)}
                  </p>
                </div>
                <form action={deleteCarePlan.bind(null, contactId, plan.id)}>
                  <ConfirmSubmit confirm={`Delete “${plan.title}”?`} label="Delete care plan" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                    <Trash2 size={14} />
                  </ConfirmSubmit>
                </form>
              </div>
              {plan.summary ? <p className="mt-2 text-[13px] whitespace-pre-wrap text-ink-2">{plan.summary}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <TabEmpty>No care plans yet.</TabEmpty>
      )}

      <div className="border-t border-line">
        <TabBar title={`${goals.data.length} ${goals.data.length === 1 ? "goal" : "goals"}`}>
          <FormDialog trigger={<><Plus /> Goal</>} title="Add goal" action={saveGoal.bind(null, contactId)} submitLabel="Add goal">
            <Field label="Title">
              <Input name="title" required maxLength={160} />
            </Field>
            <Field label="Description">
              <Textarea name="description" rows={3} maxLength={2000} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue="not_started">
                {options(GOAL_STATUS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target date">
              <Input name="target_on" type="date" />
            </Field>
          </FormDialog>
        </TabBar>
        {goals.data.length ? (
          <GridTable
            label="Goals"
            footer={`${goals.data.length} ${goals.data.length === 1 ? "goal" : "goals"}`}
            columns={[{ label: "Goal" }, { label: "Status" }, { label: "Target" }, { label: "" }]}
          >
            {goals.data.map((goal) => (
              <GridRow key={goal.id}>
                <GridNameCell name={goal.title} detail={goal.description || undefined} />
                <GridCell>
                  <form action={setGoalStatus.bind(null, contactId, goal.id)}>
                    <ActionSelect name="value" defaultValue={goal.status} className={control} label="Goal status">
                      {options(GOAL_STATUS).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </ActionSelect>
                  </form>
                </GridCell>
                <GridCell>{goal.target_on ? formatDay(goal.target_on) : null}</GridCell>
                <GridCell className="w-10">
                  <form action={deleteGoal.bind(null, contactId, goal.id)}>
                    <ConfirmSubmit confirm={`Delete “${goal.title}”?`} label="Delete goal" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                      <Trash2 size={14} />
                    </ConfirmSubmit>
                  </form>
                </GridCell>
              </GridRow>
            ))}
          </GridTable>
        ) : (
          <TabEmpty>No goals recorded from the plan.</TabEmpty>
        )}
      </div>
    </>
  );
}

export async function ObserveTab({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const { data, error } = await ctx.supabase
    .from("client_observations")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("contact_id", contactId)
    .order("occurred_on", { ascending: false });
  if (error) throw error;

  return (
    <>
      <TabBar title={`${data.length} ${data.length === 1 ? "record" : "records"}`}>
        <FormDialog trigger={<><Plus /> Observation</>} title="Add observation" action={saveObservation.bind(null, contactId)} submitLabel="Add">
          <Field label="Title">
            <Input name="title" required maxLength={160} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select name="kind" defaultValue="caution">
                {options(OBSERVATION_KIND).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Severity">
              <Select name="severity" defaultValue="low">
                {options(OBSERVATION_SEVERITY).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Date">
            <Input name="occurred_on" type="date" required />
          </Field>
          <Field label="Details">
            <Textarea name="details" rows={4} maxLength={5000} />
          </Field>
        </FormDialog>
      </TabBar>
      {data.length ? (
        <ul className="space-y-3 px-9 py-5">
          {data.map((item) => (
            <li key={item.id} className="rounded-card border border-line px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[13px] font-medium">{item.title}</h3>
                    <Chip tone={OBSERVATION_SEVERITY[item.severity].tone}>{OBSERVATION_KIND[item.kind]}</Chip>
                    {item.resolved_at ? <Chip>Resolved</Chip> : <Chip tone="amber">Open</Chip>}
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {formatDay(item.occurred_on)}
                    {item.reporter_name ? ` · ${item.reporter_name}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <form action={resolveObservation.bind(null, contactId, item.id, !item.resolved_at)}>
                    <button type="submit" className={buttonClass("secondary")}>
                      {item.resolved_at ? "Reopen" : "Resolve"}
                    </button>
                  </form>
                  <form action={deleteObservation.bind(null, contactId, item.id)}>
                    <ConfirmSubmit confirm={`Delete “${item.title}”?`} label="Delete observation" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                      <Trash2 size={14} />
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
              {item.details ? <p className="mt-2 text-[13px] whitespace-pre-wrap text-ink-2">{item.details}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <TabEmpty>No cautions or incidents recorded.</TabEmpty>
      )}
    </>
  );
}

export async function TasksTab({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const { supabase, workspace } = ctx;
  const [tasks, staff] = await Promise.all([
    supabase.from("billable_tasks").select("*").eq("workspace_id", workspace.id).eq("contact_id", contactId).order("due_on"),
    supabase.from("staff").select("id, first_name, last_name, email, status").eq("workspace_id", workspace.id).neq("status", "inactive").order("first_name"),
  ]);
  if (tasks.error) throw tasks.error;
  if (staff.error) throw staff.error;

  return (
    <>
      <TabBar title={`${tasks.data.length} ${tasks.data.length === 1 ? "task" : "tasks"}`}>
        <FormDialog trigger={<><Plus /> Task</>} title="Add task" action={saveTask.bind(null, contactId)} submitLabel="Add task">
          <Field label="Title">
            <Input name="title" required maxLength={200} />
          </Field>
          <Field label="Assignee">
            <Select name="assignee_id" defaultValue="">
              <option value="">Unassigned</option>
              {staff.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {personName(s)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due">
              <Input name="due_on" type="date" />
            </Field>
            <Field label="Minutes">
              <Input name="minutes" type="number" min="0" max="10080" defaultValue="0" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea name="notes" rows={3} maxLength={4000} />
          </Field>
        </FormDialog>
      </TabBar>
      {tasks.data.length ? (
        <GridTable
          label="Tasks"
          footer={`${tasks.data.length} ${tasks.data.length === 1 ? "task" : "tasks"}`}
          columns={[{ label: "Task" }, { label: "Assignee" }, { label: "Due" }, { label: "Status" }, { label: "" }]}
        >
          {tasks.data.map((task) => (
            <GridRow key={task.id}>
              <GridNameCell name={task.title} detail={task.notes || undefined} />
              <GridCell>{task.assignee_id ? staff.data.find((s) => s.id === task.assignee_id)?.first_name : null}</GridCell>
              <GridCell>{task.due_on ? formatDay(task.due_on) : null}</GridCell>
              <GridCell>
                <Chip tone={task.status === "done" ? "green" : task.status === "non_billable" ? "grey" : "blue"}>
                  {task.status === "done" ? "Done" : task.status === "non_billable" ? "Non-billable" : "Outstanding"}
                </Chip>
              </GridCell>
              <GridCell className="w-24">
                <div className="flex justify-end gap-1">
                  {task.billable_id ? null : (
                    <form action={setTaskDone.bind(null, contactId, task.id, task.status !== "done")}>
                      <button type="submit" className={buttonClass("secondary")}>
                        {task.status === "done" ? "Reopen" : "Done"}
                      </button>
                    </form>
                  )}
                  {task.billable_id ? null : (
                    <form action={deleteTask.bind(null, contactId, task.id)}>
                      <ConfirmSubmit confirm={`Delete “${task.title}”?`} label="Delete task" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                        <Trash2 size={14} />
                      </ConfirmSubmit>
                    </form>
                  )}
                </div>
              </GridCell>
            </GridRow>
          ))}
        </GridTable>
      ) : (
        <TabEmpty>No tasks on this client.</TabEmpty>
      )}
    </>
  );
}

export async function FilesTab({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const { data, error } = await ctx.supabase
    .from("client_documents")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <TabBar title={`${data.length} ${data.length === 1 ? "file" : "files"}`}>
        <UploadDialog
          trigger={<><Plus /> File</>}
          title="Upload file"
          workspaceId={ctx.workspace.id}
          folder="documents"
          action={saveDocument.bind(null, contactId)}
        >
          <Field label="Title">
            <Input name="title" required maxLength={160} />
          </Field>
          <Field label="Folder">
            <Select name="folder" defaultValue="general">
              {Object.entries(DOCUMENT_FOLDER).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assessment type">
            <Select name="assessment_type" defaultValue="">
              <option value="">Not an assessment</option>
              {options(ASSESSMENT_TYPE).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="show_in_app" /> Show in staff app
          </label>
        </UploadDialog>
      </TabBar>
      {data.length ? (
        <GridTable
          label="Files"
          footer={`${data.length} ${data.length === 1 ? "file" : "files"}`}
          columns={[{ label: "File" }, { label: "Folder" }, { label: "Added" }, { label: "" }]}
        >
          {data.map((doc) => (
            <GridRow key={doc.id}>
              <GridNameCell name={doc.title} detail={doc.file_name} />
              <GridCell>{DOCUMENT_FOLDER[doc.folder].label}</GridCell>
              <GridCell>{formatDate(doc.created_at)}</GridCell>
              <GridCell className="w-24">
                <div className="flex justify-end gap-1">
                  <FileLink path={doc.storage_path} className={buttonClass("secondary")}>
                    Open
                  </FileLink>
                  <form action={deleteDocument.bind(null, contactId, doc.id)}>
                    <ConfirmSubmit confirm={`Delete “${doc.title}”?`} label="Delete file" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                      <Trash2 size={14} />
                    </ConfirmSubmit>
                  </form>
                </div>
              </GridCell>
            </GridRow>
          ))}
        </GridTable>
      ) : (
        <TabEmpty>No documents uploaded.</TabEmpty>
      )}
    </>
  );
}

export async function ContactsTab({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const { data, error } = await ctx.supabase
    .from("client_contacts")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("contact_id", contactId)
    .order("created_at");
  if (error) throw error;

  return (
    <>
      <TabBar title={`${data.length} ${data.length === 1 ? "connection" : "connections"}`}>
        <FormDialog trigger={<><Plus /> Contact</>} title="Add contact" action={saveClientContact.bind(null, contactId)} submitLabel="Add contact">
          <Field label="Name">
            <Input name="name" required maxLength={120} />
          </Field>
          <Field label="Type">
            <Select name="kind" defaultValue="contact">
              {options(CLIENT_CONTACT_KIND).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Relationship">
            <Input name="relationship" maxLength={60} placeholder="Parent, sibling…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input name="phone" maxLength={40} />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" />
            </Field>
          </div>
          <Field label="Address">
            <Input name="address" maxLength={200} />
          </Field>
          <Field label="Clinic / practice">
            <Input name="clinic" maxLength={120} />
          </Field>
          <Field label="Professional type">
            <Select name="professional_type" defaultValue="">
              <option value="">Not a clinician</option>
              {options(PROFESSIONAL_TYPE).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="is_primary" /> Primary contact
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="show_in_app" /> Show in staff app
          </label>
        </FormDialog>
      </TabBar>
      {data.length ? (
        <GridTable
          label="Contacts"
          footer={`${data.length} ${data.length === 1 ? "connection" : "connections"}`}
          columns={[{ label: "Name" }, { label: "Type" }, { label: "Phone" }, { label: "" }]}
        >
          {data.map((row) => (
            <GridRow key={row.id}>
              <GridNameCell
                name={row.name}
                detail={[row.is_primary ? "Primary" : null, row.relationship, row.email].filter(Boolean).join(" · ") || undefined}
              />
              <GridCell>{CLIENT_CONTACT_KIND[row.kind]}</GridCell>
              <GridCell>{row.phone || null}</GridCell>
              <GridCell className="w-10">
                <form action={deleteClientContact.bind(null, contactId, row.id)}>
                  <ConfirmSubmit confirm={`Remove ${row.name}?`} label={`Remove ${row.name}`} className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                    <Trash2 size={14} />
                  </ConfirmSubmit>
                </form>
              </GridCell>
            </GridRow>
          ))}
        </GridTable>
      ) : (
        <TabEmpty>No family, clinicians or roster recipients yet.</TabEmpty>
      )}
    </>
  );
}

export async function RosterSide({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const tz = ctx.workspace.timezone;
  const { data, error } = await ctx.supabase
    .from("shift_clients")
    .select("shift:shifts(id, starts_at, ends_at, status)")
    .eq("contact_id", contactId)
    .eq("workspace_id", ctx.workspace.id);
  if (error) throw error;
  const shifts = data
    .flatMap((row) => (row.shift ? [row.shift] : []))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .filter((s) => s.starts_at >= new Date(Date.now() - 7 * 86_400_000).toISOString())
    .slice(0, 20);

  if (!shifts.length) return <p className="px-4 py-6 text-[13px] text-ink-3">No upcoming or recent shifts.</p>;
  return (
    <ul className="px-4 py-3">
      {shifts.map((shift) => {
        const day = localParts(shift.starts_at, tz).day;
        return (
          <li key={shift.id} className="border-b border-line py-3 last:border-0">
            <Link href={`/schedule?shift=${shift.id}`} className="block text-[13px] hover:text-ink">
              <p className="font-medium">{formatLongDay(day)}</p>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {formatShiftTime(shift.starts_at, shift.ends_at, tz)} · {shift.status}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export async function TeamSide({
  ctx,
  contactId,
  required,
}: {
  ctx: WorkspaceContext;
  contactId: string;
  required: Tables<"client_profiles">["required_credentials"];
}) {
  const { supabase, workspace } = ctx;
  const [prefs, lists, staff, memberships] = await Promise.all([
    supabase
      .from("client_staff_preferences")
      .select("staff_id, preference, staff:staff(first_name, last_name, email)")
      .eq("workspace_id", workspace.id)
      .eq("contact_id", contactId),
    supabase.from("client_lists").select("id, name").eq("workspace_id", workspace.id).order("name"),
    supabase.from("staff").select("id, first_name, last_name, email, status").eq("workspace_id", workspace.id).neq("status", "inactive").order("first_name"),
    supabase.from("client_list_members").select("list_id").eq("workspace_id", workspace.id).eq("contact_id", contactId),
  ]);
  if (prefs.error) throw prefs.error;
  if (lists.error) throw lists.error;
  if (staff.error) throw staff.error;
  if (memberships.error) throw memberships.error;
  const memberOf = new Set(memberships.data.map((m) => m.list_id));

  return (
    <div className="divide-y divide-line">
      <AttributeGroup title="Preferred and excluded staff">
        <form action={setStaffPreference.bind(null, contactId)} className="mb-3 flex gap-2">
          <select name="staff_id" className={`${control} min-w-0 flex-1`} required>
            <option value="">Staff</option>
            {staff.data.map((s) => (
              <option key={s.id} value={s.id}>
                {personName(s)}
              </option>
            ))}
          </select>
          <select name="preference" className={control} defaultValue="preferred">
            <option value="preferred">Preferred</option>
            <option value="excluded">Excluded</option>
          </select>
          <button type="submit" className={buttonClass("secondary")}>
            Add
          </button>
        </form>
        {prefs.data.length ? (
          <ul className="space-y-1">
            {prefs.data.map((row) => (
              <li key={row.staff_id} className="flex items-center justify-between gap-2 text-[13px]">
                <span>
                  {row.staff ? personName(row.staff) : "Staff"}{" "}
                  <Chip tone={row.preference === "preferred" ? "green" : "red"}>{row.preference === "preferred" ? "Preferred" : "Excluded"}</Chip>
                </span>
                <form action={removeStaffPreference.bind(null, contactId, row.staff_id)}>
                  <ConfirmSubmit confirm="Remove this preference?" label="Remove preference" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                    <Trash2 size={14} />
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-3">No staff preferences.</p>
        )}
      </AttributeGroup>
      <AttributeGroup title="Lists">
        {lists.data.length ? (
          <ul className="space-y-1">
            {lists.data.map((list) => {
              const on = memberOf.has(list.id);
              return (
                <li key={list.id}>
                  <form action={setListMembership.bind(null, contactId, list.id, !on)}>
                    <button type="submit" className="flex w-full items-center justify-between rounded-control px-1 py-1 text-left text-[13px] hover:bg-hover">
                      {list.name}
                      <Chip tone={on ? "blue" : "grey"}>{on ? "On list" : "Add"}</Chip>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-3">No lists yet. Create one from the Clients page.</p>
        )}
      </AttributeGroup>
      <AttributeGroup title="Staff compliance for this client">
        <form action={setRequiredCredentials.bind(null, contactId)} className="space-y-1.5">
          {Object.entries(CREDENTIALS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="kind" value={value} defaultChecked={required.includes(value as (typeof required)[number])} />
              {label}
            </label>
          ))}
          <button type="submit" className={buttonClass("secondary")}>
            Save requirements
          </button>
        </form>
      </AttributeGroup>
    </div>
  );
}

export { ClientDetails };
