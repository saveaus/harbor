import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ChipTone } from "@/lib/care";
import { ColumnMenu } from "./list-controls";
import { Avatar } from "./ui";

/** An object page title: icon, name and record count. */
export function ListTitle({ icon: Icon, title, count }: { icon: LucideIcon; title: string; count: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-control bg-hover">
        <Icon size={13} />
      </span>
      {title}
      <span className="rounded-control bg-hover px-1.5 text-[12px] leading-5 font-normal text-ink-3">{count}</span>
    </span>
  );
}

/** Saved views on the left and list controls on the right. */
export function ViewBar({
  views,
  active,
  children,
}: {
  views: { href: string; label: string; count?: number }[];
  active: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-9">
      <nav
        aria-label="Views"
        className="flex min-w-0 items-center gap-1 overflow-x-auto pr-6 [scrollbar-width:none] mask-[linear-gradient(to_right,black_calc(100%-24px),transparent)]"
      >
        {views.map((view) => (
          <Link
            key={view.href}
            href={view.href}
            aria-current={view.href === active ? "page" : undefined}
            className={clsx(
              "flex h-7 items-center gap-1.5 rounded-control px-2 text-[13px] font-medium whitespace-nowrap transition-colors",
              view.href === active ? "bg-hover text-ink" : "text-ink-3 hover:bg-hover hover:text-ink",
            )}
          >
            {view.label}
            {view.count !== undefined ? <span className="text-[12px] font-normal text-ink-4">{view.count}</span> : null}
          </Link>
        ))}
      </nav>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}

/** The narrowest viewport a lower-priority column still shows at. */
export type ColumnPriority = "lg" | "xl" | "2xl";

const hiddenBelow: Record<ColumnPriority, string> = {
  lg: "max-lg:hidden",
  xl: "max-xl:hidden",
  "2xl": "max-2xl:hidden",
};

export type GridColumn = {
  label: string;
  icon?: LucideIcon;
  sorted?: "asc" | "desc";
  className?: string;
  priority?: ColumnPriority;
  /** Header actions: sort either way, filter by this attribute, or hide the column. */
  menu?: { ascHref?: string; descHref?: string; hideHref?: string; filterAttr?: string };
  /** Content in the first column's left gutter, such as a select-all checkbox. */
  leading?: ReactNode;
};

/** A spreadsheet-like record table: gridlines, a sticky first column and a record count. */
export function GridTable({
  label,
  columns,
  footer,
  children,
}: {
  label: string;
  columns: GridColumn[];
  footer: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table aria-label={label} className="w-full border-separate border-spacing-0 text-left text-[13px]">
          <thead className="sticky top-0 z-20 bg-canvas">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  aria-sort={column.sorted === "asc" ? "ascending" : column.sorted === "desc" ? "descending" : undefined}
                  className={clsx(
                    "h-[34px] border-b border-line px-3 font-normal whitespace-nowrap text-ink-3",
                    index > 0 && "border-l",
                    index === 0 && "sticky left-0 z-10 bg-canvas pl-9",
                    column.priority && hiddenBelow[column.priority],
                    column.className,
                  )}
                >
                  {column.leading ? <span className="absolute top-1/2 left-3 flex -translate-y-1/2">{column.leading}</span> : null}
                  <ColumnLabel column={column} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      <div className="flex h-9 shrink-0 items-center border-t border-line px-9 text-[12px] text-ink-3">{footer}</div>
    </div>
  );
}

function ColumnLabel({ column }: { column: GridColumn }) {
  const icon = column.icon ? <column.icon size={13} className="shrink-0" /> : null;
  if (column.menu) return <ColumnMenu label={column.label} icon={icon} sorted={column.sorted} {...column.menu} />;
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {column.label}
      {column.sorted ? <span aria-hidden>{column.sorted === "asc" ? "↑" : "↓"}</span> : null}
    </span>
  );
}

/** A table row; with `href`, the whole row opens the record named by `label`. */
export function GridRow({ href, label, children }: { href?: string; label?: string; children: ReactNode }) {
  return (
    <tr className="group relative h-12">
      {children}
      {href ? (
        <td className="absolute inset-0 z-[11] p-0">
          <Link
            href={href}
            className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-inset"
            aria-label={label ? `Open ${label}` : "Open record"}
          />
        </td>
      ) : null}
    </tr>
  );
}

const cellBase = "border-b border-line px-3 whitespace-nowrap text-ink group-hover:bg-hover";

/** The first, sticky cell of a row: the record's name, with a secondary line beneath it. */
export function GridNameCell({
  name,
  detail,
  icon: Icon,
  leading,
}: {
  name: string;
  detail?: string | null;
  icon?: LucideIcon;
  /** Content in the left gutter, such as the row's selection checkbox. */
  leading?: ReactNode;
}) {
  return (
    <td className={clsx(cellBase, "sticky left-0 w-64 max-w-80 bg-canvas pl-9", leading ? "pointer-events-none z-[12]" : "z-10")}>
      {leading ? <span className="pointer-events-auto absolute top-1/2 left-3 flex -translate-y-1/2">{leading}</span> : null}
      <span className="flex items-center gap-2.5">
        {Icon ? (
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-control bg-hover text-ink-3">
            <Icon size={15} />
          </span>
        ) : (
          <Avatar name={name} size={detail ? "md" : "sm"} />
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{name}</span>
          {detail ? <span className="truncate text-[12px] leading-4 text-ink-3">{detail}</span> : null}
        </span>
      </span>
    </td>
  );
}

/** A value cell. Empty cells stay blank so the values that are set stand out. */
export function GridCell({ children, className, priority }: { children?: ReactNode; className?: string; priority?: ColumnPriority }) {
  return (
    <td className={clsx(cellBase, "border-l", priority && hiddenBelow[priority], className)}>
      {children ?? <span className="sr-only">Not set</span>}
    </td>
  );
}

/** A cell that stays clickable above the row link, for row menus. */
export function GridActionCell({ children }: { children: ReactNode }) {
  return <td className={clsx(cellBase, "relative z-[12] w-10 border-l px-1 text-center")}>{children}</td>;
}

const chipTones: Record<ChipTone, string> = {
  grey: "bg-hover text-ink",
  blue: "bg-[#e9f0fd] text-[#0c41bb]",
  green: "bg-[#dfffeb] text-[#115b3b]",
  amber: "bg-[#fef6d0] text-[#863805]",
  red: "bg-[#fdeceb] text-[#b42318]",
  purple: "bg-[#f7ebf9] text-[#7a2d87]",
  teal: "bg-[#e6f6f8] text-[#0e6170]",
};

/** A select-option tag, like a status or category value. */
export function Chip({ tone = "grey", children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[22px] items-center rounded-control px-1.5 text-[12px] font-medium whitespace-nowrap",
        chipTones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** The identity block at the top of a record page: who this is and the states that matter most. */
export function RecordSummary({ name, detail, chips }: { name: string; detail: string; chips: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-line px-9 py-5">
      <Avatar name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[20px] leading-7 font-medium">{name}</h1>
        {detail ? <p className="truncate text-[13px] text-ink-3">{detail}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{chips}</div>
    </div>
  );
}

/** A reference to a person record. */
export function PersonChip({ name }: { name: string }) {
  return (
    <span className="inline-flex h-[22px] max-w-48 items-center gap-1.5 rounded-full border border-line-strong py-0.5 pr-2 pl-0.5 text-[12px]">
      <Avatar name={name} size="sm" />
      <span className="truncate">{name}</span>
    </span>
  );
}
