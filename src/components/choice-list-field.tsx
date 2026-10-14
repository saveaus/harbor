"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Chip } from "./record-list";

/** A many-valued attribute, such as preferred staff or lists: chips to remove and a picker to add. */
export function ChoiceListField({
  id,
  label,
  options,
  values,
  emptyLabel,
  toggle,
  readOnly = false,
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  emptyLabel: string;
  toggle: (value: string, on: boolean) => Promise<{ error?: string } | void>;
  readOnly?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (value: string, on: boolean) =>
    startTransition(async () => {
      const result = await toggle(value, on);
      setError(result?.error ?? null);
    });
  const chosen = options.filter((o) => values.includes(o.value));
  const remaining = options.filter((o) => !values.includes(o.value));

  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-2 py-0.5">
      <label htmlFor={id} className="truncate pt-1 text-[13px] text-ink-3">
        {label}
      </label>
      <div className="min-w-0 px-2 py-1">
        <div className="flex flex-wrap items-center gap-1">
          {chosen.map((option) => (
            <Chip key={option.value}>
              {option.label}
              {readOnly ? null : (
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Remove ${option.label}`}
                  className="-mr-1 ml-0.5 rounded p-0.5 text-ink-3 hover:bg-canvas hover:text-ink"
                  onClick={() => run(option.value, false)}
                >
                  <X size={10} />
                </button>
              )}
            </Chip>
          ))}
          {chosen.length === 0 && (readOnly || remaining.length === 0) ? <span className="text-[13px] text-ink-4">{emptyLabel}</span> : null}
          {!readOnly && remaining.length ? (
            <select
              id={id}
              value=""
              disabled={pending}
              onChange={(event) => {
                if (event.target.value) run(event.target.value, true);
              }}
              className="h-[22px] max-w-40 rounded-control border border-dashed border-line-strong bg-transparent px-1 text-[12px] text-ink-3 outline-none hover:border-ink-3 focus:border-ink-3"
            >
              <option value="">{chosen.length ? "Add…" : emptyLabel}</option>
              {remaining.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
