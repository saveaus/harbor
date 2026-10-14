import type { ReactNode } from "react";
import Link from "next/link";
import { Eye, MessageSquare } from "lucide-react";
import { clsx } from "clsx";
import { Button, ButtonLink, PageHeader } from "@/components/ui";
import { APP_ICONS } from "@/lib/app-icons";
import { APPS, DEFAULT_APP_KEYS, LIBRARY_APP_KEYS, type AppKey } from "@/lib/apps";
import { getWorkspace } from "@/lib/workspace";
import { installApp, setAppInstalled } from "../actions";

function Switch({ on, label }: { on: boolean; label: string }) {
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={clsx("relative inline-flex h-4 w-7 items-center rounded-full transition-colors", on ? "bg-accent" : "bg-line-strong")}
    >
      <span className={clsx("size-3 rounded-full bg-white shadow-control transition-transform", on ? "translate-x-3.5" : "translate-x-0.5")} />
    </button>
  );
}

function AppCard({
  name,
  summary,
  icon: Icon,
  action,
  href,
}: {
  name: string;
  summary: string;
  icon: typeof MessageSquare;
  action: ReactNode;
  href?: string;
}) {
  return (
    <div className="flex flex-col rounded-card border border-line-strong bg-canvas p-4 shadow-card">
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-control bg-hover">
          <Icon size={16} strokeWidth={1.8} />
        </span>
        {action}
      </div>
      <span className="mt-3 text-[14px] font-medium text-ink">{name}</span>
      <span className="mt-0.5 flex-1 text-[13px] text-ink-3">{summary}</span>
      {href ? (
        <Link href={href} className="mt-3 text-[13px] font-medium text-ink-3 hover:text-ink">
          Open
        </Link>
      ) : (
        <span className="mt-3 text-[13px] text-ink-4">In the library</span>
      )}
    </div>
  );
}

export default async function AppLibraryPage() {
  const { installedApps, member } = await getWorkspace();
  const locked = member.role === "member";
  const installed = LIBRARY_APP_KEYS.filter((key) => installedApps.has(key));
  const available = LIBRARY_APP_KEYS.filter((key) => !installedApps.has(key));

  return (
    <>
      <PageHeader
        title="App Library"
        actions={
          <ButtonLink href="/apps/manage/preview">
            <Eye /> Client preview
          </ButtonLink>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">
          <h1 className="text-[18px] font-medium text-ink">Apps in your workspace</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Only added apps appear in the sidebar and client portal. Removing an app hides it but keeps its data.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <AppCard
              name="Messages"
              summary="Conversations with every client"
              icon={MessageSquare}
              action={<span className="text-[12px] text-ink-3">Always on</span>}
              href="/messages"
            />
            {DEFAULT_APP_KEYS.map((key) => (
              <AppCard
                key={key}
                name={key === "scheduling" ? "Schedule" : APPS[key].name}
                summary={APPS[key].summary}
                icon={APP_ICONS[key]}
                action={<span className="text-[12px] text-ink-3">Always on</span>}
                href={APPS[key].href}
              />
            ))}
            {installed.map((key) => (
              <AppCard
                key={key}
                name={APPS[key].name}
                summary={APPS[key].summary}
                icon={APP_ICONS[key]}
                href={APPS[key].href}
                action={
                  locked ? null : (
                    <form action={setAppInstalled.bind(null, key, false)}>
                      <Switch on label={`Remove ${APPS[key].name}`} />
                    </form>
                  )
                }
              />
            ))}
          </div>

          {available.length ? (
            <>
              <h2 className="mt-10 text-[18px] font-medium text-ink">Available to add</h2>
              <p className="mt-1 text-[13px] text-ink-3">Add an app when you need it. It will show up for staff and, where relevant, clients.</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {available.map((key) => (
                  <AvailableCard key={key} appKey={key} locked={locked} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function AvailableCard({ appKey, locked }: { appKey: AppKey; locked: boolean }) {
  const app = APPS[appKey];
  const Icon = APP_ICONS[appKey];
  return (
    <AppCard
      name={app.name}
      summary={app.summary}
      icon={Icon}
      action={
        locked ? (
          <span className="text-[12px] text-ink-3">Ask an admin</span>
        ) : (
          <form action={installApp.bind(null, appKey)}>
            <Button type="submit" variant="primary">
              Add
            </Button>
          </form>
        )
      }
    />
  );
}
