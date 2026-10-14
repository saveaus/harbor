import type { ChipTone } from "@/lib/care";
import { isoDay } from "@/lib/care";
import type { Enums, Json } from "@/lib/supabase/database.types";

export const INCIDENT_STATUS: Record<Enums<"incident_status">, { label: string; tone: ChipTone }> = {
  triage: { label: "Triage", tone: "purple" },
  open: { label: "Open", tone: "blue" },
  resolving: { label: "Resolving", tone: "teal" },
  on_hold: { label: "On hold", tone: "amber" },
  resolved: { label: "Resolved", tone: "green" },
  not_an_incident: { label: "Not an incident", tone: "grey" },
  archived: { label: "Archived", tone: "grey" },
};

export const INCIDENT_PRIORITY: Record<Enums<"incident_priority">, { label: string; tone: ChipTone }> = {
  low: { label: "Low", tone: "grey" },
  medium: { label: "Medium", tone: "blue" },
  high: { label: "High", tone: "amber" },
  urgent: { label: "Urgent", tone: "red" },
};

export const INCIDENT_SEVERITY: Record<Enums<"incident_severity">, { label: string; tone: ChipTone }> = {
  minor: { label: "Minor", tone: "grey" },
  moderate: { label: "Moderate", tone: "amber" },
  major: { label: "Major", tone: "red" },
  critical: { label: "Critical", tone: "red" },
};

export const INCIDENT_CATEGORIES = [
  "Injury",
  "Medication",
  "Behaviour",
  "Missing person",
  "Abuse or neglect",
  "Property",
  "Illness",
  "Restrictive practice",
  "Complaint",
  "Other",
] as const;

export const OPEN_INCIDENT_STATUSES = ["triage", "open", "resolving", "on_hold"] as const satisfies readonly Enums<"incident_status">[];

export const INCIDENT_VIEWS = {
  open: { label: "Open", statuses: OPEN_INCIDENT_STATUSES },
  all: {
    label: "All records",
    statuses: ["triage", "open", "resolving", "on_hold", "resolved", "not_an_incident"] as const,
  },
  triage: { label: "Triage", statuses: ["triage"] as const },
  resolved: { label: "Resolved", statuses: ["resolved"] as const },
  dismissed: { label: "Not an incident", statuses: ["not_an_incident"] as const },
  archived: { label: "Archived", statuses: ["archived"] as const },
} satisfies Record<string, { label: string; statuses: readonly Enums<"incident_status">[] }>;

export type IncidentView = keyof typeof INCIDENT_VIEWS;

export function incidentView(value: string): IncidentView {
  return value in INCIDENT_VIEWS ? (value as IncidentView) : "open";
}

export const BOARD_GROUPS = {
  status: "Status",
  priority: "Priority",
  severity: "Severity",
  category: "Category",
  assigned: "Assigned to",
  reported: "Reported by",
} as const;

export type BoardGroup = keyof typeof BOARD_GROUPS;

export function boardGroup(value: string): BoardGroup {
  return value in BOARD_GROUPS ? (value as BoardGroup) : "status";
}

export function listLayout(value: string): "table" | "board" {
  return value === "board" ? "board" : "table";
}

export function incidentCode(number: number): string {
  return `INC-${String(number).padStart(4, "0")}`;
}

export function incidentListHref(input: { view?: string; layout?: string; group?: string; q?: string } = {}): string {
  const params = new URLSearchParams();
  const view = input.view ?? "open";
  const layout = input.layout ?? "table";
  const group = input.group ?? "status";
  if (view !== "open") params.set("view", view);
  if (layout === "board") params.set("layout", "board");
  if (layout === "board" && group !== "status") params.set("group", group);
  if (input.q) params.set("q", input.q);
  const query = params.toString();
  return query ? `/compliance/incidents?${query}` : "/compliance/incidents";
}

export function incidentExportHref(input: { view?: string; layout?: string; group?: string; q?: string } = {}): string {
  const query = incidentListHref(input).split("?")[1];
  return query ? `/compliance/incidents/export?${query}` : "/compliance/incidents/export";
}

export const DOCUMENT_CATEGORIES = ["Policy", "Procedure", "Register", "Form", "Certificate", "Other"] as const;

export const COMPANY_DOCUMENT_STATUS: Record<Enums<"company_document_status">, string> = {
  draft: "Draft",
  current: "Current",
  archived: "Archived",
};

export type DocumentState = "draft" | "archived" | "expired" | "review_due" | "due_soon" | "current";

const DOCUMENT_STATE: Record<DocumentState, { label: string; tone: ChipTone }> = {
  draft: { label: "Draft", tone: "grey" },
  archived: { label: "Archived", tone: "grey" },
  expired: { label: "Expired", tone: "red" },
  review_due: { label: "Review due", tone: "amber" },
  due_soon: { label: "Due soon", tone: "amber" },
  current: { label: "Current", tone: "green" },
};

export function companyDocumentState(doc: {
  status: Enums<"company_document_status">;
  review_on: string | null;
  expires_on: string | null;
}): { key: DocumentState; label: string; tone: ChipTone } {
  switch (doc.status) {
    case "archived":
      return { key: "archived", ...DOCUMENT_STATE.archived };
    case "draft":
      return { key: "draft", ...DOCUMENT_STATE.draft };
    case "current": {
      const today = isoDay();
      const soon = isoDay(30);
      if (doc.expires_on && doc.expires_on < today) return { key: "expired", ...DOCUMENT_STATE.expired };
      if (doc.review_on && doc.review_on < today) return { key: "review_due", ...DOCUMENT_STATE.review_due };
      if ((doc.expires_on && doc.expires_on <= soon) || (doc.review_on && doc.review_on <= soon))
        return { key: "due_soon", ...DOCUMENT_STATE.due_soon };
      return { key: "current", ...DOCUMENT_STATE.current };
    }
    default: {
      const exhaustive: never = doc.status;
      return exhaustive;
    }
  }
}

export const DOCUMENT_VIEWS = {
  all: "All documents",
  current: "Current",
  attention: "Needs attention",
  drafts: "Drafts",
  archived: "Archived",
} as const;

export type DocumentView = keyof typeof DOCUMENT_VIEWS;

export function documentView(value: string): DocumentView {
  return value in DOCUMENT_VIEWS ? (value as DocumentView) : "all";
}

export function documentMatches(view: DocumentView, state: DocumentState, status: Enums<"company_document_status">): boolean {
  switch (view) {
    case "all":
      return status !== "archived";
    case "current":
      return state === "current";
    case "attention":
      return state === "expired" || state === "review_due" || state === "due_soon";
    case "drafts":
      return status === "draft";
    case "archived":
      return status === "archived";
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

export function documentListHref(view = "all", q = ""): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/compliance/documents?${query}` : "/compliance/documents";
}

export const REPORTS = {
  "incident-register": {
    name: "Incident register",
    summary: "Incidents with status, severity, people and dates. Filter it, save it, or export it.",
    source: "incidents",
  },
  "open-incidents": {
    name: "Open incidents",
    summary: "Incidents still in triage, open, resolving or on hold.",
    source: "incidents",
  },
  "document-register": {
    name: "Company documents",
    summary: "The documents this organisation keeps, with review and expiry dates.",
    source: "documents",
  },
  "reviews-due": {
    name: "Reviews and expiries",
    summary: "Current documents that are expired, due for review, or coming due.",
    source: "documents",
  },
} as const;

export type ReportKey = keyof typeof REPORTS;

export function reportKey(value: string): ReportKey | null {
  return Object.hasOwn(REPORTS, value) ? (value as ReportKey) : null;
}

const FILTER_KEYS = ["status", "priority", "severity", "category", "from", "to", "q", "window"] as const;

export function savedFilters(value: Json): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const filters: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.length <= 80 && (FILTER_KEYS as readonly string[]).includes(key)) filters[key] = item;
  }
  return filters;
}

export function reportHref(key: ReportKey, filters: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  for (const name of FILTER_KEYS) {
    const value = filters[name];
    if (value) params.set(name, value);
  }
  const query = params.toString();
  return query ? `/compliance/reports/${key}?${query}` : `/compliance/reports/${key}`;
}

export function reportExportHref(key: ReportKey, filters: Record<string, string> = {}): string {
  const query = reportHref(key, filters).split("?")[1];
  const path = `/compliance/reports/${key}/export`;
  return query ? `${path}?${query}` : path;
}

export function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function likeTerm(value: string): string {
  return value.replace(/[%_,]/g, " ").trim().slice(0, 80);
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function localInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 48) return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const left = hours % 24;
  return left ? `${days}d ${left}h` : `${days}d`;
}

export function statusDurations(
  events: { status: Enums<"incident_status">; started_at: string }[],
  now = Date.now(),
): { status: Enums<"incident_status">; ms: number; current: boolean }[] {
  const sorted = [...events].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const totals = new Map<Enums<"incident_status">, number>();
  for (let index = 0; index < sorted.length; index += 1) {
    const event = sorted[index];
    if (!event) continue;
    const start = new Date(event.started_at).getTime();
    const next = sorted[index + 1];
    const end = next ? new Date(next.started_at).getTime() : now;
    totals.set(event.status, (totals.get(event.status) ?? 0) + Math.max(0, end - start));
  }
  const current = sorted.at(-1)?.status;
  return (Object.keys(INCIDENT_STATUS) as Enums<"incident_status">[])
    .filter((status) => totals.has(status))
    .map((status) => ({ status, ms: totals.get(status) ?? 0, current: status === current }));
}
