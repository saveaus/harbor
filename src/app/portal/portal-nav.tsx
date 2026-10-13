"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { PortalSidebar, type PortalBrand } from "@/components/portal-view";
import type { AppKey } from "@/lib/apps";
import { portalApps } from "@/lib/portal-apps";

export function PortalNav({
  brand,
  viewer,
  installedApps,
  channels,
  signOut,
}: {
  brand: PortalBrand;
  viewer: { name: string; detail: string };
  installedApps: AppKey[];
  channels: { messages: boolean; files: boolean };
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  return (
    <PortalSidebar
      brand={brand}
      apps={portalApps(new Set(installedApps), channels)}
      isActive={(href) => (href === "/portal" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))}
      viewer={viewer}
      footer={
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex size-7 items-center justify-center rounded-control opacity-70 hover:opacity-100"
          >
            <LogOut size={15} strokeWidth={1.8} />
          </button>
        </form>
      }
    />
  );
}
