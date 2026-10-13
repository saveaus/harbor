import Link from "next/link";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Avatar, Card } from "@/components/ui";
import { readableTextColor } from "@/lib/brand";
import { PORTAL_HOME, type PortalLink } from "@/lib/portal-apps";

export type PortalBrand = { name: string; accentColor: string; sidebarColor: string; logoUrl: string | null };
export type PortalTask = { href: string; label: string; detail: string };
export type PortalHomeContent = { bannerUrl: string | null; title: string; body: string; showTasks: boolean; showApps: boolean };

/**
 * The client portal sidebar. Renders the same markup for the live portal and for previews;
 * previews pass `inert` so nothing inside navigates.
 */
export function PortalSidebar({
  brand,
  apps,
  isActive,
  viewer,
  footer,
}: {
  brand: PortalBrand;
  apps: PortalLink[];
  isActive: (href: string) => boolean;
  viewer: { name: string; detail: string };
  footer?: ReactNode;
}) {
  const text = readableTextColor(brand.sidebarColor);
  const dark = text === "#ffffff";
  return (
    <aside
      className="flex w-60 shrink-0 flex-col border-r border-line"
      style={{ backgroundColor: brand.sidebarColor, color: text }}
    >
      <div className="flex h-12 items-center gap-2 px-4">
        <BrandMark name={brand.name} color={brand.accentColor} logoUrl={brand.logoUrl} />
        <span className="truncate text-[13px] font-semibold">{brand.name}</span>
      </div>
      <nav className="flex-1 space-y-px overflow-y-auto px-3 pb-4">
        {[PORTAL_HOME, ...apps].map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex h-7 items-center gap-2 rounded-control px-2 text-[13px] font-medium transition-colors",
                active ? (dark ? "bg-white/15" : "bg-black/[0.06]") : dark ? "opacity-80 hover:bg-white/10 hover:opacity-100" : "opacity-80 hover:bg-black/[0.04] hover:opacity-100",
              )}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className={clsx("flex items-center gap-2 border-t px-3 py-2.5", dark ? "border-white/15" : "border-black/[0.08]")}>
        <Avatar name={viewer.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{viewer.name}</div>
          <div className="truncate text-[11px] opacity-70">{viewer.detail}</div>
        </div>
        {footer}
      </div>
    </aside>
  );
}

/** The client portal home page body, shared by the portal and the team's editor and previews. */
export function PortalHomeView({
  content,
  greetingName,
  workspaceName,
  tasks,
  apps,
}: {
  content: PortalHomeContent;
  greetingName: string;
  workspaceName: string;
  tasks: PortalTask[];
  apps: PortalLink[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {content.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded banner served from Supabase Storage
        <img src={content.bannerUrl} alt="" className="mb-6 aspect-[4/1] w-full rounded-card border border-line object-cover" />
      ) : null}
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">
        {content.title.trim() || `Welcome, ${greetingName || "there"}`}
      </h1>
      <p className="mt-1 text-[13px] whitespace-pre-wrap text-ink-3">
        {content.body.trim() || `Everything you share with ${workspaceName} lives here.`}
      </p>

      {content.showTasks ? (
        <Card className="mt-6">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[13px] font-semibold text-ink">To do</h2>
          </div>
          <ul>
            {tasks.map((task) => (
              <li key={task.href} className="border-b border-line last:border-0">
                <Link href={task.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
                  <span className="flex-1 truncate text-[13px] font-medium text-ink">{task.label}</span>
                  <span className="text-[13px] text-ink-3">{task.detail}</span>
                  <ChevronRight size={14} className="text-ink-4" />
                </Link>
              </li>
            ))}
            {tasks.length === 0 ? <li className="px-4 py-6 text-center text-[13px] text-ink-3">You&apos;re all caught up.</li> : null}
          </ul>
        </Card>
      ) : null}

      {content.showApps && apps.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {apps.map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href} className="rounded-card border border-line-strong bg-canvas p-4 shadow-card hover:bg-surface">
              <span className="flex size-8 items-center justify-center rounded-control bg-accent-soft text-accent">
                <Icon size={15} strokeWidth={1.8} />
              </span>
              <span className="mt-3 block text-[13px] font-medium text-ink">{label}</span>
              <span className="block text-[12px] text-ink-3">{description}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A scaled, non-interactive portal window for previews in the team app. */
export function PortalPreviewFrame({ children, scale = 0.72, height = 560 }: { children: ReactNode; scale?: number; height?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-line-strong bg-canvas shadow-card" style={{ height }}>
      <div className="flex h-7 items-center gap-1.5 border-b border-line bg-surface px-3">
        <span className="size-2 rounded-full bg-line-strong" />
        <span className="size-2 rounded-full bg-line-strong" />
        <span className="size-2 rounded-full bg-line-strong" />
      </div>
      <div inert className="origin-top-left" style={{ transform: `scale(${scale})`, width: `${100 / scale}%`, height: `${(height - 28) / scale}px` }}>
        {children}
      </div>
    </div>
  );
}
