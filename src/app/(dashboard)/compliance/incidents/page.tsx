import Link from "next/link";
import { LayoutGrid, Plus, Table2, TriangleAlert } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { ListSearch } from "@/components/list-search";
import { Chip, GridCell, GridNameCell, GridRow, GridTable, ViewBar } from "@/components/record-list";
import { BulkBar, RowCheckbox, SelectAllCheckbox, SelectionProvider } from "@/components/row-selection";
import { EmptyState, buttonClass } from "@/components/ui";
import {
  BOARD_GROUPS,
  INCIDENT_PRIORITY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  INCIDENT_VIEWS,
  boardGroup,
  formatDateTime,
  incidentCode,
  incidentExportHref,
  incidentListHref,
  incidentView,
  listLayout,
  param,
  type BoardGroup,
} from "@/lib/compliance";
import { labelMap, listIncidents, peopleOptions, type IncidentRow } from "@/lib/compliance-data";
import { requireApp } from "@/lib/workspace";
import { bulkSetIncidentStatus, createIncident } from "../actions";
import { ExportSelected } from "../export-selected";
import { IncidentFields } from "./fields";

function NewIncident({ clients, staff }: { clients: { id: string; label: string }[]; staff: { id: string; label: string }[] }) {
  return (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New incident
        </>
      }
      title="Report an incident"
      description="It opens in triage so someone can confirm it and assign it."
      action={createIncident}
      submitLabel="Create incident"
    >
      <IncidentFields clients={clients} staff={staff} />
    </FormDialog>
  );
}

function groupValue(incident: IncidentRow, group: BoardGroup, staff: Map<string, string>): string {
  switch (group) {
    case "status":
      return incident.status;
    case "priority":
      return incident.priority;
    case "severity":
      return incident.severity;
    case "category":
      return incident.category;
    case "assigned":
      return staff.get(incident.assigned_to_id ?? "") ?? "Unassigned";
    case "reported":
      return staff.get(incident.reported_by_id ?? "") ?? "Not recorded";
    default: {
      const exhaustive: never = group;
      return exhaustive;
    }
  }
}

function groupLabel(group: BoardGroup, value: string): string {
  switch (group) {
    case "status":
      return value in INCIDENT_STATUS ? INCIDENT_STATUS[value as keyof typeof INCIDENT_STATUS].label : value;
    case "priority":
      return value in INCIDENT_PRIORITY ? INCIDENT_PRIORITY[value as keyof typeof INCIDENT_PRIORITY].label : value;
    case "severity":
      return value in INCIDENT_SEVERITY ? INCIDENT_SEVERITY[value as keyof typeof INCIDENT_SEVERITY].label : value;
    case "category":
    case "assigned":
    case "reported":
      return value;
    default: {
      const exhaustive: never = group;
      return exhaustive;
    }
  }
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = incidentView(param(params.view));
  const layout = listLayout(param(params.layout));
  const group = boardGroup(param(params.group));
  const q = param(params.q).trim();
  const ctx = await requireApp("compliance");
  const [incidents, people] = await Promise.all([
    listIncidents(ctx, { statuses: INCIDENT_VIEWS[view].statuses, q }),
    peopleOptions(ctx),
  ]);
  const staff = labelMap(people.staff);
  const clients = labelMap(people.clients);
  const href = { view, layout, group, q };
  const keep = new URLSearchParams();
  if (view !== "open") keep.set("view", view);
  if (layout === "board") keep.set("layout", "board");
  if (layout === "board" && group !== "status") keep.set("group", group);

  return (
    <SelectionProvider ids={incidents.map((incident) => incident.id)}>
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewBar
        active={incidentListHref(href)}
        views={(Object.keys(INCIDENT_VIEWS) as (keyof typeof INCIDENT_VIEWS)[]).map((key) => ({
          href: incidentListHref({ view: key, layout, group, q }),
          label: INCIDENT_VIEWS[key].label,
        }))}
      >
        <NewIncident clients={people.clients} staff={people.staff} />
        <Link href={incidentListHref({ view, layout: "table", q })} className={buttonClass(layout === "table" ? "primary" : "secondary")} aria-current={layout === "table" ? "page" : undefined}>
          <Table2 size={14} /> Table
        </Link>
        <Link href={incidentListHref({ view, layout: "board", group, q })} className={buttonClass(layout === "board" ? "primary" : "secondary")} aria-current={layout === "board" ? "page" : undefined}>
          <LayoutGrid size={14} /> Board
        </Link>
        <ListSearch path="/compliance/incidents" q={q} keep={keep.toString()} placeholder="Search incidents" />
        {incidents.length > 0 ? <ExportSelected href={incidentExportHref(href)} /> : null}
      </ViewBar>

      {incidents.length === 0 ? (
        <EmptyState
          icon={<TriangleAlert size={18} />}
          title={q ? "No incidents match that search" : "No incidents in this view"}
          body="Report an incident when something happens that needs a record, a follow-up, or a notification. Triage is where new reports wait."
          action={<NewIncident clients={people.clients} staff={people.staff} />}
        />
      ) : layout === "board" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="flex gap-1 px-9 pt-3">
            {(Object.keys(BOARD_GROUPS) as BoardGroup[]).map((key) => (
              <Link key={key} href={incidentListHref({ view, layout: "board", group: key, q })} className={buttonClass(group === key ? "primary" : "ghost")}>
                {BOARD_GROUPS[key]}
              </Link>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto px-9 py-4">
            {boardColumns(incidents, group, view, staff).map((column) => (
              <section key={column.key} className="w-72 shrink-0">
                <h2 className="mb-2 flex items-center justify-between text-[12px] font-medium text-ink-3">
                  {column.label}
                  <span>{column.items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {column.items.map((incident) => (
                    <li key={incident.id}>
                      <Link href={`/compliance/incidents/${incident.id}`} className="block rounded-card border border-line-strong bg-canvas p-3 hover:bg-hover">
                        <div className="text-[12px] text-ink-3">{incidentCode(incident.number)}</div>
                        <div className="mt-0.5 font-medium text-ink">{incident.title}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Chip tone={INCIDENT_PRIORITY[incident.priority].tone}>{INCIDENT_PRIORITY[incident.priority].label}</Chip>
                          <Chip tone={INCIDENT_SEVERITY[incident.severity].tone}>{INCIDENT_SEVERITY[incident.severity].label}</Chip>
                        </div>
                        <p className="mt-2 truncate text-[12px] text-ink-3">{clients.get(incident.contact_id ?? "") || incident.category}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <>
          <GridTable
            label="Incidents"
            footer={`${incidents.length} incident${incidents.length === 1 ? "" : "s"}${incidents.length === 500 ? " · showing the latest 500" : ""}`}
            columns={[
              { label: "Incident", leading: <SelectAllCheckbox label="Select all incidents" /> },
              { label: "Status" },
              { label: "Priority" },
              { label: "Severity", priority: "lg" },
              { label: "Category", priority: "xl" },
              { label: "Client", priority: "lg" },
              { label: "Assigned", priority: "xl" },
              { label: "Reported", priority: "xl" },
            ]}
          >
            {incidents.map((incident) => (
              <GridRow key={incident.id} href={`/compliance/incidents/${incident.id}`} label={incident.title}>
                <GridNameCell
                  name={incident.title}
                  detail={incidentCode(incident.number)}
                  leading={<RowCheckbox id={incident.id} label={`Select ${incident.title}`} />}
                />
                <GridCell>
                  <Chip tone={INCIDENT_STATUS[incident.status].tone}>{INCIDENT_STATUS[incident.status].label}</Chip>
                </GridCell>
                <GridCell>
                  <Chip tone={INCIDENT_PRIORITY[incident.priority].tone}>{INCIDENT_PRIORITY[incident.priority].label}</Chip>
                </GridCell>
                <GridCell priority="lg">
                  <Chip tone={INCIDENT_SEVERITY[incident.severity].tone}>{INCIDENT_SEVERITY[incident.severity].label}</Chip>
                </GridCell>
                <GridCell priority="xl">{incident.category}</GridCell>
                <GridCell priority="lg">{clients.get(incident.contact_id ?? "")}</GridCell>
                <GridCell priority="xl">{staff.get(incident.assigned_to_id ?? "")}</GridCell>
                <GridCell priority="xl">{formatDateTime(incident.reported_at)}</GridCell>
              </GridRow>
            ))}
          </GridTable>
          <BulkBar
            noun={["incident", "incidents"]}
            actions={[
              {
                label: "Set status",
                action: bulkSetIncidentStatus,
                choices: Object.entries(INCIDENT_STATUS).map(([value, option]) => ({ value, label: option.label })),
              },
            ]}
          />
        </>
      )}
    </div>
    </SelectionProvider>
  );
}

function boardColumns(incidents: IncidentRow[], group: BoardGroup, view: keyof typeof INCIDENT_VIEWS, staff: Map<string, string>) {
  if (group === "status") {
    return INCIDENT_VIEWS[view].statuses.map((status) => ({
      key: status,
      label: INCIDENT_STATUS[status].label,
      items: incidents.filter((incident) => incident.status === status),
    }));
  }
  const grouped = new Map<string, IncidentRow[]>();
  for (const incident of incidents) {
    const key = groupValue(incident, group, staff);
    grouped.set(key, [...(grouped.get(key) ?? []), incident]);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({ key, label: groupLabel(group, key), items }));
}
