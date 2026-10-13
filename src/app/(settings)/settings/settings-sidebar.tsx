"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Bell,
  BellRing,
  ChevronLeft,
  CreditCard,
  Globe,
  KeyRound,
  Lock,
  Network,
  Puzzle,
  ScrollText,
  Sparkles,
  TriangleAlert,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";

const groups: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Me",
    items: [
      { href: "/settings/account", label: "Account", icon: User },
      { href: "/settings/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/general", label: "General", icon: Puzzle },
      { href: "/settings/assistant", label: "Assistant", icon: Sparkles },
      { href: "/settings/connectors", label: "Connectors", icon: Network },
      { href: "/automations", label: "Automations", icon: Zap },
      { href: "/settings/audit-log", label: "Audit Log", icon: ScrollText },
      { href: "/settings/danger-zone", label: "Danger zone", icon: TriangleAlert },
    ],
  },
  {
    label: "Client experience",
    items: [
      { href: "/settings/contact-authentication", label: "Contact authentication", icon: Lock },
      { href: "/settings/contact-notifications", label: "Contact notifications", icon: BellRing },
      { href: "/settings/custom-domains", label: "Custom domains", icon: Globe },
    ],
  },
  { label: "Developers", items: [{ href: "/settings/api", label: "API", icon: KeyRound }] },
  { label: "Billing", items: [{ href: "/settings/payout-account", label: "Payout account", icon: CreditCard }] },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-line bg-surface">
      <nav className="flex-1 overflow-y-auto pt-3 pb-4">
        <Link href="/home" className="mx-2 flex h-[30px] items-center gap-2 rounded-nav px-2 text-[13px] text-ink hover:bg-line">
          <ChevronLeft size={14} strokeWidth={2} /> Go back
        </Link>
        {groups.map((group) => (
          <div key={group.label} className="mt-3">
            <h2 className="px-4 py-2 text-[12px] leading-5 font-medium text-ink-3">{group.label}</h2>
            {group.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "mx-2 flex h-[30px] items-center gap-3 rounded-nav px-2 text-[13px] tracking-[-0.05px] text-ink transition-colors",
                  pathname === href ? "bg-hover" : "hover:bg-line",
                )}
              >
                <Icon size={14} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
