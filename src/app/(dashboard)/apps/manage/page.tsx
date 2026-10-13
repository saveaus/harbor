import { Badge, Button, ButtonLink, Card, PageHeader } from "@/components/ui";
import { APPS, APP_KEYS } from "@/lib/apps";
import { getWorkspace } from "@/lib/workspace";
import { installApp, uninstallApp } from "../actions";

export default async function ManageAppsPage() {
  const { installedApps } = await getWorkspace();
  return (
    <>
      <PageHeader title="App settings" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-[18px] font-semibold">Apps in your portal</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Messages is always on. Removing an app hides it for your team and clients but keeps its data.
          </p>
          <Card className="mt-5">
            <ul>
              <li className="flex items-center gap-3 border-b border-line px-4 py-3">
                <div className="flex-1">
                  <div className="text-[13px] font-medium">Messages</div>
                  <div className="text-[12px] text-ink-3">Conversations with every client</div>
                </div>
                <Badge>Built in</Badge>
              </li>
              {APP_KEYS.map((key) => {
                const installed = installedApps.has(key);
                return (
                  <li key={key} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">{APPS[key].name}</div>
                      <div className="text-[12px] text-ink-3">{APPS[key].summary}</div>
                    </div>
                    {installed ? (
                      <>
                        <ButtonLink href={APPS[key].href}>Open</ButtonLink>
                        <form action={uninstallApp.bind(null, key)}>
                          <Button type="submit" variant="danger">
                            Remove
                          </Button>
                        </form>
                      </>
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
          </Card>
        </div>
      </div>
    </>
  );
}
