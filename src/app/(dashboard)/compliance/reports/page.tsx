import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { buttonClass } from "@/components/ui";
import { REPORTS, reportHref, reportKey, savedFilters } from "@/lib/compliance";
import { formatDate } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { deleteSavedReport } from "../actions";

export default async function ReportsPage() {
  const { supabase, workspace } = await requireApp("compliance");
  const { data, error } = await supabase
    .from("saved_reports")
    .select("id, name, report_key, filters, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-9 py-8">
        <p className="max-w-2xl text-[13px] leading-5 text-ink-3">
          Incident and document registers you can filter, save, and export. Saved reports remember the filters, not a frozen copy of the rows.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {(Object.keys(REPORTS) as (keyof typeof REPORTS)[]).map((key) => (
            <li key={key}>
              <Link href={reportHref(key)} className="block rounded-card border border-line-strong p-4 transition-colors hover:bg-hover">
                <span className="text-[14px] font-medium text-ink">{REPORTS[key].name}</span>
                <p className="mt-1 text-[13px] leading-5 text-ink-3">{REPORTS[key].summary}</p>
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="mt-10 text-[16px] font-medium">Saved reports</h2>
        {data.length === 0 ? <p className="mt-2 text-[13px] text-ink-3">Save a filtered report from any report page.</p> : null}
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {data.map((saved) => {
            const key = reportKey(saved.report_key);
            if (!key) return null;
            return (
              <li key={saved.id} className="-mx-2 flex items-center gap-3 rounded-control px-2 py-2.5 hover:bg-hover">
                <div className="min-w-0 flex-1">
                  <Link href={reportHref(key, savedFilters(saved.filters))} className="text-[13px] font-medium text-ink">
                    {saved.name}
                  </Link>
                  <p className="text-[12px] text-ink-3">
                    {REPORTS[key].name} · {formatDate(saved.created_at)}
                  </p>
                </div>
                <form action={deleteSavedReport.bind(null, saved.id)}>
                  <ConfirmSubmit confirm={`Delete the saved report “${saved.name}”?`} label="Delete saved report" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                    <Trash2 size={14} />
                  </ConfirmSubmit>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
