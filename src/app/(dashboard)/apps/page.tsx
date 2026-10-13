import Link from "next/link";
import { Boxes } from "lucide-react";
import { Button, PageHeader, buttonClass } from "@/components/ui";
import { APPS, APP_KEYS } from "@/lib/apps";
import { getWorkspace } from "@/lib/workspace";
import { installApp } from "./actions";
import { AddAppBuilder } from "./add-app-builder";

export default async function AddAppPage() {
  const { member, installedApps } = await getWorkspace();
  const firstName = (member.display_name || member.email).split(/[\s@]/)[0];

  return (
    <>
      <PageHeader
        title="Add App"
        actions={
          <Link href="/apps/custom" className={buttonClass("secondary")}>
            <Boxes /> Custom apps
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1000px] px-5 pt-14 pb-16">
          <h1 className="mb-5 text-[22px] font-medium text-ink">{firstName}, what app will you add?</h1>
          <AddAppBuilder />

          <h2 className="mt-12 text-[16px] font-medium text-ink">Browse all apps</h2>
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {APP_KEYS.map((key) => {
              const app = APPS[key];
              return (
                <li key={key} className="flex items-start gap-3 rounded-card border border-line-strong p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-ink">{app.name}</div>
                    <p className="mt-0.5 text-[13px] text-ink-3">{app.summary}</p>
                  </div>
                  {installedApps.has(key) ? (
                    <Link href={app.href} className={buttonClass("secondary")}>
                      Open
                    </Link>
                  ) : (
                    <form action={installApp.bind(null, key)}>
                      <Button type="submit" variant="primary">
                        Add
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
