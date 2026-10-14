import Link from "next/link";
import { ChevronRight, PanelRight, PanelRightClose } from "lucide-react";
import type { ReactNode } from "react";
import { listHref } from "@/lib/list-query";
import { RecordAside } from "./record-aside";
import { Alert, Avatar, Tabs, buttonClass } from "./ui";

type Tab = { key: string; label: string };

/** Which main tab and sidebar tab a profile shows. A null sidebar means the default for the screen size. */
export type ProfileView<T extends string, S extends string> = { tab: T; side: S | "hidden" | null };

export function parseProfileView<T extends string, S extends string>(
  params: { tab?: string; side?: string },
  tabs: readonly T[],
  sides: readonly S[],
): ProfileView<T, S> {
  const tab = tabs.find((t) => t === params.tab) ?? tabs[0];
  const side = params.side === "hidden" ? "hidden" : (sides.find((s) => s === params.side) ?? null);
  return { tab, side };
}

export function profileHref<T extends string, S extends string>(
  path: string,
  tabs: readonly Tab[],
  view: ProfileView<T, S>,
  change: Partial<ProfileView<T, S>> = {},
): string {
  const next = { ...view, ...change };
  return listHref(path, { tab: next.tab === tabs[0].key ? undefined : next.tab, side: next.side ?? undefined });
}

/**
 * A client or staff profile: identity header with quick actions, main tabs, and a collapsible
 * details sidebar with its own tabs.
 */
export function ProfileShell<T extends string, S extends string>({
  path,
  back,
  name,
  status,
  identifier,
  detail,
  actions,
  tabs,
  sideTabs,
  view,
  error,
  sidebar,
  children,
}: {
  path: string;
  back: { href: string; label: string };
  name: string;
  status: ReactNode;
  identifier: string;
  detail: string;
  actions: ReactNode;
  tabs: readonly (Tab & { key: T })[];
  sideTabs: readonly (Tab & { key: S })[];
  view: ProfileView<T, S>;
  error?: string;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const href = (change: Partial<ProfileView<T, S>>) => profileHref(path, tabs, view, change);
  const side = view.side === "hidden" || view.side === null ? sideTabs[0].key : view.side;
  const collapsed = view.side === "hidden";
  return (
    <div className="relative flex min-h-0 flex-1">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[61px] shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
            <Link href={back.href} className="text-ink-3 hover:text-ink">
              {back.label}
            </Link>
            <ChevronRight size={14} className="shrink-0 text-ink-3" />
            <span className="truncate font-medium text-black">{name}</span>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <Link
              href={href({ side: collapsed ? null : "hidden" })}
              scroll={false}
              aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
              title={collapsed ? "Show sidebar" : "Hide sidebar"}
              className={buttonClass("secondary", "w-7 px-0 max-xl:hidden")}
            >
              {collapsed ? <PanelRight size={14} /> : <PanelRightClose size={14} />}
            </Link>
            <Link href={href({ side })} scroll={false} aria-label="Show details" className={buttonClass("secondary", "xl:hidden")}>
              <PanelRight /> Details
            </Link>
          </div>
        </header>

        <div className="flex items-center gap-4 border-b border-line px-9 py-5">
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-[20px] leading-7 font-medium">{name}</h1>
              {status}
              <span className="rounded-control bg-hover px-1.5 text-[12px] leading-5 text-ink-3 tabular-nums">ID {identifier}</span>
            </div>
            {detail ? <p className="mt-0.5 truncate text-[13px] text-ink-3">{detail}</p> : null}
          </div>
        </div>

        <div className="overflow-x-auto [scrollbar-width:none]">
          <Tabs items={tabs.map((t) => ({ href: href({ tab: t.key }), label: t.label }))} active={href({ tab: view.tab })} />
        </div>
        {error ? (
          <div className="mx-9 mt-3">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </section>

      <RecordAside
        label="Profile sidebar"
        tabs={sideTabs.map((t) => ({ href: href({ side: t.key }), label: t.label, active: t.key === side }))}
        open={view.side !== null && !collapsed}
        collapsed={collapsed}
        closeHref={href({ side: null })}
      >
        {sidebar}
      </RecordAside>
    </div>
  );
}

/** A tab's toolbar: a title or search on the left and its actions on the right. */
export function TabBar({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-9 py-2 text-[13px]">
      <div className="min-w-0 font-medium">{title}</div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

/** A tab with nothing in it yet. */
export function TabEmpty({ children }: { children: ReactNode }) {
  return <p className="px-9 py-12 text-center text-[13px] text-ink-3">{children}</p>;
}

/** A labelled block of inline-editable attributes, used in the profile sidebar. */
export function AttributeGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-4 py-4">
      <h3 className="flex h-7 items-center text-[13px] font-medium">{title}</h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

/** The Overview highlight grid used on Imploy client and staff records. */
export function Highlights({ children }: { children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[13px] font-medium">Highlights</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

/** One highlight cell. Empty values stay visible as Missing, the way Imploy does. */
export function Highlight({
  label,
  value,
  href,
  missing = "Missing",
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
  missing?: string;
}) {
  const empty = !value?.trim();
  const body = (
    <>
      <h3 className="text-[12px] font-medium text-ink-3">{label}</h3>
      <p className={`mt-1 text-[13px] ${empty ? "text-ink-3" : "font-medium text-ink"}`}>{empty ? missing : value}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} scroll={false} className="rounded-card border border-line px-4 py-3 hover:bg-hover">
        {body}
      </Link>
    );
  }
  return <div className="rounded-card border border-line px-4 py-3">{body}</div>;
}

/** Overview notes block: recent notes with add and view-all, matching Imploy. */
export function OverviewNotes({ href, add, children }: { href: string; add: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium">Notes</h2>
        <div className="flex items-center gap-2">
          {add}
          <Link href={href} scroll={false} className="text-[12px] text-ink-3 hover:text-ink">
            View all
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
}
