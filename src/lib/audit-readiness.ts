import type { ChipTone } from "@/lib/care";
import { isoDay } from "@/lib/care";
import type { Enums } from "@/lib/supabase/database.types";
import { documentMatchesPolicy, type PolicyRequirement } from "@/lib/ndis-registration";

export const EVIDENCE_STATUS = {
  overdue: { label: "Overdue", tone: "red" },
  missing: { label: "Missing", tone: "grey" },
  not_accepted: { label: "Not accepted", tone: "amber" },
  lapsing: { label: "Lapsing", tone: "amber" },
  current: { label: "Current", tone: "green" },
} as const satisfies Record<string, { label: string; tone: ChipTone }>;

export type EvidenceStatus = keyof typeof EVIDENCE_STATUS;

export const OPEN_EVIDENCE = ["overdue", "missing", "not_accepted", "lapsing"] as const;

export type OpenEvidence = (typeof OPEN_EVIDENCE)[number];

export const EVIDENCE_AREA = {
  policies: "Policies",
  worker_credentials: "Worker credentials",
  service_agreements: "Service agreements",
  support_plans: "Support plans",
  registers: "Registers",
} as const;

export type EvidenceArea = keyof typeof EVIDENCE_AREA;

export type EvidenceItem = {
  id: string;
  area: EvidenceArea;
  title: string;
  person: string | null;
  date: string | null;
  status: EvidenceStatus;
  href: string;
};

const LAPSING_DAYS = 30;

export function dateState(day: string | null, today: string, soon: string): Extract<EvidenceStatus, "current" | "lapsing" | "overdue"> {
  if (!day) return "current";
  if (day < today) return "overdue";
  if (day <= soon) return "lapsing";
  return "current";
}

function better(left: EvidenceStatus, right: EvidenceStatus): EvidenceStatus {
  const rank: Record<EvidenceStatus, number> = { current: 0, lapsing: 1, overdue: 2, not_accepted: 3, missing: 4 };
  return rank[left] <= rank[right] ? left : right;
}

export function datedRecordState(input: {
  accepted: boolean;
  day: string | null;
  today: string;
  soon: string;
}): EvidenceStatus {
  if (!input.accepted) return "not_accepted";
  return dateState(input.day, input.today, input.soon);
}

export function scorePolicy(docs: { title: string; category: string; status: Enums<"company_document_status">; review_on: string | null; expires_on: string | null }[], requirement: PolicyRequirement, today: string, soon: string): EvidenceStatus {
  const matches = docs.filter((doc) => doc.status !== "archived" && documentMatchesPolicy(doc.title, doc.category, requirement.needles));
  if (matches.length === 0) return "missing";
  return matches.reduce<EvidenceStatus>((best, doc) => {
    const due = [doc.review_on, doc.expires_on].filter((value): value is string => Boolean(value)).sort()[0] ?? null;
    const next = datedRecordState({ accepted: doc.status === "current", day: due, today, soon });
    return better(best, next);
  }, "missing");
}

export function scoreCredential(held: { kind: Enums<"credential_kind">; review: Enums<"document_review">; expires_on: string | null }[], kind: Enums<"credential_kind">, today: string, soon: string): EvidenceStatus {
  const rows = held.filter((row) => row.kind === kind);
  const approved = rows.filter((row) => row.review === "approved");
  if (approved.length) {
    return approved.reduce<EvidenceStatus>((best, row) => better(best, dateState(row.expires_on, today, soon)), "missing");
  }
  if (rows.some((row) => row.review === "pending" || row.review === "declined")) return "not_accepted";
  return "missing";
}

export function scoreServiceAgreement(docs: { title: string; signed_on: string | null; valid_to: string | null }[], today: string, soon: string): EvidenceStatus {
  const matches = docs.filter((doc) => doc.signed_on || /agreement|consent/i.test(doc.title));
  if (matches.length === 0) return "missing";
  return matches.reduce<EvidenceStatus>((best, doc) => {
    return better(best, datedRecordState({ accepted: Boolean(doc.signed_on), day: doc.valid_to, today, soon }));
  }, "missing");
}

export function scoreSupportPlan(plans: { renews_on: string }[], today: string, soon: string): EvidenceStatus {
  if (plans.length === 0) return "missing";
  const latest = [...plans].sort((a, b) => b.renews_on.localeCompare(a.renews_on))[0];
  if (!latest) return "missing";
  return dateState(latest.renews_on, today, soon);
}

export function scoreIncident(status: Enums<"incident_status">): EvidenceStatus | null {
  switch (status) {
    case "archived":
      return null;
    case "resolved":
    case "not_an_incident":
      return "current";
    case "triage":
    case "open":
    case "resolving":
    case "on_hold":
      return "not_accepted";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export type ReadinessCounts = {
  required: number;
  current: number;
  open: Record<OpenEvidence, number>;
  byArea: Record<EvidenceArea, number>;
};

export function summariseReadiness(items: readonly EvidenceItem[]): ReadinessCounts {
  const open = { overdue: 0, missing: 0, not_accepted: 0, lapsing: 0 };
  const byArea: Record<EvidenceArea, number> = {
    policies: 0,
    worker_credentials: 0,
    service_agreements: 0,
    support_plans: 0,
    registers: 0,
  };
  let current = 0;
  for (const item of items) {
    if (item.status === "current") {
      current += 1;
      continue;
    }
    open[item.status] += 1;
    byArea[item.area] += 1;
  }
  return { required: items.length, current, open, byArea };
}

export function openItems(items: readonly EvidenceItem[]): EvidenceItem[] {
  const rank: Record<OpenEvidence, number> = { overdue: 0, missing: 1, not_accepted: 2, lapsing: 3 };
  return items
    .filter((item): item is EvidenceItem & { status: OpenEvidence } => item.status !== "current")
    .sort((a, b) => rank[a.status] - rank[b.status] || a.title.localeCompare(b.title));
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function readinessHref(input: { area?: string; status?: string } = {}): string {
  const params = new URLSearchParams();
  if (input.area && Object.hasOwn(EVIDENCE_AREA, input.area)) params.set("area", input.area);
  if (input.status && (OPEN_EVIDENCE as readonly string[]).includes(input.status)) params.set("status", input.status);
  const query = params.toString();
  return query ? `/compliance?${query}` : "/compliance";
}

export function evidenceArea(value: string): EvidenceArea | "" {
  return Object.hasOwn(EVIDENCE_AREA, value) ? (value as EvidenceArea) : "";
}

export function openStatus(value: string): OpenEvidence | "" {
  return (OPEN_EVIDENCE as readonly string[]).includes(value) ? (value as OpenEvidence) : "";
}

export function readinessToday(now = isoDay()): { today: string; soon: string } {
  return { today: now, soon: addDays(now, LAPSING_DAYS) };
}
