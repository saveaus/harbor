"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem =
  | { label: ReactNode; href: string; danger?: boolean }
  | { label: ReactNode; onSelect: () => void; danger?: boolean }
  | { label: ReactNode; action: () => Promise<void>; danger?: boolean };

export function Menu({
  trigger,
  triggerClassName,
  label,
  items,
  align = "end",
}: {
  trigger: ReactNode;
  triggerClassName: string;
  label: string;
  items: MenuItem[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const itemClass = (danger?: boolean) =>
    clsx(
      "flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] whitespace-nowrap hover:bg-hover [&_svg]:size-3.5",
      danger ? "text-danger" : "text-ink",
    );

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClassName}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          className={clsx(
            "absolute top-full z-30 mt-1 min-w-44 rounded-card border border-line-strong bg-canvas p-1 shadow-pop",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) =>
            "href" in item ? (
              <Link key={index} role="menuitem" href={item.href} className={itemClass(item.danger)} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ) : "onSelect" in item ? (
              <button
                key={index}
                type="button"
                role="menuitem"
                className={itemClass(item.danger)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ) : (
              <form key={index} action={item.action}>
                <button type="submit" role="menuitem" className={itemClass(item.danger)}>
                  {item.label}
                </button>
              </form>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
