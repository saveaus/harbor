import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { signOut } from "@/app/auth-actions";
import { logoUrl } from "@/lib/brand";
import { getWorkspace } from "@/lib/workspace";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <Suspense fallback={<ShellSkeleton />}>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </div>
  );
}

async function DashboardShell({ children }: { children: React.ReactNode }) {
  const { supabase, workspace, installedApps } = await getWorkspace();
  const [unread, customApps] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .is("read_at", null),
    supabase.from("custom_apps").select("id, name").eq("workspace_id", workspace.id).order("name"),
  ]);
  if (unread.error) throw unread.error;
  if (customApps.error) throw customApps.error;

  return (
    <>
      <Sidebar
        workspaceName={workspace.name}
        brandColor={workspace.brand_color}
        logoUrl={logoUrl(workspace.logo_path)}
        installedApps={[...installedApps]}
        customApps={customApps.data}
        unreadNotifications={unread.count ?? 0}
        signOut={signOut}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </>
  );
}

function ShellSkeleton() {
  return (
    <>
      <aside className="w-[300px] shrink-0 border-r border-line bg-surface p-3">
        <div className="h-6 w-32 animate-pulse rounded-control bg-hover" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-5 animate-pulse rounded-control bg-hover" />
          ))}
        </div>
      </aside>
      <main className="flex-1">
        <div className="h-[61px] border-b border-line" />
      </main>
    </>
  );
}
