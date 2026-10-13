import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { initials } from "@/lib/format";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white border border-accent-hover hover:bg-accent-hover",
  secondary: "bg-canvas text-ink border border-line-strong hover:bg-surface",
  ghost: "text-ink hover:bg-hover",
  danger: "bg-canvas text-danger border border-line-strong hover:bg-danger-soft",
};

export function buttonClass(variant: ButtonVariant = "secondary", className?: string) {
  return clsx(
    "inline-flex h-7 items-center justify-center gap-1.5 rounded-control px-2 text-[13px] font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:border-line-strong disabled:bg-canvas disabled:text-ink-4 [&_svg]:size-3",
    buttonStyles[variant],
    className,
  );
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function PageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex h-[61px] shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas px-9">
      <div className={clsx("min-w-0 text-[13px] leading-6 font-medium text-black", typeof title === "string" && "truncate")}>{title}</div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Tabs({
  items,
  active,
  size = "md",
}: {
  items: { href: string; label: string }[];
  active: string;
  size?: "md" | "lg";
}) {
  return (
    <nav
      className={clsx(
        "flex shrink-0 items-stretch border-b border-line",
        size === "lg" ? "h-16 gap-10 px-9" : "h-10 gap-2 px-3.5",
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "-mb-px flex items-center border-b font-medium transition-colors",
            size === "lg" ? "text-[13px]" : "px-2 text-[14px]",
            item.href === active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-9 py-16">
      <div className="w-full max-w-[400px]">
        <div className="flex size-10 items-center justify-center rounded-control bg-hover text-ink">{icon}</div>
        <h2 className="mt-4 text-[20px] leading-7 font-medium text-ink">{title}</h2>
        <p className="mt-2 text-[14px] leading-6 text-ink-3">{body}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

const avatarTones = [
  "bg-[#f7ebf9] text-[#7a2d87]",
  "bg-[#e9f0fd] text-[#0c41bb]",
  "bg-[#dfffeb] text-[#115b3b]",
  "bg-[#fef6d0] text-[#863805]",
  "bg-[#fdeceb] text-[#b42318]",
  "bg-[#e6f6f8] text-[#0e6170]",
];

export function Avatar({ name, size = "md", square }: { name: string; size?: "sm" | "md" | "lg"; square?: boolean }) {
  const tone = avatarTones[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % avatarTones.length];
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center font-medium",
        square ? "rounded-[5px]" : "rounded-full",
        size === "sm" && "size-5 text-[10px]",
        size === "md" && "size-[30px] text-[13px]",
        size === "lg" && "size-10 text-[15px]",
        tone,
      )}
    >
      {initials(name)}
    </span>
  );
}

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-hover text-ink",
  accent: "bg-info-soft text-link",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[25px] items-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

export type TableColumn = string | { label: string; href: string; sorted?: "asc" | "desc" };

export function Table({ columns, children }: { columns: TableColumn[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto px-9">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column, index) => (
              <th key={index} className="h-10 px-5 font-normal whitespace-nowrap text-heading">
                {typeof column === "string" ? (
                  column
                ) : (
                  <Link href={column.href} className="inline-flex items-center gap-1 hover:text-ink">
                    {column.label}
                    {column.sorted ? <span aria-hidden>{column.sorted === "asc" ? "↑" : "↓"}</span> : null}
                  </Link>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children, href }: { children: ReactNode; href?: string }) {
  return (
    <tr className="group relative h-[50px] transition-colors hover:bg-surface">
      {children}
      {href ? (
        <td className="absolute inset-0 p-0">
          <Link href={href} className="absolute inset-0" aria-label="Open" />
        </td>
      ) : null}
    </tr>
  );
}

export function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx("px-5 whitespace-nowrap text-ink", className)}>{children}</td>;
}

/** A cell that stays clickable above a row link, for row menus and inline controls. */
export function ActionCell({ children }: { children: ReactNode }) {
  return <td className="relative z-10 w-12 px-2 text-right">{children}</td>;
}

export function Person({ name, detail }: { name: string; detail?: string | null }) {
  return (
    <span className="flex items-center gap-2.5">
      <Avatar name={name} />
      <span className="min-w-0 leading-4">
        <span className="block truncate text-[12px] text-ink">{name}</span>
        {detail ? <span className="block truncate text-[12px] text-ink-3">{detail}</span> : null}
      </span>
    </span>
  );
}

export function Field({ label, note, hint, children }: { label: string; note?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
        {note ? <span className="font-normal text-ink-3"> - {note}</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[13px] text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "block h-9 w-full rounded-control border border-line-strong bg-canvas px-3 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-ink-3";

export const textareaClass =
  "block w-full rounded-control border border-line-strong bg-canvas px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-ink-3";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={clsx(inputClass, props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={clsx(textareaClass, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={clsx(inputClass, "pr-8", props.className)} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-card border border-line-strong bg-canvas shadow-card", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[18px] leading-6 font-medium text-ink">{title}</h2>
      {description ? <p className="mt-1 text-[13px] leading-5 text-ink-3">{description}</p> : null}
    </div>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={clsx(
        "rounded-control px-3 py-2 text-[13px]",
        tone === "danger" ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
      )}
    >
      {children}
    </p>
  );
}
