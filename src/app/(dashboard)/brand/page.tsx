import { PageHeader } from "@/components/ui";
import { brandAssetUrl } from "@/lib/brand";
import { portalHomeContent, sampleTasks } from "@/lib/portal-home";
import { getWorkspace } from "@/lib/workspace";
import { BrandEditor } from "./brand-editor";

export default async function BrandPage() {
  const { workspace, member, installedApps } = await getWorkspace();
  return (
    <>
      <PageHeader title="Brand" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-8 py-8">
          <BrandEditor
            workspaceId={workspace.id}
            initial={{ name: workspace.name, accentColor: workspace.brand_color, sidebarColor: workspace.portal_sidebar_color }}
            logoUrl={brandAssetUrl(workspace.logo_path)}
            home={portalHomeContent(workspace)}
            tasks={sampleTasks(workspace.currency)}
            installedApps={[...installedApps]}
            locked={member.role === "member"}
          />
        </div>
      </div>
    </>
  );
}
