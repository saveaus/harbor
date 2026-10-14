import { INCIDENT_VIEWS, incidentView } from "@/lib/compliance";
import { labelMap, listIncidents, peopleOptions, type IncidentRow } from "@/lib/compliance-data";
import { csv, csvResponse } from "@/lib/csv";
import { formatDateTime } from "@/lib/compliance";
import { incidentCode, INCIDENT_PRIORITY, INCIDENT_SEVERITY, INCIDENT_STATUS } from "@/lib/compliance";
import { getWorkspace } from "@/lib/workspace";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function line(incident: IncidentRow, staff: Map<string, string>, clients: Map<string, string>): string[] {
  return [
    incidentCode(incident.number),
    incident.title,
    INCIDENT_STATUS[incident.status].label,
    INCIDENT_PRIORITY[incident.priority].label,
    INCIDENT_SEVERITY[incident.severity].label,
    incident.category,
    clients.get(incident.contact_id ?? "") ?? "",
    staff.get(incident.reported_by_id ?? "") ?? "",
    staff.get(incident.assigned_to_id ?? "") ?? "",
    incident.location,
    formatDateTime(incident.occurred_at),
    formatDateTime(incident.reported_at),
    incident.description,
  ];
}

export async function GET(request: Request) {
  const ctx = await getWorkspace();
  if (!ctx.installedApps.has("compliance")) return new Response("Compliance isn't installed", { status: 404 });
  const search = new URL(request.url).searchParams;
  const ids = search.getAll("ids").filter((id) => UUID.test(id)).slice(0, 500);
  const view = incidentView(search.get("view") ?? "");
  const [incidents, people] = await Promise.all([
    listIncidents(
      ctx,
      ids.length
        ? { ids }
        : { statuses: INCIDENT_VIEWS[view].statuses, q: search.get("q") ?? "" },
    ),
    peopleOptions(ctx),
  ]);
  const staff = labelMap(people.staff);
  const clients = labelMap(people.clients);
  const rows = [
    ["Number", "Title", "Status", "Priority", "Severity", "Category", "Client", "Reported by", "Assigned to", "Location", "Occurred", "Reported", "Description"],
    ...incidents.map((incident) => line(incident, staff, clients)),
  ];
  return csvResponse(csv(rows), "incidents.csv");
}
