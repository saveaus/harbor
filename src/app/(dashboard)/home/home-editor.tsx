"use client";

import { useActionState, useState } from "react";
import { PortalHomeView, PortalPreviewFrame, PortalSidebar, type PortalBrand, type PortalHomeContent, type PortalTask } from "@/components/portal-view";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import type { AppKey } from "@/lib/apps";
import { brandAccentStyle } from "@/lib/brand";
import { portalApps } from "@/lib/portal-apps";
import { AssetUploader } from "../brand/asset-uploader";
import type { SaveState } from "../brand/actions";
import { updatePortalHome } from "./actions";

function Toggle({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5 text-[13px] text-ink">
      {label}
      <span className="relative inline-flex">
        <input type="checkbox" role="switch" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-4 w-7 rounded-full bg-line-strong transition-colors peer-checked:bg-accent" />
        <span className="absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow-control transition-transform peer-checked:translate-x-3" />
      </span>
    </label>
  );
}

export function HomeEditor({
  workspaceId,
  brand,
  initial,
  tasks,
  installedApps,
  locked,
}: {
  workspaceId: string;
  brand: PortalBrand;
  initial: PortalHomeContent;
  tasks: PortalTask[];
  installedApps: AppKey[];
  locked: boolean;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [showTasks, setShowTasks] = useState(initial.showTasks);
  const [showApps, setShowApps] = useState(initial.showApps);
  const [state, action, pending] = useActionState<SaveState, FormData>(updatePortalHome, {});
  const apps = portalApps(new Set(installedApps), { messages: true, files: true });
  const content = { bannerUrl: initial.bannerUrl, title, body, showTasks, showApps };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-8">
      <PortalPreviewFrame scale={0.68} height={600}>
        <div className="flex h-full" style={brandAccentStyle(brand.accentColor)}>
          <PortalSidebar brand={brand} apps={apps} isActive={(href) => href === "/portal"} viewer={{ name: "Alex Client", detail: "alex@example.com" }} />
          <div className="min-w-0 flex-1 overflow-hidden bg-canvas">
            <div className="flex h-[61px] items-center border-b border-line px-6 text-[14px] font-medium text-ink">Home</div>
            <PortalHomeView content={content} greetingName="Alex" workspaceName={brand.name} tasks={tasks} apps={apps} />
          </div>
        </div>
      </PortalPreviewFrame>

      <aside className="rounded-card border border-line-strong bg-canvas p-4 shadow-card">
        <h2 className="text-[14px] font-medium text-ink">Customization</h2>
        <p className="mt-0.5 text-[12px] text-ink-3">What clients see when they open the portal.</p>
        <div className="mt-4 space-y-4">
          <Field label="Banner" hint="A wide image, about 4:1. Saved as soon as you upload.">
            {locked ? null : (
              <AssetUploader
                workspaceId={workspaceId}
                kind="banner"
                hasImage={Boolean(initial.bannerUrl)}
                preview={
                  initial.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded banner served from Supabase Storage
                    <img src={initial.bannerUrl} alt="" className="h-10 w-full rounded-control border border-line object-cover" />
                  ) : null
                }
              />
            )}
          </Field>
          <form action={action} className="space-y-4">
            <Field label="Title" note="optional">
              <Input
                name="portal_home_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Welcome, {first name}"
                disabled={locked}
              />
            </Field>
            <Field label="Message" note="optional">
              <Textarea
                name="portal_home_body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder={`Everything you share with ${brand.name} lives here.`}
                disabled={locked}
              />
            </Field>
            <div className="border-t border-line pt-3">
              <Toggle name="portal_home_show_tasks" label="Show to-do list" checked={showTasks} onChange={setShowTasks} />
              <Toggle name="portal_home_show_apps" label="Show app shortcuts" checked={showApps} onChange={setShowApps} />
            </div>
            {state.error ? <Alert>{state.error}</Alert> : null}
            {state.saved && !pending ? <Alert tone="success">Client home saved.</Alert> : null}
            {locked ? (
              <p className="text-[12px] text-ink-3">Only owners and admins can change the client home.</p>
            ) : (
              <Button type="submit" variant="primary" disabled={pending} className="w-full">
                Save
              </Button>
            )}
          </form>
        </div>
      </aside>
    </div>
  );
}
