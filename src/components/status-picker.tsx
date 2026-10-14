"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import type { ChipTone } from "@/lib/care";
import { Chip } from "./record-list";

type StatusOption = { value: string; label: string; tone: ChipTone };

/** A status badge that changes the record's status when clicked, as profile headers do. */
export function StatusPicker({
  value,
  options,
  action,
  confirm = {},
  readOnly = false,
}: {
  value: string;
  options: StatusOption[];
  action: (form: FormData) => Promise<{ error?: string }>;
  /** Statuses that need a confirmation first, such as archiving. */
  confirm?: Record<string, string>;
  readOnly?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = options.find((o) => o.value === value) ?? options[0];
  if (readOnly) return <Chip tone={current.tone}>{current.label}</Chip>;

  return (
    <span className="inline-flex items-center gap-2">
      <label className="relative inline-flex">
        <span className="sr-only">Status</span>
        <Chip tone={current.tone}>
          {current.label}
          <ChevronDown size={11} className="ml-1 opacity-60" />
        </Chip>
        <select
          value={value}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value;
            if (confirm[next] && !window.confirm(confirm[next])) {
              event.target.value = value;
              return;
            }
            const form = new FormData();
            form.set("value", next);
            startTransition(async () => {
              const result = await action(form);
              setError(result.error ?? null);
            });
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
