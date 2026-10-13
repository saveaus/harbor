"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Bell,
  BookOpen,
  Boxes,
  ChevronDown,
  ClipboardList,
  Clock,
  CreditCard,
  FileSignature,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  SlidersHorizontal,
  SquareUser,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { APPS, APP_KEYS, type AppKey } from "@/lib/apps";

const appIcons: Record<AppKey, LucideIcon> = {
  files: FileText,
  payments: CreditCard,
  contracts: FileSignature,
  forms: ClipboardList,
  helpdesk: BookOpen,
  timetracker: Clock,
};

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
  exact,
  muted,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  exact?: boolean;
  muted?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      className={clsx(
        "mx-2 flex h-[30px] items-center gap-3 rounded-nav px-2 text-[13px] tracking-[-0.05px] transition-colors",
        !muted || active ? "text-ink" : null,
        active ? "bg-hover" : "hover:bg-line",
        muted && !active && "text-ink-3 hover:text-ink",
      )}
    >
      <Icon size={14} strokeWidth={2} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? <span className="rounded-full bg-ink px-1.5 text-[11px] leading-4 font-medium text-white">{badge}</span> : null}
    </Link>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <h2 className="px-4 py-2 text-[12px] leading-5 font-medium text-ink-3">{label}</h2>
      {children}
    </div>
  );
}

export function Sidebar({
  workspaceName,
  brandColor,
  logoUrl,
  installedApps,
  customApps,
  unreadNotifications,
  signOut,
}: {
  workspaceName: string;
  brandColor: string;
  logoUrl: string | null;
  installedApps: AppKey[];
  customApps: { id: string; name: string }[];
  unreadNotifications: number;
  signOut: () => Promise<void>;
}) {
  const installed = new Set(installedApps);
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-2 pt-5 pb-3.5">
        <Link href="/settings/general" className="inline-flex h-8 max-w-full items-center gap-2.5 rounded-nav px-2 hover:bg-line">
          <BrandMark name={workspaceName} color={brandColor} logoUrl={logoUrl} />
          <span className="truncate text-[13px] font-medium">{workspaceName}</span>
          <ChevronDown size={14} className="shrink-0" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto pb-4">
        <NavItem href="/crm" label="CRM" icon={SquareUser} />
        <NavItem href="/team" label="Team" icon={Users} />
        <NavItem href="/notifications" label="Notifications" icon={Bell} badge={unreadNotifications} />

        <Group label="Apps">
          <NavItem href="/home" label="Home" icon={Home} />
          <NavItem href="/messages" label="Messages" icon={MessageSquare} />
          {APP_KEYS.filter((key) => installed.has(key)).map((key) => (
            <NavItem key={key} href={APPS[key].href} label={APPS[key].name} icon={appIcons[key]} />
          ))}
          {customApps.map((app) => (
            <NavItem key={app.id} href={`/apps/custom/${app.id}`} label={app.name} icon={Boxes} />
          ))}
          <NavItem href="/apps" label="Add App" icon={Plus} exact muted />
        </Group>

        <Group label="Customize">
          <NavItem href="/brand" label="Brand" icon={LayoutGrid} />
          <NavItem href="/apps/manage" label="Apps" icon={SlidersHorizontal} />
          <NavItem href="/automations" label="Automations" icon={Workflow} />
        </Group>
      </nav>

      <div className="flex items-center gap-1 px-2 py-2">
        <Link
          href="/settings/general"
          aria-label="Settings"
          className="flex size-7 items-center justify-center rounded-full text-ink hover:bg-line"
        >
          <Settings size={15} strokeWidth={2} />
        </Link>
        <form action={signOut}>
          <button type="submit" aria-label="Sign out" className="flex size-7 items-center justify-center rounded-full text-ink hover:bg-line">
            <LogOut size={15} strokeWidth={2} />
          </button>
        </form>
      </div>
    </aside>
  );
}
