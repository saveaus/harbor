"use client";

import { usePathname } from "next/navigation";
import { PageHeader, Tabs } from "@/components/ui";

const tabs = [
  { href: "/compliance", label: "Readiness" },
  { href: "/compliance/incidents", label: "Incidents" },
  { href: "/compliance/documents", label: "Documents" },
  { href: "/compliance/library", label: "Library" },
];

function section(pathname: string) {
  if (pathname === "/compliance" || pathname.startsWith("/compliance?")) return { title: "Compliance", tab: "/compliance" };
  if (pathname.startsWith("/compliance/library")) return { title: "Compliance", tab: "/compliance/library" };
  if (pathname.startsWith("/compliance/documents")) return { title: "Compliance", tab: "/compliance/documents" };
  if (pathname.startsWith("/compliance/incidents")) return { title: "Compliance", tab: "/compliance/incidents" };
  if (pathname.startsWith("/compliance/reports")) return { title: "Reports" };
  return { title: "Compliance", tab: "/compliance" };
}

export function ComplianceHeader() {
  const pathname = usePathname();
  const current = section(pathname);
  return (
    <div className="print:hidden">
      <PageHeader title={current.title} />
      {current.tab ? <Tabs items={tabs} active={current.tab} /> : null}
    </div>
  );
}
