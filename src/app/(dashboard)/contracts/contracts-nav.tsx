"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

const items = [
  { href: "/contracts", label: "Sent" },
  { href: "/contracts/templates", label: "Templates" },
];

export function ContractsNav() {
  const pathname = usePathname();
  return <Tabs items={items} active={pathname.startsWith("/contracts/templates") ? "/contracts/templates" : "/contracts"} />;
}
