import Link from "next/link";
import { Boxes, Check } from "lucide-react";
import { clsx } from "clsx";
import { Badge, Button, PageHeader, buttonClass } from "@/components/ui";
import { APPS, APP_KEYS, parseAppKey } from "@/lib/apps";
import { getWorkspace } from "@/lib/workspace";
import { installApp } from "./actions";

export default async function AppLibraryPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app } = await searchParams;
  const { installedApps } = await getWorkspace();
  const selected = APPS[parseAppKey(app ?? "") ?? APP_KEYS.find((key) => !installedApps.has(key)) ?? "files"];
  const isInstalled = installedApps.has(selected.key);

  return (
    <>
      <PageHeader
        title="App library"
        actions={
          <Link href="/apps/custom" className={buttonClass("secondary")}>
            <Boxes size={14} /> Custom apps
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1">
        <ul className="w-80 shrink-0 overflow-y-auto border-r border-line p-3">
          {APP_KEYS.map((key) => (
            <li key={key}>
              <Link
                href={`/apps?app=${key}`}
                className={clsx(
                  "flex items-start gap-3 rounded-card px-3 py-2.5",
                  key === selected.key ? "bg-hover" : "hover:bg-surface",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13px] font-medium">
                    {APPS[key].name}
                    {installedApps.has(key) ? <Check size={13} className="text-success" /> : null}
                  </div>
                  <div className="truncate text-[12px] text-ink-3">{APPS[key].summary}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <article className="flex-1 overflow-y-auto px-10 py-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-tight">{selected.name}</h1>
              {isInstalled ? <Badge tone="success">Installed</Badge> : null}
            </div>
            <p className="mt-1 text-[14px] text-ink-3">{selected.summary}</p>
            <p className="mt-5 text-[14px] leading-relaxed text-ink-2">{selected.detail}</p>
            <div className="mt-6">
              {isInstalled ? (
                <Link href={selected.href} className={buttonClass("secondary")}>
                  Open {selected.name}
                </Link>
              ) : (
                <form action={installApp.bind(null, selected.key)}>
                  <Button type="submit" variant="primary">
                    Add {selected.name}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
