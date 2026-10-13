"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

const items = [
  { href: "/settings/general", label: "Workspace" },
  { href: "/settings/domain", label: "Domain" },
  { href: "/settings/payments", label: "Payments" },
  { href: "/settings/account", label: "Your account" },
];

export function SettingsNav() {
  return <Tabs items={items} active={usePathname()} />;
}
