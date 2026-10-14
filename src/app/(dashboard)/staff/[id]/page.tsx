import { notFound } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { ActivityLog } from "@/components/activity-log";
import { Menu } from "@/components/menu";
import { ProfileShell, parseProfileView, profileHref } from "@/components/profile";
import { NewNoteButton } from "@/components/record-notes";
import { StatusPicker } from "@/components/status-picker";
import { buttonClass } from "@/components/ui";
import { STAFF_STATUS, compliance, complianceSummary } from "@/lib/care";
import { personName } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { deleteStaff, setStaffField } from "../actions";
import { StaffDetails } from "../profile/details";
import {
  AddLeaveButton,
  AvailabilityTab,
  ComplianceTab,
  EmploymentTab,
  FilesTab,
  FinanceTab,
  LeaveTab,
  StaffNotes,
  StaffOverview,
} from "../profile/tabs";
import { accessLabel, loadAccessDirectory, staffAccess } from "../staff-access";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "notes", label: "Notes" },
  { key: "compliance", label: "Compliance" },
  { key: "files", label: "Files" },
  { key: "leave", label: "Leave" },
  { key: "availability", label: "Availability" },
  { key: "employment", label: "Employment" },
  { key: "finance", label: "Finance" },
  { key: "activity", label: "Activity" },
] as const;

const SIDES = [{ key: "details", label: "Details" }] as const;

export default async function StaffRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; side?: string; error?: string; nq?: string; ntype?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const view = parseProfileView(
    query,
    TABS.map((t) => t.key),
    SIDES.map((s) => s.key),
  );
  const ctx = await getWorkspace();
  const { supabase, workspace, member } = ctx;
  const [staffResult, directory] = await Promise.all([
    supabase
      .from("staff")
      .select("*, staff_credentials(id, kind, reference, expires_on, review, file_name, storage_path)")
      .eq("workspace_id", workspace.id)
      .eq("id", id)
      .maybeSingle(),
    loadAccessDirectory(ctx),
  ]);
  if (staffResult.error) throw staffResult.error;
  const person = staffResult.data;
  if (!person) notFound();

  const name = personName(person);
  const canEdit = member.role !== "member";
  const access = staffAccess(person, directory);
  const summary = complianceSummary(compliance(person.staff_credentials, person.required_credentials));
  const path = `/staff/${person.id}`;
  const href = (change: Partial<typeof view>) => profileHref(path, TABS, view, change);
  const noteType = query.ntype === "general" || query.ntype === "appointment" ? query.ntype : null;

  return (
    <ProfileShell
      path={path}
      back={{ href: "/staff", label: "Staff" }}
      name={name}
      status={
        <StatusPicker
          value={person.status}
          options={Object.entries(STAFF_STATUS).map(([value, option]) => ({ value, ...option }))}
          action={setStaffField.bind(null, person.id, "status")}
          readOnly={!canEdit}
        />
      }
      identifier={String(person.staff_number).padStart(6, "0")}
      detail={[person.position, person.email, summary.label].filter(Boolean).join(" · ")}
      actions={
        <>
          <NewNoteButton ctx={ctx} subject={{ kind: "staff", id: person.id }} variant="secondary" />
          {canEdit ? <AddLeaveButton staffId={person.id} /> : null}
          {canEdit && !person.user_id ? (
            <Menu
              label={`Actions for ${name}`}
              triggerClassName={buttonClass("secondary", "w-7 px-0")}
              trigger={<MoreHorizontal size={14} />}
              items={[
                {
                  label: "Delete staff member",
                  action: deleteStaff.bind(null, person.id),
                  danger: true,
                  confirm: `Delete ${name}? Their checks will be removed and their clients will have no key worker. This can't be undone.`,
                },
              ]}
            />
          ) : null}
        </>
      }
      tabs={TABS}
      sideTabs={SIDES}
      view={view}
      error={query.error}
      sidebar={<StaffDetails person={person} access={access} canEdit={canEdit} />}
    >
      {view.tab === "notes" ? (
        <StaffNotes ctx={ctx} staffId={person.id} query={query.nq ?? ""} type={noteType} keep={{ tab: "notes", ...(view.side ? { side: view.side } : {}) }} />
      ) : view.tab === "compliance" ? (
        <ComplianceTab ctx={ctx} person={person} canEdit={canEdit} />
      ) : view.tab === "files" ? (
        <FilesTab credentials={person.staff_credentials} />
      ) : view.tab === "leave" ? (
        <LeaveTab ctx={ctx} staffId={person.id} canEdit={canEdit} />
      ) : view.tab === "availability" ? (
        <AvailabilityTab ctx={ctx} staffId={person.id} canEdit={canEdit} />
      ) : view.tab === "employment" ? (
        <EmploymentTab ctx={ctx} person={person} />
      ) : view.tab === "finance" ? (
        <FinanceTab ctx={ctx} staffId={person.id} />
      ) : view.tab === "activity" ? (
        <ActivityLog ctx={ctx} subjectId={person.id} />
      ) : (
        <StaffOverview ctx={ctx} person={person} href={href} access={accessLabel(access).label} />
      )}
    </ProfileShell>
  );
}
