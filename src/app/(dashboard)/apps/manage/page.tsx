import Link from "next/link";
import { Eye, MessageSquare } from "lucide-react";
import { clsx } from "clsx";
import { ButtonLink, PageHeader } from "@/components/ui";
import { APP_ICONS } from "@/lib/app-icons";
import { APPS, APP_KEYS } from "@/lib/apps";
import { getWorkspace } from "@/lib/workspace";
import { setAppInstalled } from "../actions";

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

export default async function AppLibraryPage() {
  const { installedApps, member } = await getWorkspace();
  const locked = member.role === "member";
  return (
    <>
      <PageHeader
        title="App Library"
        actions={
          <ButtonLink href="/apps/manage/preview">
            <Eye /> Contact preview
          </ButtonLink>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">
          <h1 className="text-[18px] font-medium text-ink">Apps in your portal</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Turn apps on to show them to your team and clients. Turning an app off hides it but keeps its data.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="flex flex-col rounded-card border border-line-strong bg-canvas p-4 shadow-card">
              <div className="flex items-start justify-between">
                <span className="flex size-9 items-center justify-center rounded-control bg-hover">
                  <MessageSquare size={16} strokeWidth={1.8} />
                </span>
                <span className="text-[12px] text-ink-3">Always on</span>
              </div>
              <span className="mt-3 text-[14px] font-medium text-ink">Messages</span>
              <span className="mt-0.5 text-[13px] text-ink-3">Conversations with every client</span>
            </div>
            {APP_KEYS.map((key) => {
              const installed = installedApps.has(key);
              const Icon = APP_ICONS[key];
              return (
                <div key={key} className="flex flex-col rounded-card border border-line-strong bg-canvas p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <span className="flex size-9 items-center justify-center rounded-control bg-hover">
                      <Icon size={16} strokeWidth={1.8} />
                    </span>
                    {locked ? null : (
                      <form action={setAppInstalled.bind(null, key, !installed)}>
                        <Switch on={installed} label={installed ? `Turn off ${APPS[key].name}` : `Turn on ${APPS[key].name}`} />
                      </form>
                    )}
                  </div>
                  <span className="mt-3 text-[14px] font-medium text-ink">{APPS[key].name}</span>
                  <span className="mt-0.5 flex-1 text-[13px] text-ink-3">{APPS[key].summary}</span>
                  {installed ? (
                    <Link href={APPS[key].href} className="mt-3 text-[13px] font-medium text-link hover:underline">
                      Open
                    </Link>
                  ) : (
                    <span className="mt-3 text-[13px] text-ink-4">Off</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
