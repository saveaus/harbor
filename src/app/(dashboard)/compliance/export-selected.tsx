"use client";

import { Download } from "lucide-react";
import { useSelection } from "@/components/row-selection";
import { buttonClass } from "@/components/ui";

/** Exports the current list, or only the ticked rows when any are selected. */
export function ExportSelected({ href }: { href: string }) {
  const { selected } = useSelection();
  const url = new URL(href, "http://localhost");
  if (selected.size > 0) {
    url.searchParams.delete("ids");
    for (const id of selected) url.searchParams.append("ids", id);
  }
  return (
    <a className={buttonClass("secondary")} href={`${url.pathname}${url.search}`}>
      <Download size={14} /> {selected.size > 0 ? "Export selected" : "Export CSV"}
    </a>
  );
}
