import { notFound } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { ActivityLog } from "@/components/activity-log";
import { Menu } from "@/components/menu";
import { ProfileShell, parseProfileView, profileHref } from "@/components/profile";
import { NewNoteButton } from "@/components/record-notes";
import { StatusPicker } from "@/components/status-picker";
import { buttonClass } from "@/components/ui";
import { CLIENT_STATUS, planEndTone } from "@/lib/care";
import { formatDay, personName } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { deleteClient, setClientField } from "../actions";
import { ClientDetails } from "../profile/details";
import { BudgetTab, CareTab, ContactsTab, FilesTab, NotesTab, ObserveTab, OverviewTab, RosterSide, TasksTab, TeamSide } from "../profile/tabs";
import { deleteClientWarning } from "../status";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "notes", label: "Notes" },
  { key: "budget", label: "Budget" },
  { key: "care", label: "Care plan" },
  { key: "observe", label: "Observe" },
  { key: "tasks", label: "Tasks" },
  { key: "files", label: "Files" },
  { key: "contacts", label: "Contacts" },
] as const;

const SIDES = [
  { key: "details", label: "Details" },
  { key: "activity", label: "Activity" },
  { key: "roster", label: "Roster" },
] as const;

export default async function ClientPage({
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
  const { supabase, workspace } = ctx;
  const contactResult = await supabase
    .from("contacts")
    .select("*, profile:client_profiles(*)")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (contactResult.error) throw contactResult.error;
  const contact = contactResult.data;
  if (!contact) notFound();
  const profile = contact.profile;
  if (!profile) notFound();

  const name = personName(contact);
  const path = `/clients/${contact.id}`;
  const href = (change: Partial<typeof view>) => profileHref(path, TABS, view, change);
  const endTone = planEndTone(profile.plan_end);
  const noteType = query.ntype === "general" || query.ntype === "appointment" ? query.ntype : null;
  const side = view.side === "hidden" || view.side === null ? "details" : view.side;

  return (
    <ProfileShell
      path={path}
      back={{ href: "/clients", label: "Clients" }}
      name={name}
      status={
        <StatusPicker
          value={profile.status}
          options={Object.entries(CLIENT_STATUS).map(([value, option]) => ({ value, ...option }))}
          action={setClientField.bind(null, contact.id, "status")}
          confirm={{ archived: `Archive ${name}? They leave active lists and plans.` }}
        />
      }
      identifier={String(profile.client_number).padStart(6, "0")}
      detail={[
        contact.email,
        profile.ndis_number ? `NDIS ${profile.ndis_number}` : null,
        profile.plan_end && endTone ? `Plan ends ${formatDay(profile.plan_end)}` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      actions={
        <>
          <NewNoteButton ctx={ctx} subject={{ kind: "client", id: contact.id }} variant="secondary" />
          <Menu
            label={`Actions for ${name}`}
            triggerClassName={buttonClass("secondary", "w-7 px-0")}
            trigger={<MoreHorizontal size={14} />}
            items={[
              {
                label: "Delete client",
                action: deleteClient.bind(null, contact.id),
                danger: true,
                confirm: deleteClientWarning(name),
              },
            ]}
          />
        </>
      }
      tabs={TABS}
      sideTabs={SIDES}
      view={view}
      error={query.error}
      sidebar={
        side === "activity" ? (
          <ActivityLog ctx={ctx} subjectId={contact.id} />
        ) : side === "roster" ? (
          <RosterSide ctx={ctx} contactId={contact.id} />
        ) : (
          <>
            <ClientDetails ctx={ctx} contact={contact} profile={profile} />
            <TeamSide ctx={ctx} contactId={contact.id} required={profile.required_credentials} />
          </>
        )
      }
    >
      {view.tab === "notes" ? (
        <NotesTab
          ctx={ctx}
          contactId={contact.id}
          query={query.nq ?? ""}
          type={noteType}
          keep={{ tab: "notes", ...(view.side ? { side: view.side } : {}) }}
        />
      ) : view.tab === "budget" ? (
        <BudgetTab ctx={ctx} contactId={contact.id} />
      ) : view.tab === "care" ? (
        <CareTab ctx={ctx} contactId={contact.id} />
      ) : view.tab === "observe" ? (
        <ObserveTab ctx={ctx} contactId={contact.id} />
      ) : view.tab === "tasks" ? (
        <TasksTab ctx={ctx} contactId={contact.id} />
      ) : view.tab === "files" ? (
        <FilesTab ctx={ctx} contactId={contact.id} />
      ) : view.tab === "contacts" ? (
        <ContactsTab ctx={ctx} contactId={contact.id} />
      ) : (
        <OverviewTab ctx={ctx} contact={contact} profile={profile} href={href} />
      )}
    </ProfileShell>
  );
}
