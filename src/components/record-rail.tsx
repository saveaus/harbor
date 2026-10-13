import Link from "next/link";
import { clsx } from "clsx";
import { NotebookPen, PanelRight } from "lucide-react";
import { Avatar } from "./ui";

/** The narrow right-hand rail that opens a client record's details or team notes. */
export function RecordRail({
  name,
  detailsLabel,
  detailsHref,
  notesHref,
  active,
}: {
  name: string;
  detailsLabel: string;
  detailsHref: string;
  notesHref: string;
  active?: "details" | "notes";
}) {
  const items = [
    { key: "details", label: detailsLabel, href: detailsHref, icon: PanelRight },
    { key: "notes", label: "Notes", href: notesHref, icon: NotebookPen },
  ] as const;
  return (
    <nav aria-label="Record panels" className="flex w-[45px] shrink-0 flex-col items-center gap-2 border-l border-line pt-3">
      <Avatar name={name} />
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-label={item.label}
          aria-current={active === item.key ? "page" : undefined}
          className={clsx(
            "flex size-7 items-center justify-center rounded-control hover:bg-hover",
            active === item.key ? "bg-hover text-ink" : "text-ink-3",
          )}
        >
          <item.icon size={15} strokeWidth={1.75} />
        </Link>
      ))}
    </nav>
  );
}
