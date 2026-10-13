"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

const items = [
  { href: "/payments", label: "Overview" },
  { href: "/payments/invoices", label: "Invoices" },
  { href: "/payments/subscriptions", label: "Subscriptions" },
  { href: "/payments/store", label: "Store" },
  { href: "/payments/links", label: "Payment links" },
  { href: "/payments/services", label: "Services" },
];

export function PaymentsNav() {
  const pathname = usePathname();
  const active =
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/payments";
  return <Tabs items={items} active={active} />;
}
