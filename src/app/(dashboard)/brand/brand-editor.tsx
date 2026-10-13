"use client";

import { useActionState, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { PortalHomeView, PortalPreviewFrame, PortalSidebar, type PortalHomeContent, type PortalTask } from "@/components/portal-view";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { AppKey } from "@/lib/apps";
import { brandAccentStyle } from "@/lib/brand";
import { portalApps } from "@/lib/portal-apps";
import { updateBrand, type SaveState } from "./actions";
import { AssetUploader } from "./asset-uploader";

const SIDEBAR_PRESETS = ["#f7f7f8", "#ffffff", "#18181b", "#0f2a4a"];

function ColorField({ name, label, hint, value, onChange, presets }: {
  name: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  presets?: string[];
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-12 cursor-pointer rounded-control border border-line-strong bg-canvas p-0.5"
        />
        <span className="w-16 font-mono text-[12px] text-ink-3">{value}</span>
        {presets?.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`Use ${preset}`}
            onClick={() => onChange(preset)}
            className="size-6 rounded-full border border-line-strong"
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>
    </Field>
  );
}

export function BrandEditor({
  workspaceId,
  initial,
  logoUrl,
  home,
  tasks,
  installedApps,
  locked,
}: {
  workspaceId: string;
  initial: { name: string; accentColor: string; sidebarColor: string };
  logoUrl: string | null;
  home: PortalHomeContent;
  tasks: PortalTask[];
  installedApps: AppKey[];
  locked: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [sidebarColor, setSidebarColor] = useState(initial.sidebarColor);
  const [state, action, pending] = useActionState<SaveState, FormData>(updateBrand, {});
  const brand = { name: name || initial.name, accentColor, sidebarColor, logoUrl };

  return (
    <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-10">
      <form action={action} className="space-y-6">
        <Field label="Brand name" hint="The name clients know you by. It doesn't have to be your legal name.">
          <Input name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required disabled={locked} />
        </Field>
        <Field label="Logo" hint="PNG, JPEG or WebP up to 2 MB. Square images look best. Saved as soon as you upload.">
          {locked ? (
            <BrandMark name={brand.name} color={accentColor} logoUrl={logoUrl} size="lg" />
          ) : (
            <AssetUploader
              workspaceId={workspaceId}
              kind="logo"
              hasImage={Boolean(logoUrl)}
              preview={<BrandMark name={brand.name} color={accentColor} logoUrl={logoUrl} size="lg" />}
            />
          )}
        </Field>
        <ColorField
          name="brand_color"
          label="Accent color"
          hint="Buttons, links and highlights in the portal."
          value={accentColor}
          onChange={setAccentColor}
        />
        <ColorField
          name="portal_sidebar_color"
          label="Sidebar color"
          hint="Text switches to light or dark automatically."
          value={sidebarColor}
          onChange={setSidebarColor}
          presets={SIDEBAR_PRESETS}
        />
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.saved && !pending ? <Alert tone="success">Brand saved.</Alert> : null}
        {locked ? (
          <p className="text-[13px] text-ink-3">Only workspace owners and admins can change the brand.</p>
        ) : (
          <div className="flex justify-end border-t border-line pt-5">
            <Button type="submit" variant="primary" disabled={pending}>
              Save brand
            </Button>
          </div>
        )}
      </form>

      <div>
        <div className="mb-2 text-[12px] font-medium text-ink-3">Client portal preview</div>
        <PortalPreviewFrame>
          <div className="flex h-full" style={brandAccentStyle(accentColor)}>
            <PortalSidebar
              brand={brand}
              apps={portalApps(new Set(installedApps), { messages: true, files: true })}
              isActive={(href) => href === "/portal"}
              viewer={{ name: "Alex Client", detail: "alex@example.com" }}
            />
            <div className="min-w-0 flex-1 overflow-hidden bg-canvas">
              <div className="flex h-[61px] items-center border-b border-line px-6 text-[14px] font-medium text-ink">Home</div>
              <PortalHomeView
                content={home}
                greetingName="Alex"
                workspaceName={brand.name}
                tasks={tasks}
                apps={portalApps(new Set(installedApps), { messages: true, files: true })}
              />
            </div>
          </div>
        </PortalPreviewFrame>
      </div>
    </div>
  );
}
