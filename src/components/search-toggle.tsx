"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { buttonClass } from "./ui";

/** A "Search" button that expands into a box and navigates to `base?q=…`. */
export function SearchToggle({ base, q }: { base: string; q: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(q !== "");

  if (!open)
    return (
      <button type="button" className={buttonClass("secondary")} onClick={() => setOpen(true)}>
        <Search /> Search
      </button>
    );

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get("q");
        const query = typeof value === "string" ? value.trim() : "";
        router.push(query ? `${base}?q=${encodeURIComponent(query)}` : base);
      }}
    >
      <Search size={12} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" />
      <input
        name="q"
        autoFocus
        defaultValue={q}
        placeholder="Search"
        aria-label="Search"
        className="h-7 w-52 rounded-control border border-line-strong bg-canvas pr-7 pl-6 text-[13px] outline-none focus:border-ink-3"
      />
      <button
        type="button"
        aria-label="Clear search"
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-ink-3 hover:text-ink"
        onClick={() => {
          setOpen(false);
          if (q) router.push(base);
        }}
      >
        <X size={12} />
      </button>
    </form>
  );
}
