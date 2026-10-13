"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BookOpen, ClipboardList, CreditCard, FileSignature, FolderClosed, Home, LogOut, MessageSquare, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Avatar } from "@/components/ui";
import { APP_KEYS, type AppKey } from "@/lib/apps";

type PortalLink = { href: string; label: string; icon: LucideIcon };

/** Apps clients use in the portal. Time tracker is internal to the team. */
const portalApps: Partial<Record<AppKey, PortalLink>> = {
  payments: { href: "/portal/invoices", label: "Invoices", icon: CreditCard },
  contracts: { href: "/portal/contracts", label: "Contracts", icon: FileSignature },
  forms: { href: "/portal/forms", label: "Forms", icon: ClipboardList },
  helpdesk: { href: "/portal/help", label: "Help", icon: BookOpen },
};

function NavLink({ href, label, icon: Icon, exact }: PortalLink & { exact?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      className={clsx(
        "flex h-7 items-center gap-2 rounded-control px-2 text-[13px] font-medium transition-colors",
        active ? "bg-hover text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      <Icon size={15} strokeWidth={1.8} className={active ? "text-ink" : "text-ink-3"} />
      {label}
    </Link>
  );
}

export function PortalNav({
  workspaceName,
  brandColor,
  logoUrl,
  viewerName,
  viewerDetail,
  installedApps,
  hasMessages,
  hasFiles,
  signOut,
}: {
  workspaceName: string;
  brandColor: string;
  logoUrl: string | null;
  viewerName: string;
  viewerDetail: string;
  installedApps: AppKey[];
  hasMessages: boolean;
  hasFiles: boolean;
  signOut: () => Promise<void>;
}) {
  const installed = new Set(installedApps);
  const links = APP_KEYS.filter((key) => installed.has(key)).flatMap((key) => portalApps[key] ?? []);
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-12 items-center gap-2 px-4">
        <BrandMark name={workspaceName} color={brandColor} logoUrl={logoUrl} />
        <span className="truncate text-[13px] font-semibold">{workspaceName}</span>
      </div>
      <nav className="flex-1 space-y-px overflow-y-auto px-3 pb-4">
        <NavLink href="/portal" label="Home" icon={Home} exact />
        {hasMessages ? <NavLink href="/portal/messages" label="Messages" icon={MessageSquare} /> : null}
        {hasFiles && installedApps.includes("files") ? <NavLink href="/portal/files" label="Files" icon={FolderClosed} /> : null}
        {links.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </nav>
      <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
        <Avatar name={viewerName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{viewerName}</div>
          <div className="truncate text-[11px] text-ink-3">{viewerDetail}</div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex size-7 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink"
          >
            <LogOut size={15} strokeWidth={1.8} />
          </button>
        </form>
      </div>
    </aside>
  );
}
