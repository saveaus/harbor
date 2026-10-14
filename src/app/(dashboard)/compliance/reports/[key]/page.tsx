import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button, ButtonLink, Field, Input, Select } from "@/components/ui";
import {
  DOCUMENT_CATEGORIES,
  INCIDENT_CATEGORIES,
  INCIDENT_PRIORITY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  REPORTS,
  param,
  reportExportHref,
  reportKey,
} from "@/lib/compliance";
import { reportTable } from "@/lib/compliance-data";
import { requireApp } from "@/lib/workspace";
import { saveReport } from "../../actions";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { key: rawKey } = await params;
  const key = reportKey(rawKey);
  if (!key) notFound();
  const query = await searchParams;
  const filters = {
    status: param(query.status),
    priority: param(query.priority),
    severity: param(query.severity),
    category: param(query.category),
    from: param(query.from),
    to: param(query.to),
    q: param(query.q),
    window: param(query.window),
  };
  const ctx = await requireApp("compliance");
  const table = await reportTable(ctx, key, filters);
  if (!table) notFound();
  const report = REPORTS[key];
  const incidents = report.source === "incidents";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-9 py-3">
        <div>
          <Link href="/compliance/reports" className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink">
            <ChevronLeft size={14} /> Reports
          </Link>
          <h1 className="text-[16px] font-medium">{report.name}</h1>
        </div>
        <ButtonLink href={reportExportHref(key, filters)} variant="secondary">
          Export CSV
        </ButtonLink>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2 border-b border-line px-9 py-3">
        {incidents ? (
          <>
            {key === "open-incidents" ? null : (
              <Field label="Status">
                <Select name="status" defaultValue={filters.status}>
                  <option value="">Any</option>
                  {Object.entries(INCIDENT_STATUS).map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Priority">
              <Select name="priority" defaultValue={filters.priority}>
                <option value="">Any</option>
                {Object.entries(INCIDENT_PRIORITY).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Severity">
              <Select name="severity" defaultValue={filters.severity}>
                <option value="">Any</option>
                {Object.entries(INCIDENT_SEVERITY).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select name="category" defaultValue={filters.category}>
                <option value="">Any</option>
                {INCIDENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reported from">
              <Input type="date" name="from" defaultValue={filters.from} />
            </Field>
            <Field label="Reported to">
              <Input type="date" name="to" defaultValue={filters.to} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Category">
              <Select name="category" defaultValue={filters.category}>
                <option value="">Any</option>
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            {key === "reviews-due" ? (
              <Field label="Window">
                <Select name="window" defaultValue={filters.window || "30"}>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </Select>
              </Field>
            ) : null}
          </>
        )}
        <Field label="Search">
          <Input name="q" defaultValue={filters.q} placeholder="Search" />
        </Field>
        <Button type="submit" variant="primary">
          Apply
        </Button>
      </form>
      <div className="min-h-0 flex-1 overflow-auto px-9">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="sticky top-0 bg-canvas">
            <tr className="border-b border-line">
              {table.columns.map((column) => (
                <th key={column} className="h-10 px-3 font-normal whitespace-nowrap text-ink-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr>
                <td colSpan={table.columns.length} className="px-3 py-8 text-ink-3">
                  Nothing matches these filters.
                </td>
              </tr>
            ) : (
              table.rows.map((row, index) => (
                <tr key={index} className="border-b border-line">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-ink">
                      {cell || "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <form action={saveReport.bind(null, key)} className="flex flex-wrap items-center gap-2 border-t border-line px-9 py-3">
        {Object.entries(filters).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Input name="name" required maxLength={120} placeholder="Name this report" className="max-w-64" />
        <Button type="submit" variant="secondary">
          Save report
        </Button>
        <span className="text-[12px] text-ink-3">{table.rows.length} rows</span>
      </form>
    </div>
  );
}
