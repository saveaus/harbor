import { enumValue, isoDay, parseDay } from "@/lib/care";
import {
  COMPANY_DOCUMENT_STATUS,
  INCIDENT_PRIORITY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  OPEN_INCIDENT_STATUSES,
  companyDocumentState,
  formatDateTime,
  incidentCode,
  likeTerm,
  reportKey,
  type ReportKey,
} from "@/lib/compliance";
import { formatDay, personName } from "@/lib/format";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";

export type PersonOption = { id: string; label: string };

export async function peopleOptions(ctx: WorkspaceContext): Promise<{ clients: PersonOption[]; staff: PersonOption[] }> {
  const [clients, staff] = await Promise.all([
    ctx.supabase.from("contacts").select("id, first_name, last_name, email").eq("workspace_id", ctx.workspace.id).order("first_name"),
    ctx.supabase.from("staff").select("id, first_name, last_name, email").eq("workspace_id", ctx.workspace.id).order("first_name"),
  ]);
  if (clients.error) throw clients.error;
  if (staff.error) throw staff.error;
  const option = (person: { id: string; first_name: string; last_name: string; email: string }): PersonOption => ({
    id: person.id,
    label: personName(person),
  });
  return { clients: clients.data.map(option), staff: staff.data.map(option) };
}

export function labelMap(people: PersonOption[]): Map<string, string> {
  return new Map(people.map((person) => [person.id, person.label]));
}

export type IncidentRow = Pick<
  Tables<"incidents">,
  | "id"
  | "number"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "severity"
  | "category"
  | "location"
  | "occurred_at"
  | "reported_at"
  | "contact_id"
  | "reported_by_id"
  | "assigned_to_id"
>;

export type IncidentQuery = {
  statuses?: readonly Enums<"incident_status">[];
  q?: string;
  ids?: string[];
  priority?: Enums<"incident_priority"> | "";
  severity?: Enums<"incident_severity"> | "";
  category?: string;
  from?: string;
  to?: string;
};

const INCIDENT_COLUMNS =
  "id, number, title, description, status, priority, severity, category, location, occurred_at, reported_at, contact_id, reported_by_id, assigned_to_id";

export async function listIncidents(ctx: WorkspaceContext, query: IncidentQuery = {}): Promise<IncidentRow[]> {
  if (query.ids && query.ids.length === 0) return [];
  let request = ctx.supabase
    .from("incidents")
    .select(INCIDENT_COLUMNS)
    .eq("workspace_id", ctx.workspace.id)
    .order("reported_at", { ascending: false })
    .limit(500);
  if (query.ids?.length) request = request.in("id", query.ids);
  if (query.statuses?.length) request = request.in("status", [...query.statuses]);
  if (query.priority) request = request.eq("priority", query.priority);
  if (query.severity) request = request.eq("severity", query.severity);
  if (query.category) request = request.eq("category", query.category);
  if (query.from) request = request.gte("reported_at", `${query.from}T00:00:00.000Z`);
  if (query.to) request = request.lte("reported_at", `${query.to}T23:59:59.999Z`);
  const term = likeTerm(query.q ?? "");
  if (term) request = request.or(`title.ilike.%${term}%,category.ilike.%${term}%,location.ilike.%${term}%,description.ilike.%${term}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function getIncident(ctx: WorkspaceContext, id: string): Promise<Tables<"incidents"> | null> {
  const { data, error } = await ctx.supabase.from("incidents").select("*").eq("workspace_id", ctx.workspace.id).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listIncidentNotes(ctx: WorkspaceContext, incidentId: string): Promise<Tables<"incident_notes">[]> {
  const { data, error } = await ctx.supabase
    .from("incident_notes")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listStatusEvents(ctx: WorkspaceContext, incidentId: string): Promise<Tables<"incident_status_events">[]> {
  const { data, error } = await ctx.supabase
    .from("incident_status_events")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("incident_id", incidentId)
    .order("started_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listDocuments(ctx: WorkspaceContext, q = ""): Promise<Tables<"company_documents">[]> {
  let request = ctx.supabase
    .from("company_documents")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("updated_at", { ascending: false })
    .limit(500);
  const term = likeTerm(q);
  if (term) request = request.or(`title.ilike.%${term}%,category.ilike.%${term}%,reference.ilike.%${term}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function getDocument(ctx: WorkspaceContext, id: string): Promise<Tables<"company_documents"> | null> {
  const { data, error } = await ctx.supabase
    .from("company_documents")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function incidentFilters(key: ReportKey, filters: Record<string, string>): IncidentQuery {
  const priority = enumValue(INCIDENT_PRIORITY, filters.priority ?? "");
  const severity = enumValue(INCIDENT_SEVERITY, filters.severity ?? "");
  const from = filters.from ? parseDay(filters.from) : null;
  const to = filters.to ? parseDay(filters.to) : null;
  const query: IncidentQuery = {
    q: filters.q,
    priority: priority ?? "",
    severity: severity ?? "",
    category: filters.category,
    from: from && "value" in from ? (from.value ?? undefined) : undefined,
    to: to && "value" in to ? (to.value ?? undefined) : undefined,
  };
  if (key === "open-incidents") query.statuses = OPEN_INCIDENT_STATUSES;
  else if (filters.status) {
    const status = enumValue(INCIDENT_STATUS, filters.status);
    if (status) query.statuses = [status];
  }
  return query;
}

function names(staff: Map<string, string>, clients: Map<string, string>, incident: IncidentRow): string[] {
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
  ];
}

const INCIDENT_COLUMNS_LABELS = [
  "Number",
  "Title",
  "Status",
  "Priority",
  "Severity",
  "Category",
  "Client",
  "Reported by",
  "Assigned to",
  "Location",
  "Occurred",
  "Reported",
];

const DOCUMENT_COLUMNS = ["Title", "Category", "State", "Record status", "Owner", "Reference", "Issued", "Review due", "Expires"];

export async function reportTable(
  ctx: WorkspaceContext,
  key: string,
  filters: Record<string, string>,
): Promise<{ title: string; columns: string[]; rows: string[][] } | null> {
  const report = reportKey(key);
  if (!report) return null;
  const { clients, staff } = await peopleOptions(ctx);
  const staffNames = labelMap(staff);
  const clientNames = labelMap(clients);
  switch (report) {
    case "incident-register":
    case "open-incidents": {
      const incidents = await listIncidents(ctx, incidentFilters(report, filters));
      return {
        title: report === "open-incidents" ? "Open incidents" : "Incident register",
        columns: INCIDENT_COLUMNS_LABELS,
        rows: incidents.map((incident) => names(staffNames, clientNames, incident)),
      };
    }
    case "document-register":
    case "reviews-due": {
      const documents = await documentsForReport(ctx, report, filters);
      return {
        title: report === "reviews-due" ? "Reviews and expiries" : "Company documents",
        columns: DOCUMENT_COLUMNS,
        rows: documents.map((doc) => {
          const state = companyDocumentState(doc);
          return [
            doc.title,
            doc.category,
            state.label,
            COMPANY_DOCUMENT_STATUS[doc.status],
            staffNames.get(doc.owner_id ?? "") ?? "",
            doc.reference,
            formatDay(doc.issued_on),
            formatDay(doc.review_on),
            formatDay(doc.expires_on),
          ];
        }),
      };
    }
    default: {
      const exhaustive: never = report;
      return exhaustive;
    }
  }
}

async function documentsForReport(ctx: WorkspaceContext, key: "document-register" | "reviews-due", filters: Record<string, string>) {
  let request = ctx.supabase.from("company_documents").select("*").eq("workspace_id", ctx.workspace.id).limit(500);
  const term = likeTerm(filters.q ?? "");
  if (filters.category) request = request.eq("category", filters.category);
  if (term) request = request.or(`title.ilike.%${term}%,category.ilike.%${term}%,reference.ilike.%${term}%`);
  if (key === "reviews-due") {
    const windowDays = filters.window === "60" ? 60 : filters.window === "90" ? 90 : 30;
    const until = isoDay(windowDays);
    request = request.eq("status", "current").or(`review_on.lte.${until},expires_on.lte.${until}`).order("review_on", { ascending: true, nullsFirst: false });
  } else {
    request = request.order("title");
  }
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
