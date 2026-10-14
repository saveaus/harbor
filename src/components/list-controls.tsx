"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronDown, CircleDot, Columns3, EyeOff, ListFilter, Plus, Trash2, X } from "lucide-react";
import type { ChipTone } from "@/lib/care";
import {
  OPERATORS,
  VALUELESS,
  listUrl,
  type AttributeMeta,
  type Filter,
  type ListDefaults,
  type ListState,
  type Operator,
  type Sort,
} from "@/lib/list-query";
import { buttonClass } from "./ui";

type Target = { base: string; view?: string; q?: string; defaults: ListDefaults };

const FILTER_EVENT = "list-controls:filter";

const controlClass =
  "h-7 rounded-control border border-line-strong bg-canvas px-2 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-ink-3";

function useNavigate(target: Target) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (state: ListState) => startTransition(() => router.replace(listUrl(target.base, { ...target, state }), { scroll: false }));
  return { go, pending };
}

/** Closes on outside pointer-down or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handle = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("pointerdown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [open, close]);
  return root;
}

function Popover({
  label,
  icon,
  count,
  open,
  setOpen,
  width = "w-[480px]",
  children,
}: {
  label: string;
  icon: ReactNode;
  count?: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  width?: string;
  children: ReactNode;
}) {
  const root = useDismiss(open, () => setOpen(false));
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={clsx(buttonClass(count ? "secondary" : "ghost"), count && "border-link/40 bg-info-soft text-link hover:bg-info-soft")}
        onClick={() => setOpen(!open)}
      >
        {icon}
        {label}
        {count ? <span className="tabular-nums">{count}</span> : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className={clsx("absolute top-full right-0 z-40 mt-1 max-w-[calc(100vw-24px)] rounded-card border border-line-strong bg-canvas p-2 shadow-pop", width)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function defaultOperator(attr: AttributeMeta): Operator {
  switch (attr.type) {
    case "text":
      return "contains";
    case "select":
      return "any";
    case "date":
      return "before";
    default: {
      const unreachable: never = attr.type;
      return unreachable;
    }
  }
}

const complete = (f: Filter) => VALUELESS.includes(f.op) || f.values.some((v) => v.trim() !== "");

/** Attio-style filter builder: "Where <attribute> <operator> <value>", joined by and/or. */
export function FilterControl({ attrs, state, ...target }: Target & { attrs: AttributeMeta[]; state: ListState }) {
  const { go } = useNavigate(target);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filter[]>(state.filters);
  const [match, setMatch] = useState(state.match);

  useEffect(() => {
    const openFor = (event: Event) => {
      const attr = attrs.find((a) => a.key === (event as CustomEvent<string>).detail);
      if (!attr) return;
      setDraft([...state.filters, { attr: attr.key, op: defaultOperator(attr), values: [] }]);
      setMatch(state.match);
      setOpen(true);
    };
    window.addEventListener(FILTER_EVENT, openFor);
    return () => window.removeEventListener(FILTER_EVENT, openFor);
  }, [attrs, state]);

  const commit = (filters: Filter[], nextMatch = match) => {
    setDraft(filters);
    setMatch(nextMatch);
    const ready = filters.filter(complete);
    const current = state.filters;
    if (JSON.stringify(ready) !== JSON.stringify(current) || nextMatch !== state.match) go({ ...state, filters: ready, match: nextMatch });
  };
  const update = (index: number, change: Partial<Filter>) => commit(draft.map((f, i) => (i === index ? { ...f, ...change } : f)));
  const add = (key: string) => {
    const attr = attrs.find((a) => a.key === key);
    if (attr) setDraft([...draft, { attr: attr.key, op: defaultOperator(attr), values: [] }]);
  };

  return (
    <Popover
      label="Filter"
      icon={<ListFilter />}
      count={state.filters.length}
      open={open}
      setOpen={(next) => {
        if (next) {
          setDraft(state.filters);
          setMatch(state.match);
        }
        setOpen(next);
      }}
    >
      {draft.length === 0 ? (
        <AttributePicker attrs={attrs} onPick={add} />
      ) : (
        <div className="space-y-1.5">
          {draft.map((filter, index) => {
            const attr = attrs.find((a) => a.key === filter.attr);
            if (!attr) return null;
            return (
              <div key={index} className="flex items-center gap-1.5">
                <div className="w-14 shrink-0 text-[13px] text-ink-3">
                  {index === 0 ? (
                    "Where"
                  ) : index === 1 ? (
                    <select
                      aria-label="Match"
                      value={match}
                      onChange={(event) => commit(draft, event.target.value === "any" ? "any" : "all")}
                      className={clsx(controlClass, "w-14 px-1")}
                    >
                      <option value="all">and</option>
                      <option value="any">or</option>
                    </select>
                  ) : (
                    <span className="pl-1">{match === "any" ? "or" : "and"}</span>
                  )}
                </div>
                <select
                  aria-label="Attribute"
                  value={filter.attr}
                  onChange={(event) => {
                    const next = attrs.find((a) => a.key === event.target.value);
                    if (next) update(index, { attr: next.key, op: defaultOperator(next), values: [] });
                  }}
                  className={clsx(controlClass, "w-32 shrink-0")}
                >
                  {attrs.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Condition"
                  value={filter.op}
                  onChange={(event) => {
                    const op = event.target.value as Operator;
                    const keepValues = !VALUELESS.includes(op) && (op === "within") === (filter.op === "within");
                    update(index, { op, values: keepValues ? filter.values : [] });
                  }}
                  className={clsx(controlClass, "w-36 shrink-0")}
                >
                  {Object.entries(OPERATORS[attr.type]).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <div className="min-w-0 flex-1">
                  {VALUELESS.includes(filter.op) ? null : (
                    <FilterValue key={`${filter.attr}-${filter.op}`} attr={attr} filter={filter} onChange={(values) => update(index, { values })} />
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${attr.label} filter`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink"
                  onClick={() => commit(draft.filter((_, i) => i !== index))}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-line pt-2">
            <AddMenu label="Add condition" attrs={attrs} onPick={add} />
            <button type="button" className="text-[12px] text-ink-3 hover:text-ink" onClick={() => commit([], "all")}>
              Clear all
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

function AttributePicker({ attrs, onPick }: { attrs: AttributeMeta[]; onPick: (key: string) => void }) {
  const [query, setQuery] = useState("");
  const shown = attrs.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && shown[0]) onPick(shown[0].key);
        }}
        placeholder="Filter by…"
        aria-label="Filter by attribute"
        className={clsx(controlClass, "w-full")}
      />
      <ul className="mt-1 max-h-72 overflow-y-auto">
        {shown.map((a) => (
          <li key={a.key}>
            <button type="button" className="flex h-8 w-full items-center rounded-control px-2 text-left text-[13px] hover:bg-hover" onClick={() => onPick(a.key)}>
              {a.label}
            </button>
          </li>
        ))}
        {shown.length === 0 ? <li className="px-2 py-2 text-[13px] text-ink-3">No attributes match.</li> : null}
      </ul>
    </div>
  );
}

function AddMenu({ label, attrs, onPick }: { label: string; attrs: AttributeMeta[]; onPick: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useDismiss(open, () => setOpen(false));
  return (
    <div ref={root} className="relative">
      <button type="button" className={buttonClass("ghost")} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Plus /> {label}
      </button>
      {open ? (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-card border border-line-strong bg-canvas p-1.5 shadow-pop">
          <AttributePicker
            attrs={attrs}
            onPick={(key) => {
              setOpen(false);
              onPick(key);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function FilterValue({ attr, filter, onChange }: { attr: AttributeMeta; filter: Filter; onChange: (values: string[]) => void }) {
  const [text, setText] = useState(filter.values[0] ?? "");
  switch (attr.type) {
    case "text":
      return (
        <input
          autoFocus={!filter.values.length}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => onChange([text])}
          onKeyDown={(event) => {
            if (event.key === "Enter") onChange([text]);
          }}
          maxLength={100}
          placeholder="Type a value…"
          aria-label={`${attr.label} value`}
          className={clsx(controlClass, "w-full")}
        />
      );
    case "date":
      return filter.op === "within" ? (
        <span className="flex items-center gap-1.5 text-[13px] text-ink-3">
          <input
            type="number"
            min={1}
            max={3650}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => onChange([text])}
            aria-label={`${attr.label} days`}
            className={clsx(controlClass, "w-16")}
          />
          days
        </span>
      ) : (
        <input
          type="date"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            onChange([event.target.value]);
          }}
          aria-label={`${attr.label} date`}
          className={clsx(controlClass, "w-full")}
        />
      );
    case "select":
      return <OptionPicker attr={attr} values={filter.values} onChange={onChange} />;
    default: {
      const unreachable: never = attr.type;
      return unreachable;
    }
  }
}

function OptionPicker({ attr, values, onChange }: { attr: AttributeMeta; values: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(values.length === 0);
  const root = useDismiss(open, () => setOpen(false));
  const options = attr.options ?? [];
  const labels = options.filter((o) => values.includes(o.value)).map((o) => o.label);
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${attr.label} values`}
        className={clsx(controlClass, "flex w-full items-center justify-between gap-1 text-left")}
        onClick={() => setOpen(!open)}
      >
        <span className={clsx("truncate", !labels.length && "text-ink-4")}>{labels.length ? labels.join(", ") : "Select…"}</span>
        <ChevronDown size={12} className="shrink-0 text-ink-3" />
      </button>
      {open ? (
        <ul className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 min-w-44 overflow-y-auto rounded-card border border-line-strong bg-canvas p-1 shadow-pop">
          {options.map((option) => (
            <li key={option.value}>
              <label className="flex h-8 cursor-pointer items-center gap-2 rounded-control px-2 text-[13px] hover:bg-hover">
                <input
                  type="checkbox"
                  checked={values.includes(option.value)}
                  onChange={(event) => onChange(event.target.checked ? [...values, option.value] : values.filter((v) => v !== option.value))}
                />
                <span className="truncate">{option.label}</span>
              </label>
            </li>
          ))}
          {options.length === 0 ? <li className="px-2 py-2 text-[13px] text-ink-3">Nothing to choose yet.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

const STATUS_DOT: Record<ChipTone, string> = {
  grey: "bg-ink-3",
  blue: "bg-[#0c41bb]",
  green: "bg-[#115b3b]",
  amber: "bg-[#863805]",
  red: "bg-[#b42318]",
  purple: "bg-[#7a2d87]",
  teal: "bg-[#0e6170]",
};

/** A first-class status facet. Choosing values writes a status filter; clearing restores the view. */
export function StatusFilter({
  attr,
  state,
  viewState,
  tones,
  counts,
  ...target
}: Target & {
  attr: AttributeMeta;
  state: ListState;
  viewState: ListState;
  tones: Record<string, ChipTone>;
  counts: Map<string, number>;
}) {
  const { go } = useNavigate(target);
  const [open, setOpen] = useState(false);
  const current = state.filters.find((f) => f.attr === attr.key);
  const selected = current?.op === "any" ? current.values : [];
  const options = attr.options ?? [];

  useEffect(() => {
    const openFor = (event: Event) => {
      if ((event as CustomEvent<string>).detail === attr.key) setOpen(true);
    };
    window.addEventListener(FILTER_EVENT, openFor);
    return () => window.removeEventListener(FILTER_EVENT, openFor);
  }, [attr.key]);

  const apply = (values: string[]) => {
    const others = state.filters.filter((f) => f.attr !== attr.key);
    const restored = viewState.filters.filter((f) => f.attr === attr.key);
    go({ ...state, filters: values.length ? [...others, { attr: attr.key, op: "any", values }] : [...others, ...restored] });
  };
  const label = selected.length === 1 ? (options.find((o) => o.value === selected[0])?.label ?? attr.label) : attr.label;

  return (
    <Popover
      label={label}
      icon={<CircleDot />}
      count={selected.length > 1 ? selected.length : undefined}
      open={open}
      setOpen={setOpen}
      width="w-64"
    >
      <p className="px-1.5 pb-1.5 text-[12px] text-ink-3">Show records in any of these statuses.</p>
      <ul className="max-h-72 overflow-y-auto">
        {options.map((option) => {
          const tone = tones[option.value] ?? "grey";
          return (
            <li key={option.value}>
              <label className="flex h-8 cursor-pointer items-center gap-2 rounded-control px-2 text-[13px] hover:bg-hover">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={(event) =>
                    apply(event.target.checked ? [...selected, option.value] : selected.filter((v) => v !== option.value))
                  }
                />
                <span className={clsx("size-2 shrink-0 rounded-full", STATUS_DOT[tone])} />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <span className="text-[12px] text-ink-4 tabular-nums">{counts.get(option.value) ?? 0}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {selected.length ? (
        <div className="mt-1 border-t border-line pt-1.5">
          <button type="button" className="px-2 text-[12px] text-ink-3 hover:text-ink" onClick={() => apply([])}>
            Clear status
          </button>
        </div>
      ) : null}
    </Popover>
  );
}

/** Ordered sorts: ties on the first fall through to the next. */
export function SortControl({ attrs, state, ...target }: Target & { attrs: AttributeMeta[]; state: ListState }) {
  const { go } = useNavigate(target);
  const [open, setOpen] = useState(false);
  const sortable = attrs.filter((a) => a.sortable !== false);
  const set = (sorts: Sort[]) => go({ ...state, sorts });
  const unused = sortable.filter((a) => !state.sorts.some((s) => s.attr === a.key));
  const isDefault = JSON.stringify(state.sorts) === JSON.stringify(target.defaults.sorts);
  return (
    <Popover label="Sort" icon={<ArrowDownUp />} count={isDefault ? undefined : state.sorts.length} open={open} setOpen={setOpen} width="w-[400px]">
      {state.sorts.length === 0 ? (
        <AttributePicker attrs={sortable} onPick={(key) => set([{ attr: key, dir: "asc" }])} />
      ) : (
        <div className="space-y-1.5">
          {state.sorts.map((sort, index) => (
            <div key={sort.attr} className="flex items-center gap-1.5">
              <span className="w-14 shrink-0 text-[13px] text-ink-3">{index === 0 ? "Sort by" : "then by"}</span>
              <select
                aria-label="Sort attribute"
                value={sort.attr}
                onChange={(event) => set(state.sorts.map((s, i) => (i === index ? { ...s, attr: event.target.value } : s)))}
                className={clsx(controlClass, "min-w-0 flex-1")}
              >
                {sortable
                  .filter((a) => a.key === sort.attr || !state.sorts.some((s) => s.attr === a.key))
                  .map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Direction"
                value={sort.dir}
                onChange={(event) => set(state.sorts.map((s, i) => (i === index ? { ...s, dir: event.target.value === "asc" ? "asc" : "desc" } : s)))}
                className={clsx(controlClass, "w-28 shrink-0")}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <button
                type="button"
                aria-label="Move up"
                disabled={index === 0}
                className="flex size-7 shrink-0 items-center justify-center rounded-control text-ink-3 hover:bg-hover disabled:opacity-30"
                onClick={() => set(state.sorts.map((s, i) => (i === index - 1 ? state.sorts[index] : i === index ? state.sorts[index - 1] : s)))}
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                aria-label={`Remove sort by ${attrs.find((a) => a.key === sort.attr)?.label ?? sort.attr}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink"
                onClick={() => set(state.sorts.filter((_, i) => i !== index))}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-line pt-2">
            {unused.length && state.sorts.length < 4 ? (
              <AddMenu label="Add sort" attrs={unused} onPick={(key) => set([...state.sorts, { attr: key, dir: "asc" }])} />
            ) : (
              <span />
            )}
            <button type="button" className="text-[12px] text-ink-3 hover:text-ink" onClick={() => set([])}>
              Remove sorts
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

/** Which columns the table shows. */
export function ColumnsControl({ columns, state, ...target }: Target & { columns: { key: string; label: string }[]; state: ListState }) {
  const { go } = useNavigate(target);
  const [open, setOpen] = useState(false);
  const hiddenCount = columns.filter((c) => state.hidden.includes(c.key)).length;
  return (
    <Popover label="Columns" icon={<Columns3 />} count={hiddenCount || undefined} open={open} setOpen={setOpen} width="w-60">
      <ul>
        {columns.map((column) => (
          <li key={column.key}>
            <label className="flex h-8 cursor-pointer items-center gap-2 rounded-control px-2 text-[13px] hover:bg-hover">
              <input
                type="checkbox"
                checked={!state.hidden.includes(column.key)}
                onChange={(event) =>
                  go({ ...state, hidden: event.target.checked ? state.hidden.filter((k) => k !== column.key) : [...state.hidden, column.key] })
                }
              />
              {column.label}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-1 border-t border-line pt-1.5">
        <button type="button" className="px-2 text-[12px] text-ink-3 hover:text-ink" onClick={() => go({ ...state, hidden: [] })}>
          Show all columns
        </button>
      </div>
    </Popover>
  );
}

/** A column header that opens sort, filter and hide actions, as Attio's do. */
export function ColumnMenu({
  label,
  icon,
  sorted,
  ascHref,
  descHref,
  hideHref,
  filterAttr,
}: {
  label: string;
  icon?: ReactNode;
  sorted?: "asc" | "desc";
  ascHref?: string;
  descHref?: string;
  hideHref?: string;
  filterAttr?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useDismiss(open, () => setOpen(false));
  const item = "flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] text-ink whitespace-nowrap hover:bg-hover [&_svg]:size-3.5";
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="-mx-1 inline-flex items-center gap-1.5 rounded-control px-1 py-0.5 hover:bg-hover hover:text-ink"
        onClick={() => setOpen(!open)}
      >
        {icon}
        {label}
        {sorted ? sorted === "asc" ? <ArrowUp size={12} aria-label="sorted ascending" /> : <ArrowDown size={12} aria-label="sorted descending" /> : null}
      </button>
      {open ? (
        <div role="menu" className="absolute top-full left-0 z-40 mt-1 min-w-44 rounded-card border border-line-strong bg-canvas p-1 font-normal shadow-pop">
          {ascHref ? (
            <Link role="menuitem" href={ascHref} scroll={false} className={item} onClick={() => setOpen(false)}>
              <ArrowUp /> Sort ascending
            </Link>
          ) : null}
          {descHref ? (
            <Link role="menuitem" href={descHref} scroll={false} className={item} onClick={() => setOpen(false)}>
              <ArrowDown /> Sort descending
            </Link>
          ) : null}
          {filterAttr ? (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: filterAttr }));
              }}
            >
              <ListFilter /> Filter
            </button>
          ) : null}
          {hideHref ? (
            <Link role="menuitem" href={hideHref} scroll={false} className={item} onClick={() => setOpen(false)}>
              <EyeOff /> Hide column
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function describe(filter: Filter, attrs: AttributeMeta[]): string {
  const attr = attrs.find((a) => a.key === filter.attr);
  if (!attr) return "";
  const op = (OPERATORS[attr.type] as Record<string, string>)[filter.op];
  const values =
    attr.type === "select"
      ? filter.values.map((v) => attr.options?.find((o) => o.value === v)?.label ?? v).join(", ")
      : filter.op === "within"
        ? `${filter.values[0]} days`
        : (filter.values[0] ?? "");
  return [attr.label, op, values].filter(Boolean).join(" ");
}

/** The active filters and sorts under the view bar, with reset and save when they differ from the view. */
export function ListStateBar({
  attrs,
  state,
  viewState,
  dirty,
  saveView,
  deleteView,
  ...target
}: Target & {
  attrs: AttributeMeta[];
  state: ListState;
  viewState: ListState;
  dirty: boolean;
  saveView: (name: string) => Promise<{ error?: string }>;
  deleteView?: () => Promise<void>;
}) {
  const { go } = useNavigate(target);
  const [naming, setNaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const sortLabel = state.sorts
    .map((s) => `${attrs.find((a) => a.key === s.attr)?.label ?? s.attr} ${s.dir === "asc" ? "↑" : "↓"}`)
    .join(", then ");
  if (!state.filters.length && !dirty && !deleteView) return null;

  return (
    <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-9 py-1.5 text-[12px]">
      {state.filters.map((filter, index) => (
        <span key={index} className="inline-flex h-6 items-center gap-1 rounded-control border border-line-strong bg-surface pr-0.5 pl-2 text-ink">
          {index > 0 ? <span className="text-ink-3">{state.match === "any" ? "or" : "and"}</span> : null}
          {describe(filter, attrs)}
          <button
            type="button"
            aria-label={`Remove filter ${describe(filter, attrs)}`}
            className="flex size-5 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink"
            onClick={() => go({ ...state, filters: state.filters.filter((_, i) => i !== index) })}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      {sortLabel ? <span className="px-1 text-ink-3">Sorted by {sortLabel}</span> : null}
      <div className="ml-auto flex items-center gap-1.5">
        {error ? (
          <span role="alert" className="text-danger">
            {error}
          </span>
        ) : null}
        {dirty ? (
          <>
            <button type="button" className={buttonClass("ghost")} onClick={() => go(viewState)}>
              Reset
            </button>
            {naming ? (
              <form
                className="flex items-center gap-1.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
                  if (!name) return;
                  startSaving(async () => {
                    const result = await saveView(name);
                    setError(result.error ?? null);
                    if (!result.error) setNaming(false);
                  });
                }}
              >
                <input autoFocus name="name" maxLength={60} placeholder="View name" aria-label="View name" className={clsx(controlClass, "w-40")} />
                <button type="submit" disabled={saving} className={buttonClass("primary")}>
                  Save
                </button>
                <button type="button" className={buttonClass("ghost")} onClick={() => setNaming(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button type="button" className={buttonClass("secondary")} onClick={() => setNaming(true)}>
                Save as new view
              </button>
            )}
          </>
        ) : null}
        {deleteView && !dirty ? (
          <form
            action={deleteView}
            onSubmit={(event) => {
              if (!window.confirm("Delete this view for everyone? The records stay as they are.")) event.preventDefault();
            }}
          >
            <button type="submit" className={clsx(buttonClass("ghost"), "text-danger")}>
              Delete view
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
