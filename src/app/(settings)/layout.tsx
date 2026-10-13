import { Suspense } from "react";
import { SettingsSidebar } from "./settings/settings-sidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <SettingsSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="h-[61px] shrink-0 border-b border-line" />
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[756px] px-16 pt-10 pb-16">
            <Suspense fallback={<div className="h-7 w-48 animate-pulse rounded-control bg-hover" />}>{children}</Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
