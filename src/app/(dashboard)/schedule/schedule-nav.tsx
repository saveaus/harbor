"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

const items = [
  { href: "/schedule", label: "Roster" },
  { href: "/schedule/my-shifts", label: "My shifts" },
  { href: "/schedule/pool", label: "Shift pool" },
  { href: "/schedule/sites", label: "Sites" },
  { href: "/schedule/tasks", label: "Tasks" },
  { href: "/schedule/timesheets", label: "Timesheets" },
];

export function ScheduleNav() {
  const pathname = usePathname();
  const active =
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/schedule";
  return <Tabs items={items} active={pathname.startsWith("/schedule/shifts/") ? "/schedule" : active} />;
}
