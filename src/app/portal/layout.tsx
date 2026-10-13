import { Suspense } from "react";
import { signOut } from "@/app/auth-actions";
import { brandAccentStyle, logoUrl } from "@/lib/brand";
import { contactName } from "@/lib/format";
import { getPortal } from "@/lib/portal";
import { PortalNav } from "./portal-nav";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-full"><aside className="w-60 shrink-0 border-r border-line bg-surface" /></div>}>
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}

async function PortalShell({ children }: { children: React.ReactNode }) {
  const { workspace, contact, company, installedApps, channels } = await getPortal();
  return (
    <div className="flex h-full" style={brandAccentStyle(workspace.brand_color)}>
      <PortalNav
        workspaceName={workspace.name}
        brandColor={workspace.brand_color}
        logoUrl={logoUrl(workspace.logo_path)}
        viewerName={contactName(contact)}
        viewerDetail={company?.name ?? contact.email}
        installedApps={[...installedApps]}
        hasMessages={channels.messages !== null}
        hasFiles={channels.files !== null}
        signOut={signOut}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
