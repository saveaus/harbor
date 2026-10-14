"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  BookOpen,
  Car,
  Clock,
  FileText,
  Landmark,
  PiggyBank,
  Receipt,
  ScrollText,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; match?: string[] };

const finance: Item[] = [
  { href: "/finance/invoices", label: "Invoicing", icon: FileText, match: ["/finance/invoices", "/finance/invoicing"] },
  { href: "/finance/billables", label: "Billable entries", icon: Receipt },
  { href: "/finance/claims", label: "NDIS claims", icon: Landmark },
];

const accounts: Item[] = [
  { href: "/finance/orders", label: "Orders", icon: ShoppingBag },
  { href: "/finance/recipients", label: "Recipients", icon: Users },
  { href: "/finance/statements", label: "Statements", icon: ScrollText },
];

const setup: Item[] = [
  { href: "/finance/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/finance/price-book", label: "Price book", icon: BookOpen },
];

function isActive(pathname: string, item: Item): boolean {
  return (item.match ?? [item.href]).some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

function ItemLink({ item, pathname }: { item: Item; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "mx-2 flex h-[30px] items-center gap-2.5 rounded-nav px-2 text-[13px] tracking-[-0.05px]",
        active ? "bg-hover text-ink" : "text-ink-3 hover:bg-hover hover:text-ink",
      )}
    >
      <Icon size={14} strokeWidth={2} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Group({ label, items, pathname }: { label?: string; items: Item[]; pathname: string }) {
  return (
    <div className={label ? "mt-3" : "mt-1"}>
      {label ? <h2 className="px-4 py-1.5 text-[12px] leading-5 font-medium text-ink-3">{label}</h2> : null}
      {items.map((item) => (
        <ItemLink key={item.href} item={item} pathname={pathname} />
      ))}
    </div>
  );
}

export function FinanceNav({ timesheets }: { timesheets: boolean }) {
  const pathname = usePathname();
  const employees: Item[] = [
    { href: "/finance/travel-claims", label: "Travel claims", icon: Car },
    { href: "/finance/reimbursements", label: "Reimbursements", icon: Wallet },
    ...(timesheets ? [{ href: "/schedule/timesheets", label: "Timesheets", icon: Clock }] : []),
  ];

  return (
    <nav aria-label="Finance" className="flex w-[232px] shrink-0 flex-col overflow-y-auto border-r border-line bg-surface py-3">
      <Link href="/finance" className={clsx("mx-2 mb-1 flex h-[30px] items-center rounded-nav px-2 text-[13px] font-medium", pathname === "/finance" ? "bg-hover text-ink" : "text-ink hover:bg-hover")}>
        Finance
      </Link>
      <Group items={finance} pathname={pathname} />
      <Group label="Accounts" items={accounts} pathname={pathname} />
      <Group label="Employees" items={employees} pathname={pathname} />
      <Group label="Setup" items={setup} pathname={pathname} />
    </nav>
  );
}

export function InvoicingTabs({ active }: { active: "invoices" | "draft" }) {
  const tabs = [
    { href: "/finance/invoices", label: "All invoices", on: active === "invoices" },
    { href: "/finance/invoicing", label: "Bulk draft", on: active === "draft" },
  ];
  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.on ? "page" : undefined}
          className={clsx(
            "inline-flex h-7 items-center rounded-full border px-3 text-[13px] font-medium",
            tab.on ? "border-line-strong bg-hover text-ink" : "border-line bg-canvas text-ink-3 hover:border-line-strong hover:bg-hover hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
