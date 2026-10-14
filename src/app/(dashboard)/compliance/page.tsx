import Link from "next/link";
import { Chip, GridCell, GridNameCell, GridRow, GridTable } from "@/components/record-list";
import {
  EVIDENCE_AREA,
  EVIDENCE_STATUS,
  evidenceArea,
  openItems,
  openStatus,
  summariseReadiness,
} from "@/lib/audit-readiness";
import { loadReadiness } from "@/lib/audit-readiness-data";
import { formatDay } from "@/lib/format";
import { auditPath, REGISTRATION_GROUPS } from "@/lib/ndis-registration";
import { param } from "@/lib/compliance";
import { requireApp } from "@/lib/workspace";
import { GroupsForm } from "./groups-form";
import { ReadinessCharts } from "./readiness-charts";

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const area = evidenceArea(param(params.area));
  const status = openStatus(param(params.status));
  const ctx = await requireApp("compliance");
  const { groups, items } = await loadReadiness(ctx);
  const path = auditPath(groups);
  const counts = summariseReadiness(items);
  const rows = openItems(items).filter((item) => (!area || item.area === area) && (!status || item.status === status));
  const canEdit = ctx.member.role !== "member";
  const error = param(params.error);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {error ? <p className="border-b border-line px-9 py-3 text-[13px] text-danger">{error}</p> : null}
      {groups.length === 0 ? (
        <>
          <div className="px-9 py-8">
            <h1 className="text-[20px] leading-7 font-medium text-ink">Audit readiness</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-ink-3">
              A provider is registered for specific registration groups. Those groups decide which items apply. Until they
              are set, there is no checklist. This is preparation, not an NDIS Commission audit.
            </p>
          </div>
          <GroupsForm selected={groups} canEdit={canEdit} />
        </>
      ) : (
        <>
          <div className="border-b border-line px-9 py-5">
            <p className="text-[13px] text-ink-3">
              {path === "certification" ? "Certification" : "Verification"} for{" "}
              {groups.map((code) => REGISTRATION_GROUPS[code].name).join(", ")}. Current means the record exists, is
              accepted, and is still in date. A draft does not count. This is evidence, not an audit certificate.
            </p>
          </div>
          <ReadinessCharts counts={counts} />
          <div className="flex min-h-0 flex-1 flex-col">
            {rows.length === 0 ? (
              <p className="px-9 py-8 text-[13px] text-ink-3">
                {items.every((item) => item.status === "current")
                  ? "Every required item is current. The records stay in Documents, Staff, Clients, and Incidents."
                  : "No open items match that filter."}{" "}
                {(area || status) && (
                  <Link href="/compliance" className="text-ink underline">
                    Show all open items
                  </Link>
                )}
              </p>
            ) : (
              <GridTable
                label="Open items"
                footer={`${rows.length} open · overdue, missing, not accepted, then lapsing`}
                columns={[
                  { label: "Record" },
                  { label: "Area" },
                  { label: "Person", priority: "lg" },
                  { label: "Date", priority: "xl" },
                  { label: "Status" },
                ]}
              >
                {rows.map((item) => (
                  <GridRow key={item.id} href={item.href} label={item.title}>
                    <GridNameCell name={item.title} />
                    <GridCell>{EVIDENCE_AREA[item.area]}</GridCell>
                    <GridCell priority="lg">{item.person ?? "Organisation"}</GridCell>
                    <GridCell priority="xl">{formatDay(item.date)}</GridCell>
                    <GridCell>
                      <Chip tone={EVIDENCE_STATUS[item.status].tone}>{EVIDENCE_STATUS[item.status].label}</Chip>
                    </GridCell>
                  </GridRow>
                ))}
              </GridTable>
            )}
          </div>
          <details className="border-t border-line">
            <summary className="cursor-pointer px-9 py-4 text-[13px] text-ink-3 hover:text-ink">Change registration groups</summary>
            <GroupsForm selected={groups} canEdit={canEdit} />
          </details>
        </>
      )}
    </div>
  );
}
