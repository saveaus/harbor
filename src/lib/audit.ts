import type { Json } from "./supabase/database.types";

const ENTITY_LABELS: Record<string, string> = {
  companies: "company",
  contacts: "client",
  client_profiles: "client care details",
  client_finance: "client bank details",
  client_staff_preferences: "staff preference",
  client_list_members: "list membership",
  care_plans: "care plan",
  client_goals: "goal",
  client_observations: "observation",
  client_documents: "document",
  client_contacts: "contact",
  record_notes: "note",
  staff: "staff member",
  staff_credentials: "staff document",
  staff_leave: "leave",
  staff_availability: "availability",
  staff_finance: "finance details",
  products: "service",
  invoices: "invoice",
  subscriptions: "subscription",
  payment_links: "payment link",
  contract_templates: "contract template",
  contracts: "contract",
  forms: "form",
  help_articles: "help article",
  incidents: "incident",
  incident_notes: "incident note",
  company_documents: "company document",
  saved_reports: "saved report",
  app_installs: "app",
  custom_apps: "custom app",
  automations: "automation",
  workspace_members: "workspace access",
  invites: "invite",
  workspace_registration_groups: "registration group",
  workspaces: "workspace settings",
  api_keys: "API key",
};

const VERBS = { insert: "Added", update: "Updated", delete: "Deleted" } as const;

export function describeAuditEvent(action: string, entity: string): string {
  const verb = action in VERBS ? VERBS[action as keyof typeof VERBS] : action;
  return `${verb} ${ENTITY_LABELS[entity] ?? entity.replaceAll("_", " ")}`;
}

export type AuditChange = { field: string; from: string; to: string } | { field: string; hidden: true };

const isRecord = (value: Json | undefined): value is { [key: string]: Json | undefined } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function show(value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return value.length ? value.map(show).join(", ") : "empty";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

/** Field-level changes recorded by the audit trigger as `{field: {from, to}}` or `{field: {hidden: true}}`. */
export function auditChanges(changes: Json | null): AuditChange[] {
  if (!isRecord(changes)) return [];
  return Object.entries(changes).flatMap(([key, change]): AuditChange[] => {
    if (!isRecord(change)) return [];
    const field = key.replaceAll("_", " ");
    if (change.hidden === true) return [{ field, hidden: true }];
    return [{ field, from: show(change.from), to: show(change.to) }];
  });
}
