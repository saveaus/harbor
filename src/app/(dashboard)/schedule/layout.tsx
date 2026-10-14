import { ChevronDown } from "lucide-react";
import { Menu } from "@/components/menu";
import { PageHeader } from "@/components/ui";
import { requireApp } from "@/lib/workspace";
import { ScheduleNav } from "./schedule-nav";

export default async function ScheduleLayout({ children }: { children: React.ReactNode }) {
  const { member, installedApps } = await requireApp("scheduling");
  const admin = member.role !== "member";
  return (
    <>
      <PageHeader
        title={
          <Menu
            label="Scheduling options"
            align="start"
            triggerClassName="-ml-2 inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-[13px] font-medium text-black hover:bg-hover"
            trigger={
              <>
                Scheduling <ChevronDown size={14} />
              </>
            }
            items={[
              ...(admin ? [{ label: "Pay rates", href: "/schedule/timesheets/pay-rates" }] : []),
              ...(installedApps.has("finance") ? [{ label: "Price book", href: "/finance/price-book" }] : []),
              { label: "App settings", href: "/apps/manage" },
            ]}
          />
        }
      />
      <ScheduleNav />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </>
  );
}
