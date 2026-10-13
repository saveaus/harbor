import { PortalHomeView, PortalPreviewFrame, PortalSidebar } from "@/components/portal-view";
import { Button, ButtonLink, EmptyState, PageHeader, Select } from "@/components/ui";
import { Eye } from "lucide-react";
import { brandAccentStyle, brandAssetUrl } from "@/lib/brand";
import { contactName } from "@/lib/format";
import { portalApps } from "@/lib/portal-apps";
import { loadPortalTasks, portalHomeContent } from "@/lib/portal-home";
import { getWorkspace } from "@/lib/workspace";

export default async function ContactPreviewPage({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const [{ contact: requested }, ctx] = await Promise.all([searchParams, getWorkspace()]);
  const { supabase, workspace, installedApps } = ctx;

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, company_id, company:companies(name)")
    .eq("workspace_id", workspace.id)
    .order("first_name");
  if (error) throw error;
  const contact = contacts.find((c) => c.id === requested) ?? contacts[0];

  if (!contact)
    return (
      <>
        <PageHeader title="Contact preview" />
        <EmptyState
          icon={<Eye size={16} />}
          title="No clients to preview"
          body="Add a client to see the portal the way they will."
          action={<ButtonLink href="/crm">Go to CRM</ButtonLink>}
        />
      </>
    );

  const channelQuery = supabase.from("channels").select("kind").eq("workspace_id", workspace.id);
  const [channels, tasks] = await Promise.all([
    contact.company_id ? channelQuery.eq("company_id", contact.company_id) : channelQuery.eq("contact_id", contact.id),
    loadPortalTasks(supabase, workspace.id, installedApps, { contactId: contact.id, companyId: contact.company_id }),
  ]);
  if (channels.error) throw channels.error;
  const apps = portalApps(installedApps, {
    messages: channels.data.some((c) => c.kind === "messages"),
    files: channels.data.some((c) => c.kind === "files"),
  });
  const brand = {
    name: workspace.name,
    accentColor: workspace.brand_color,
    sidebarColor: workspace.portal_sidebar_color,
    logoUrl: brandAssetUrl(workspace.logo_path),
  };

  return (
    <>
      <PageHeader title="Contact preview" actions={<ButtonLink href="/apps/manage">Back to App Library</ButtonLink>} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-8 py-6">
          <form className="mb-4 flex items-center gap-2">
            <span className="text-[13px] text-ink-3">Viewing as</span>
            <Select name="contact" defaultValue={contact.id} className="max-w-80">
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactName(c)}
                  {c.company ? ` (${c.company.name})` : ""}
                </option>
              ))}
            </Select>
            <Button type="submit">Preview</Button>
          </form>
          <PortalPreviewFrame scale={0.8} height={620}>
            <div className="flex h-full" style={brandAccentStyle(brand.accentColor)}>
              <PortalSidebar
                brand={brand}
                apps={apps}
                isActive={(href) => href === "/portal"}
                viewer={{ name: contactName(contact), detail: contact.company?.name ?? contact.email }}
              />
              <div className="min-w-0 flex-1 overflow-hidden bg-canvas">
                <div className="flex h-[61px] items-center border-b border-line px-6 text-[14px] font-medium text-ink">Home</div>
                <PortalHomeView
                  content={portalHomeContent(workspace)}
                  greetingName={contact.first_name}
                  workspaceName={workspace.name}
                  tasks={tasks}
                  apps={apps}
                />
              </div>
            </div>
          </PortalPreviewFrame>
        </div>
      </div>
    </>
  );
}
