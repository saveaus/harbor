"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

/** A list's search box. Searching keeps the other list parameters in `keep`, such as the view, filters and sorts. */
export function ListSearch({ path, q, keep, placeholder }: { path: string; q: string; keep: string; placeholder: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", focus);
    return () => document.removeEventListener("keydown", focus);
  }, []);

  const go = (value: string) => {
    const params = new URLSearchParams(keep);
    if (value) params.set("q", value);
    const query = params.toString();
    router.push(query ? `${path}?${query}` : path);
  };

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        go(input.current?.value.trim() ?? "");
      }}
    >
      <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" />
      <input
        ref={input}
        name="q"
        type="search"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-keyshortcuts="/"
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.currentTarget.value = "";
          if (q) go("");
        }}
        className="h-7 w-44 rounded-control xl:w-60 border border-line-strong bg-canvas pr-7 pl-7 text-[13px] outline-none placeholder:text-ink-4 focus:border-ink-3 [&::-webkit-search-cancel-button]:hidden"
      />
      {q ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-control p-0.5 text-ink-3 hover:bg-hover hover:text-ink"
          onClick={() => go("")}
        >
          <X size={12} />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 rounded border border-line px-1 text-[11px] leading-4 text-ink-4">
          /
        </kbd>
      )}
    </form>
  );
}
