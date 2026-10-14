import Link from "next/link";
import { clsx } from "clsx";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A record page's sidebar, with its own tabs. Wide screens show it beside the record unless it is
 * collapsed; narrower screens show it over the record only while `open`.
 */
export function RecordAside({
  label,
  tabs,
  open,
  collapsed,
  closeHref,
  children,
}: {
  label: string;
  tabs: { href: string; label: string; active: boolean }[];
  open: boolean;
  collapsed: boolean;
  closeHref: string;
  children: ReactNode;
}) {
  if (collapsed) return null;
  return (
    <aside
      aria-label={label}
      className={clsx(
        "flex w-[396px] shrink-0 flex-col border-l border-line bg-canvas",
        open ? "max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:z-30 max-xl:max-w-full max-xl:shadow-pop" : "max-xl:hidden",
      )}
    >
      <header className="flex h-[61px] shrink-0 items-stretch justify-between border-b border-line px-2">
        <nav aria-label={`${label} tabs`} className="flex items-stretch gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              scroll={false}
              aria-current={tab.active ? "page" : undefined}
              className={clsx(
                "-mb-px flex items-center border-b px-2 text-[13px] font-medium whitespace-nowrap",
                tab.active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        {open ? (
          <Link
            href={closeHref}
            scroll={false}
            aria-label={`Close ${label.toLowerCase()}`}
            className="my-auto flex size-7 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink xl:hidden"
          >
            <X size={15} />
          </Link>
        ) : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </aside>
  );
}
