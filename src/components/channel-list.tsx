"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { ListFilter, MoreHorizontal, Search, X } from "lucide-react";
import { Menu } from "./menu";
import { RelativeTime } from "./relative-time";
import { stripFormatting } from "./rich-text";
import { Avatar } from "./ui";

export type ChannelSummary = {
  id: string;
  title: string;
  company_id: string | null;
  last_activity_at: string;
  last_activity_summary: string;
};

type Sort = "recent" | "name";
type Owner = "all" | "companies" | "contacts";

const iconButton = "flex size-7 items-center justify-center rounded-control text-ink hover:bg-hover";

export function ChannelList({ base, title, channels }: { base: string; title: string; channels: ChannelSummary[] }) {
  const pathname = usePathname();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [owner, setOwner] = useState<Owner>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = channels.filter(
      (c) =>
        (owner === "all" || (owner === "companies") === (c.company_id !== null)) &&
        (q === "" || c.title.toLowerCase().includes(q)),
    );
    return sort === "name" ? filtered.toSorted((a, b) => a.title.localeCompare(b.title)) : filtered;
  }, [channels, query, sort, owner]);

  return (
    <section className="flex w-[362px] shrink-0 flex-col border-r border-line">
      <header className="flex h-[61px] shrink-0 items-center gap-1 border-b border-line px-5">
        {searching ? (
          <div className="relative flex-1">
            <Search size={12} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label={`Search ${title.toLowerCase()}`}
              className="h-7 w-full rounded-control border border-line-strong pr-2 pl-6 text-[13px] outline-none focus:border-ink-3"
            />
          </div>
        ) : (
          <>
            <h2 className="text-[13px] font-medium">{title}</h2>
            <Menu
              label={`${title} options`}
              align="start"
              triggerClassName={iconButton}
              trigger={<MoreHorizontal size={15} />}
              items={[
                { label: sort === "recent" ? "✓ Most recent" : "Most recent", onSelect: () => setSort("recent") },
                { label: sort === "name" ? "✓ Name" : "Name", onSelect: () => setSort("name") },
              ]}
            />
            <span className="flex-1" />
          </>
        )}
        <button
          type="button"
          aria-label={searching ? "Close search" : `Search ${title.toLowerCase()}`}
          className={iconButton}
          onClick={() => {
            setSearching((v) => !v);
            setQuery("");
          }}
        >
          {searching ? <X size={15} /> : <Search size={15} />}
        </button>
        <Menu
          label="Filter channels"
          triggerClassName={clsx(iconButton, owner !== "all" && "bg-hover")}
          trigger={<ListFilter size={15} />}
          items={(
            [
              ["all", "All channels"],
              ["companies", "Companies"],
              ["contacts", "Clients"],
            ] as const
          ).map(([value, label]) => ({ label: owner === value ? `✓ ${label}` : label, onSelect: () => setOwner(value) }))}
        />
      </header>
      <ul className="flex-1 overflow-y-auto">
        {visible.map((channel) => {
          const href = `${base}/${channel.id}`;
          return (
            <li key={channel.id}>
              <Link
                href={href}
                className={clsx(
                  "flex items-center gap-3 border-b border-line px-5 py-3 transition-colors",
                  pathname === href ? "bg-hover" : "hover:bg-hover",
                )}
              >
                <Avatar name={channel.title} square />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]">{channel.title}</div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] text-ink-3">{stripFormatting(channel.last_activity_summary)}</span>
                    <RelativeTime value={channel.last_activity_at} className="shrink-0 text-[12px] text-ink-3" />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {visible.length === 0 ? (
          <li className="px-5 py-8 text-center text-[13px] text-ink-3">
            {channels.length === 0 ? "Add a client or company to start a channel." : "No channels match."}
          </li>
        ) : null}
      </ul>
    </section>
  );
}
