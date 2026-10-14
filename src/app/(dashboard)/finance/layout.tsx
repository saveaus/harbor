import { ChevronDown } from "lucide-react";
import { Menu } from "@/components/menu";
import { PageHeader } from "@/components/ui";
import { requireApp } from "@/lib/workspace";
import { FinanceNav } from "./finance-nav";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { member, installedApps } = await requireApp("finance");
  return (
    <>
      <PageHeader
        title={
          <Menu
            label="Finance options"
            align="start"
            triggerClassName="-ml-2 inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-[13px] font-medium text-black hover:bg-hover"
            trigger={
              <>
                Finance <ChevronDown size={14} />
              </>
            }
            items={[
              ...(member.role !== "member" ? [{ label: "Finance settings", href: "/finance/settings" }] : []),
              ...(installedApps.has("scheduling") ? [{ label: "Timesheets", href: "/schedule/timesheets" }] : []),
              { label: "App settings", href: "/apps/manage" },
            ]}
          />
        }
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FinanceNav timesheets={installedApps.has("scheduling")} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
