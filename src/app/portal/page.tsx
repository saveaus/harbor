import { PortalHomeView } from "@/components/portal-view";
import { PageHeader } from "@/components/ui";
import { getPortal } from "@/lib/portal";
import { portalApps } from "@/lib/portal-apps";
import { loadPortalTasks, portalHomeContent } from "@/lib/portal-home";

export default async function PortalHomePage() {
  const { supabase, contact, workspace, installedApps, channels } = await getPortal();
  const tasks = await loadPortalTasks(supabase, workspace.id, installedApps, { contactId: contact.id, companyId: contact.company_id });
  return (
    <>
      <PageHeader title="Home" />
      <div className="flex-1 overflow-y-auto">
        <PortalHomeView
          content={portalHomeContent(workspace)}
          greetingName={contact.first_name}
          workspaceName={workspace.name}
          tasks={tasks}
          apps={portalApps(installedApps, { messages: channels.messages !== null, files: channels.files !== null })}
        />
      </div>
    </>
  );
}
