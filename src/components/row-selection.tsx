"use client";

import { clsx } from "clsx";
import { createContext, use, useEffect, useState, useTransition, type ReactNode } from "react";
import { X } from "lucide-react";
import { buttonClass } from "./ui";

type Selection = { ids: string[]; selected: Set<string>; toggle: (id: string) => void; setAll: (on: boolean) => void; clear: () => void };

const SelectionContext = createContext<Selection | null>(null);

export function useSelection(): Selection {
  const selection = use(SelectionContext);
  if (!selection) throw new Error("Row selection controls must be inside a SelectionProvider.");
  return selection;
}

/** Holds which of the listed rows are selected. Selection resets when the listed rows change. */
export function SelectionProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const key = ids.join(",");
  useEffect(() => setSelected(new Set()), [key]);
  const value: Selection = {
    ids,
    selected,
    toggle: (id) =>
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setAll: (on) => setSelected(on ? new Set(ids) : new Set()),
    clear: () => setSelected(new Set()),
  };
  return <SelectionContext value={value}>{children}</SelectionContext>;
}

const checkboxClass = "size-3.5 cursor-pointer accent-ink";

export function SelectAllCheckbox({ label }: { label: string }) {
  const { ids, selected, setAll } = useSelection();
  const all = ids.length > 0 && selected.size === ids.length;
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={all}
      ref={(input) => {
        if (input) input.indeterminate = selected.size > 0 && !all;
      }}
      onChange={(event) => setAll(event.target.checked)}
      className={checkboxClass}
    />
  );
}

export function RowCheckbox({ id, label }: { id: string; label: string }) {
  const { selected, toggle } = useSelection();
  const checked = selected.has(id);
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={() => toggle(id)}
      className={clsx(checkboxClass, "relative z-[12]", !checked && selected.size === 0 && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
    />
  );
}

export type BulkAction = {
  label: string;
  action: (form: FormData) => Promise<void>;
  /** Asks for a value, such as the status to set, before applying. */
  choices?: { value: string; label: string }[];
  /** A confirmation question; "{count}" becomes the number selected and "{noun}" the record noun. */
  confirm?: string;
  danger?: boolean;
};

/** A floating bar of actions for the selected rows. `noun` is the singular and plural record name. */
export function BulkBar({ noun, actions }: { noun: [string, string]; actions: BulkAction[] }) {
  const { selected, clear } = useSelection();
  const [pending, startTransition] = useTransition();
  if (selected.size === 0) return null;
  const word = selected.size === 1 ? noun[0] : noun[1];

  const run = (bulk: BulkAction, value?: string) => {
    if (bulk.confirm && !window.confirm(bulk.confirm.replace("{count}", String(selected.size)).replace("{noun}", word))) return;
    const form = new FormData();
    for (const id of selected) form.append("ids", id);
    if (value !== undefined) form.set("value", value);
    startTransition(async () => {
      await bulk.action(form);
      clear();
    });
  };

  return (
    <div
      role="toolbar"
      aria-label="Selected rows"
      className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-card border border-line-strong bg-canvas py-1.5 pr-1.5 pl-3 text-[13px] shadow-pop"
    >
      <span className="pr-1.5 font-medium whitespace-nowrap">
        {selected.size} {word} selected
      </span>
      {actions.map((bulk) =>
        bulk.choices ? (
          <select
            key={bulk.label}
            aria-label={bulk.label}
            disabled={pending}
            value=""
            onChange={(event) => {
              if (event.target.value) run(bulk, event.target.value);
            }}
            className={clsx(buttonClass("secondary"), "pr-6")}
          >
            <option value="">{bulk.label}…</option>
            {bulk.choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        ) : (
          <button
            key={bulk.label}
            type="button"
            disabled={pending}
            className={clsx(buttonClass(bulk.danger ? "danger" : "secondary"))}
            onClick={() => run(bulk)}
          >
            {bulk.label}
          </button>
        ),
      )}
      <button type="button" aria-label="Clear selection" className="flex size-7 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink" onClick={clear}>
        <X size={14} />
      </button>
    </div>
  );
}
