import { Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { ActionSelect } from "@/components/action-select";
import { AttributeField } from "@/components/attribute-field";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { FormDialog } from "@/components/dialog";
import { FileLink } from "@/components/file-link";
import { Highlight, Highlights, OverviewNotes, TabBar, TabEmpty } from "@/components/profile";
import { Chip, GridCell, GridNameCell, GridRow, GridTable } from "@/components/record-list";
import { NewNoteButton, RecordNotes } from "@/components/record-notes";
import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import {
  CHECKLIST_STATE,
  CREDENTIALS,
  DOCUMENT_REVIEW,
  EMPLOYMENT,
  LEAVE_KIND,
  LEAVE_STATUS,
  WEEKDAYS,
  checklistState,
} from "@/lib/care";
import { formatDay } from "@/lib/format";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";
import { addCredential, deleteCredential } from "../actions";
import {
  deleteAvailability,
  deleteLeave,
  saveAvailability,
  saveLeave,
  setCredentialReview,
  setFinanceField,
  setLeaveStatus,
  setStaffRequirements,
  type FinanceField,
} from "../profile-actions";

export type StaffTabKey = "overview" | "notes" | "compliance" | "files" | "leave" | "availability" | "employment" | "finance" | "activity";

const options = (entries: Record<string, string | { label: string }>) =>
  Object.entries(entries).map(([value, option]) => ({ value, label: typeof option === "string" ? option : option.label }));

const control = "h-7 rounded-control border border-line-strong bg-canvas px-2 text-[13px] text-ink";

function clock(value: string) {
  return value.slice(0, 5);
}

export async function StaffOverview({
  ctx,
  person,
  href,
  access,
}: {
  ctx: WorkspaceContext;
  person: Tables<"staff">;
  href: (change: { tab?: StaffTabKey }) => string;
  access: string;
}) {
  return (
    <div className="space-y-8 px-9 py-6">
      <Highlights>
        <Highlight label="Role" value={person.position} />
        <Highlight label="Nationality" value={person.nationality} />
        <Highlight label="Type" value={person.employment_type ? EMPLOYMENT[person.employment_type] : null} href={href({ tab: "employment" })} />
        <Highlight label="Employee ID" value={String(person.staff_number)} />
        <Highlight label="Date of Birth" value={person.date_of_birth ? formatDay(person.date_of_birth) : null} />
        <Highlight label="Access Business" value={access} />
      </Highlights>
      <OverviewNotes href={href({ tab: "notes" })} add={<NewNoteButton ctx={ctx} subject={{ kind: "staff", id: person.id }} variant="secondary" />}>
        <RecordNotes ctx={ctx} subject={{ kind: "staff", id: person.id }} limit={3} />
      </OverviewNotes>
    </div>
  );
}

export function AddLeaveButton({ staffId }: { staffId: string }) {
  return (
    <FormDialog trigger="Add leave" triggerVariant="secondary" title="Add leave" action={saveLeave.bind(null, staffId)} submitLabel="Add leave">
      <Field label="Type">
        <Select name="kind" defaultValue="annual">
          {options(LEAVE_KIND).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts">
          <Input name="starts_on" type="date" required />
        </Field>
        <Field label="Ends">
          <Input name="ends_on" type="date" required />
        </Field>
      </div>
      <Field label="Reason">
        <Textarea name="reason" rows={3} maxLength={500} />
      </Field>
    </FormDialog>
  );
}

export async function StaffNotes({
  ctx,
  staffId,
  query,
  type,
  keep,
}: {
  ctx: WorkspaceContext;
  staffId: string;
  query: string;
  type: "general" | "appointment" | null;
  keep: Record<string, string>;
}) {
  return <RecordNotes ctx={ctx} subject={{ kind: "staff", id: staffId }} query={query} type={type} keep={keep} />;
}

export async function ComplianceTab({
  ctx,
  person,
  canEdit,
}: {
  ctx: WorkspaceContext;
  person: Tables<"staff"> & {
    staff_credentials: { id: string; kind: Enums<"credential_kind">; reference: string; expires_on: string | null; review: Enums<"document_review"> }[];
  };
  canEdit: boolean;
}) {
  const required = person.required_credentials;
  const rows = required.map((kind) => {
    const holdings = person.staff_credentials.filter((c) => c.kind === kind);
    const state = checklistState(kind, person.staff_credentials);
    return { kind, holdings, state, extra: false };
  });
  const extra = person.staff_credentials.filter((c) => !required.includes(c.kind));
  const missing = rows.filter((r) => r.state === "not_uploaded" || r.state === "declined").length;

  return (
    <>
      <TabBar title={missing ? `${missing} required ${missing === 1 ? "check" : "checks"} missing` : "All required checks recorded"}>
        {canEdit ? (
          <form action={addCredential.bind(null, person.id)} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[12px] text-ink-3">
              Check
              <select name="kind" className={`${control} w-56`} defaultValue={rows.find((r) => r.state === "not_uploaded")?.kind ?? "other"}>
                {Object.entries(CREDENTIALS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-ink-3">
              Reference
              <input name="reference" maxLength={80} placeholder="Optional" className={`${control} w-40`} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-ink-3">
              Expires
              <input name="expires_on" type="date" className={`${control} w-40`} />
            </label>
            <button type="submit" className={buttonClass("primary")}>
              Record check
            </button>
          </form>
        ) : null}
      </TabBar>
      <GridTable
        label="Checks"
        footer={`${person.staff_credentials.length} recorded · ${required.length} required`}
        columns={[{ label: "Check" }, { label: "State" }, { label: "Review" }, { label: "Expires" }, { label: "" }]}
      >
        {rows.flatMap((row) => {
          if (!row.holdings.length) {
            const state = CHECKLIST_STATE[row.state];
            return [
              <GridRow key={row.kind}>
                <GridNameCell name={CREDENTIALS[row.kind]} detail="Required" icon={ShieldAlert} />
                <GridCell>
                  <Chip tone={state.tone}>{state.label}</Chip>
                </GridCell>
                <GridCell />
                <GridCell />
                <GridCell className="w-10" />
              </GridRow>,
            ];
          }
          return row.holdings.map((held) => {
            const state = CHECKLIST_STATE[checklistState(row.kind, [held])];
            return (
              <GridRow key={held.id}>
                <GridNameCell name={CREDENTIALS[row.kind]} detail={held.reference || "Required"} icon={ShieldCheck} />
                <GridCell>
                  <Chip tone={state.tone}>{state.label}</Chip>
                </GridCell>
                <GridCell>
                  {canEdit ? (
                    <form action={setCredentialReview.bind(null, person.id, held.id)}>
                      <ActionSelect name="value" defaultValue={held.review} className={control} label="Review">
                        {options(DOCUMENT_REVIEW).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </ActionSelect>
                    </form>
                  ) : (
                    DOCUMENT_REVIEW[held.review].label
                  )}
                </GridCell>
                <GridCell>{held.expires_on ? formatDay(held.expires_on) : "No expiry"}</GridCell>
                <GridCell className="w-10">
                  {canEdit ? (
                    <form action={deleteCredential.bind(null, person.id, held.id)}>
                      <ConfirmSubmit
                        confirm={`Remove ${CREDENTIALS[row.kind]}?`}
                        label={`Remove ${CREDENTIALS[row.kind]}`}
                        className={buttonClass("ghost", "w-7 px-0 text-ink-3")}
                      >
                        <Trash2 size={14} />
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </GridCell>
              </GridRow>
            );
          });
        })}
        {extra.map((held) => {
          const state = CHECKLIST_STATE[checklistState(held.kind, [held])];
          return (
            <GridRow key={held.id}>
              <GridNameCell name={CREDENTIALS[held.kind]} detail={held.reference || "Optional"} icon={ShieldCheck} />
              <GridCell>
                <Chip tone={state.tone}>{state.label}</Chip>
              </GridCell>
              <GridCell>{DOCUMENT_REVIEW[held.review].label}</GridCell>
              <GridCell>{held.expires_on ? formatDay(held.expires_on) : "No expiry"}</GridCell>
              <GridCell className="w-10">
                {canEdit ? (
                  <form action={deleteCredential.bind(null, person.id, held.id)}>
                    <ConfirmSubmit confirm={`Remove ${CREDENTIALS[held.kind]}?`} label={`Remove ${CREDENTIALS[held.kind]}`} className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                      <Trash2 size={14} />
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </GridCell>
            </GridRow>
          );
        })}
      </GridTable>
      {canEdit ? (
        <div className="border-t border-line px-9 py-5">
          <h2 className="text-[13px] font-medium">Required checks</h2>
          <form action={setStaffRequirements.bind(null, person.id)} className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {Object.entries(CREDENTIALS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" name="kind" value={value} defaultChecked={required.includes(value as Enums<"credential_kind">)} />
                {label}
              </label>
            ))}
            <div className="sm:col-span-2">
              <button type="submit" className={buttonClass("secondary")}>
                Save requirements
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export async function LeaveTab({ ctx, staffId, canEdit }: { ctx: WorkspaceContext; staffId: string; canEdit: boolean }) {
  const { data, error } = await ctx.supabase
    .from("staff_leave")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("staff_id", staffId)
    .order("starts_on", { ascending: false });
  if (error) throw error;

  return (
    <>
      <TabBar title={`${data.length} ${data.length === 1 ? "request" : "requests"}`}>
        {canEdit ? (
          <FormDialog trigger={<><Plus /> Leave</>} title="Add leave" action={saveLeave.bind(null, staffId)} submitLabel="Add leave">
            <Field label="Type">
              <Select name="kind" defaultValue="annual">
                {options(LEAVE_KIND).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <Input name="starts_on" type="date" required />
              </Field>
              <Field label="Ends">
                <Input name="ends_on" type="date" required />
              </Field>
            </div>
            <Field label="Reason">
              <Textarea name="reason" rows={3} maxLength={500} />
            </Field>
          </FormDialog>
        ) : null}
      </TabBar>
      {data.length ? (
        <GridTable
          label="Leave"
          footer={`${data.length} ${data.length === 1 ? "request" : "requests"}`}
          columns={[{ label: "Leave" }, { label: "Dates" }, { label: "Status" }, { label: "" }]}
        >
          {data.map((row) => (
            <GridRow key={row.id}>
              <GridNameCell name={LEAVE_KIND[row.kind]} detail={row.reason || undefined} />
              <GridCell>
                {formatDay(row.starts_on)} – {formatDay(row.ends_on)}
              </GridCell>
              <GridCell>
                {canEdit ? (
                  <form action={setLeaveStatus.bind(null, staffId, row.id)}>
                    <ActionSelect name="value" defaultValue={row.status} className={control} label="Leave status">
                      {options(LEAVE_STATUS).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </ActionSelect>
                  </form>
                ) : (
                  <Chip tone={LEAVE_STATUS[row.status].tone}>{LEAVE_STATUS[row.status].label}</Chip>
                )}
              </GridCell>
              <GridCell className="w-10">
                {canEdit ? (
                  <form action={deleteLeave.bind(null, staffId, row.id)}>
                    <ConfirmSubmit confirm="Delete this leave request?" label="Delete leave" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                      <Trash2 size={14} />
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </GridCell>
            </GridRow>
          ))}
        </GridTable>
      ) : (
        <TabEmpty>No leave recorded.</TabEmpty>
      )}
    </>
  );
}

export async function AvailabilityTab({ ctx, staffId, canEdit }: { ctx: WorkspaceContext; staffId: string; canEdit: boolean }) {
  const { data, error } = await ctx.supabase
    .from("staff_availability")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("staff_id", staffId)
    .order("weekday");
  if (error) throw error;
  const byDay = new Map(data.map((row) => [row.weekday, row]));

  return (
    <>
      <TabBar title="Weekly availability">
        {canEdit ? (
          <FormDialog trigger={<><Plus /> Hours</>} title="Set hours" action={saveAvailability.bind(null, staffId)} submitLabel="Save hours">
            <Field label="Day">
              <Select name="weekday" defaultValue="1">
                {WEEKDAYS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <Input name="starts_at" type="time" required />
              </Field>
              <Field label="Ends">
                <Input name="ends_at" type="time" required />
              </Field>
            </div>
          </FormDialog>
        ) : null}
      </TabBar>
      <GridTable label="Availability" footer="Days without hours are unavailable" columns={[{ label: "Day" }, { label: "Hours" }, { label: "" }]}>
        {WEEKDAYS.map((label, i) => {
          const weekday = i + 1;
          const row = byDay.get(weekday);
          return (
            <GridRow key={label}>
              <GridNameCell name={label} />
              <GridCell>{row ? `${clock(row.starts_at)} – ${clock(row.ends_at)}` : null}</GridCell>
              <GridCell className="w-10">
                {canEdit && row ? (
                  <form action={deleteAvailability.bind(null, staffId, weekday)}>
                    <ConfirmSubmit confirm={`Clear ${label}?`} label={`Clear ${label}`} className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                      <Trash2 size={14} />
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </GridCell>
            </GridRow>
          );
        })}
      </GridTable>
    </>
  );
}

const EMPTY_FINANCE = {
  bank_bsb: "",
  bank_account_number: "",
  super_fund: "",
  super_member_number: "",
  tax_file_number: "",
  employing_entity: "",
  employee_code: "",
  location: "",
  primary_cost_centre: "",
  additional_cost_centres: "",
  contract_type: "",
  job_title: "",
  weekly_hours: null as number | null,
  fte_hours: null as number | null,
  max_daily_hours: null as number | null,
};

async function loadFinance(ctx: WorkspaceContext, staffId: string) {
  if (ctx.member.role === "member") return null;
  const { data, error } = await ctx.supabase.from("staff_finance").select("*").eq("workspace_id", ctx.workspace.id).eq("staff_id", staffId).maybeSingle();
  if (error) throw error;
  return data ?? EMPTY_FINANCE;
}

function financeField(staffId: string, finance: NonNullable<Awaited<ReturnType<typeof loadFinance>>>, key: FinanceField, label: string, extra: { type?: string; maxLength?: number } = {}) {
  return (
    <AttributeField
      key={key}
      id={`finance-${key}`}
      label={label}
      input={{ kind: "text", type: extra.type, maxLength: extra.maxLength }}
      defaultValue={finance[key] == null ? "" : String(finance[key])}
      action={setFinanceField.bind(null, staffId, key)}
    />
  );
}

export async function EmploymentTab({ ctx, person }: { ctx: WorkspaceContext; person: Tables<"staff"> }) {
  const finance = await loadFinance(ctx, person.id);
  if (!finance) return <TabEmpty>Only owners and admins can see employment details.</TabEmpty>;
  return (
    <div className="px-9 py-6">
      <div className="max-w-xl">
        {financeField(person.id, finance, "tax_file_number", "Tax file number", { maxLength: 9 })}
        {financeField(person.id, finance, "employing_entity", "Employing entity", { maxLength: 120 })}
        {financeField(person.id, finance, "location", "Location", { maxLength: 120 })}
        {financeField(person.id, finance, "primary_cost_centre", "Primary cost centre", { maxLength: 80 })}
        {financeField(person.id, finance, "additional_cost_centres", "Additional cost centres", { maxLength: 200 })}
        {financeField(person.id, finance, "contract_type", "Contract type", { maxLength: 80 })}
        {financeField(person.id, finance, "job_title", "Job title", { maxLength: 80 })}
        {financeField(person.id, finance, "weekly_hours", "Actual weekly hours", { type: "number" })}
        {financeField(person.id, finance, "fte_hours", "Full-time equivalent weekly hours", { type: "number" })}
        {financeField(person.id, finance, "max_daily_hours", "Maximum daily hours", { type: "number" })}
      </div>
    </div>
  );
}

export async function FinanceTab({ ctx, staffId }: { ctx: WorkspaceContext; staffId: string }) {
  const finance = await loadFinance(ctx, staffId);
  if (!finance) return <TabEmpty>Only owners and admins can see payroll details.</TabEmpty>;
  return (
    <div className="px-9 py-6">
      <div className="max-w-xl">
        {financeField(staffId, finance, "bank_bsb", "BSB", { maxLength: 6 })}
        {financeField(staffId, finance, "bank_account_number", "Account no.", { maxLength: 10 })}
        {financeField(staffId, finance, "super_fund", "Super fund", { maxLength: 120 })}
        {financeField(staffId, finance, "super_member_number", "Member no.", { maxLength: 40 })}
        {financeField(staffId, finance, "employee_code", "Employee code", { maxLength: 40 })}
      </div>
    </div>
  );
}

export function FilesTab({
  credentials,
}: {
  credentials: { id: string; kind: Enums<"credential_kind">; file_name: string; storage_path: string | null }[];
}) {
  const files = credentials.filter((c) => c.storage_path);
  if (!files.length) return <TabEmpty>No files uploaded.</TabEmpty>;
  return (
    <GridTable label="Files" footer={`${files.length} ${files.length === 1 ? "file" : "files"}`} columns={[{ label: "File" }, { label: "Type" }, { label: "" }]}>
      {files.map((file) => (
        <GridRow key={file.id}>
          <GridNameCell name={file.file_name || CREDENTIALS[file.kind]} />
          <GridCell>{CREDENTIALS[file.kind]}</GridCell>
          <GridCell className="w-20">
            {file.storage_path ? (
              <FileLink path={file.storage_path} className={buttonClass("secondary")}>
                Open
              </FileLink>
            ) : null}
          </GridCell>
        </GridRow>
      ))}
    </GridTable>
  );
}
