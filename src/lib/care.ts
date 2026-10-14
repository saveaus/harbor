import type { Enums } from "@/lib/supabase/database.types";

export type ChipTone = "grey" | "blue" | "green" | "amber" | "red" | "purple" | "teal";

type Option<K extends string> = Record<K, { label: string; tone: ChipTone }>;

export const CLIENT_STATUS: Option<Enums<"client_status">> = {
  pending: { label: "Pending", tone: "blue" },
  active: { label: "Active", tone: "green" },
  on_leave: { label: "On leave", tone: "amber" },
  hospital_leave: { label: "Hospital leave", tone: "amber" },
  respite_leave: { label: "Respite leave", tone: "amber" },
  inactive: { label: "Inactive", tone: "grey" },
  terminated: { label: "Terminated", tone: "red" },
  deceased: { label: "Deceased", tone: "grey" },
  archived: { label: "Archived", tone: "grey" },
};

/** Statuses whose clients no longer receive supports, so plans, rosters and budgets leave them out. */
export const CLOSED_CLIENT_STATUSES: readonly Enums<"client_status">[] = ["inactive", "terminated", "deceased", "archived"];

export function isClosedClient(status: Enums<"client_status">): boolean {
  return CLOSED_CLIENT_STATUSES.includes(status);
}

export const FUNDING: Option<Enums<"funding_type">> = {
  ndis: { label: "NDIS", tone: "purple" },
  home_care_package: { label: "Home Care Package", tone: "teal" },
  support_at_home: { label: "Support at Home", tone: "teal" },
  private: { label: "Private", tone: "grey" },
};

export const PLAN_MANAGEMENT: Record<Enums<"plan_management">, string> = {
  ndia_managed: "NDIA managed",
  plan_managed: "Plan managed",
  self_managed: "Self managed",
};

export const HCP_LEVELS: Record<"1" | "2" | "3" | "4", string> = { "1": "Level 1", "2": "Level 2", "3": "Level 3", "4": "Level 4" };

export const GENDER: Record<Enums<"person_gender">, string> = {
  male: "Male",
  female: "Female",
  non_binary: "Non-binary",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export const STAFF_STATUS: Option<Enums<"staff_status">> = {
  onboarding: { label: "Onboarding", tone: "blue" },
  active: { label: "Active", tone: "green" },
  inactive: { label: "Inactive", tone: "grey" },
};

export const EMPLOYMENT: Record<Enums<"employment_type">, string> = {
  full_time: "Full time",
  part_time: "Part time",
  casual: "Casual",
  contractor: "Contractor",
};

export const CREDENTIALS: Record<Enums<"credential_kind">, string> = {
  identification: "Identification",
  ndis_worker_screening: "NDIS Worker Screening",
  working_with_children: "Working With Children Check",
  police_check: "Police check",
  first_aid: "First aid",
  cpr: "CPR",
  drivers_licence: "Driver's licence",
  car_insurance: "Comprehensive vehicle insurance",
  vehicle_registration: "Vehicle registration",
  qualification: "Qualification",
  employment_contract: "Employment contract",
  other: "Other",
};

/** Kinds that are checks a person holds, rather than paperwork such as contracts. */
export const CORE_CREDENTIALS: readonly Enums<"credential_kind">[] = [
  "identification",
  "ndis_worker_screening",
  "working_with_children",
  "police_check",
  "first_aid",
  "cpr",
];

export const DOCUMENT_REVIEW: Option<Enums<"document_review">> = {
  pending: { label: "Pending", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  declined: { label: "Declined", tone: "red" },
};

const EXPIRING_DAYS = 30;
export const PLAN_ENDING_DAYS = 60;

/** Today and day offsets as `YYYY-MM-DD`, comparable with Postgres `date` values. */
export function isoDay(offsetDays = 0): string {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return day.toISOString().slice(0, 10);
}

/** Whole years since a `YYYY-MM-DD` birth date. */
export function ageOn(birthDate: string, today = isoDay()): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export type CredentialState = "expired" | "expiring" | "current";

export function credentialState(expiresOn: string | null): CredentialState {
  if (expiresOn === null) return "current";
  if (expiresOn < isoDay()) return "expired";
  return expiresOn <= isoDay(EXPIRING_DAYS) ? "expiring" : "current";
}

export const CREDENTIAL_STATE: Option<CredentialState> = {
  expired: { label: "Expired", tone: "red" },
  expiring: { label: "Expiring", tone: "amber" },
  current: { label: "Current", tone: "green" },
};

/** Where one checklist item stands: nothing uploaded, waiting on review, declined, or held. */
export type ChecklistState = "not_uploaded" | "pending" | "declined" | CredentialState;

export const CHECKLIST_STATE: Option<ChecklistState> = {
  not_uploaded: { label: "Not uploaded", tone: "grey" },
  pending: { label: "Pending", tone: "amber" },
  declined: { label: "Declined", tone: "red" },
  ...CREDENTIAL_STATE,
};

type HeldCredential = { kind: Enums<"credential_kind">; expires_on: string | null; review: Enums<"document_review"> };

/** An approved holding counts by the one that expires last; otherwise the best pending or declined upload. */
export function checklistState(kind: Enums<"credential_kind">, credentials: HeldCredential[]): ChecklistState {
  const held = credentials.filter((c) => c.kind === kind);
  const approved = held.filter((c) => c.review === "approved").map((c) => credentialState(c.expires_on));
  if (approved.includes("current")) return "current";
  if (approved.includes("expiring")) return "expiring";
  if (approved.length) return "expired";
  if (held.some((c) => c.review === "pending")) return "pending";
  return held.length ? "declined" : "not_uploaded";
}

export type Compliance = { missing: number; pending: number; expired: number; expiring: number };

export function compliance(credentials: HeldCredential[], required: readonly Enums<"credential_kind">[]): Compliance {
  const result: Compliance = { missing: 0, pending: 0, expired: 0, expiring: 0 };
  for (const kind of required) {
    const state = checklistState(kind, credentials);
    if (state === "not_uploaded" || state === "declined") result.missing += 1;
    else if (state === "pending") result.pending += 1;
    else if (state === "expired") result.expired += 1;
    else if (state === "expiring") result.expiring += 1;
  }
  return result;
}

export type ComplianceLevel = "compliant" | "expiring" | "pending" | "missing" | "expired";

export const COMPLIANCE_LEVEL: Option<ComplianceLevel> = {
  compliant: { label: "Compliant", tone: "green" },
  expiring: { label: "Expiring", tone: "amber" },
  pending: { label: "Pending review", tone: "amber" },
  missing: { label: "Missing", tone: "amber" },
  expired: { label: "Expired", tone: "red" },
};

export function complianceLevel(value: Compliance): ComplianceLevel {
  if (value.expired) return "expired";
  if (value.missing) return "missing";
  if (value.pending) return "pending";
  if (value.expiring) return "expiring";
  return "compliant";
}

export function complianceSummary(value: Compliance): { label: string; tone: ChipTone } {
  const level = complianceLevel(value);
  const count = level === "compliant" ? 0 : value[level];
  return {
    label: count ? `${count} ${level === "pending" ? "pending" : level}` : COMPLIANCE_LEVEL[level].label,
    tone: COMPLIANCE_LEVEL[level].tone,
  };
}

export function planEndTone(planEnd: string | null): ChipTone | null {
  if (planEnd === null) return null;
  if (planEnd < isoDay()) return "red";
  return planEnd <= isoDay(PLAN_ENDING_DAYS) ? "amber" : null;
}

export const GOAL_STATUS: Option<Enums<"goal_status">> = {
  not_started: { label: "Not started", tone: "grey" },
  in_progress: { label: "In progress", tone: "blue" },
  achieved: { label: "Achieved", tone: "green" },
};

export const OBSERVATION_KIND: Record<Enums<"observation_kind">, string> = { caution: "Caution", incident: "Incident" };

export const OBSERVATION_SEVERITY: Option<Enums<"observation_severity">> = {
  low: { label: "Low", tone: "grey" },
  medium: { label: "Medium", tone: "amber" },
  high: { label: "High", tone: "red" },
  critical: { label: "Critical", tone: "red" },
};

export const DOCUMENT_FOLDER: Record<Enums<"document_folder">, { label: string; description: string }> = {
  general: { label: "General Documents", description: "Service agreements, consent forms and correspondence." },
  assessment: { label: "Assessment Documents", description: "Clinical assessments and evaluations." },
  secure: { label: "Secure Documents", description: "Restricted documents only owners and admins can open." },
};

export const ASSESSMENT_TYPE: Record<Enums<"assessment_type">, string> = {
  home: "Home",
  risk: "Risk",
  mobility: "Mobility",
  falls: "Falls",
  clinical: "Clinical",
  general: "General",
};

export const CLIENT_CONTACT_KIND: Record<Enums<"client_contact_kind">, string> = {
  contact: "Contact",
  health_professional: "Health professional",
  roster_recipient: "Roster recipient",
};

export const PROFESSIONAL_TYPE: Record<Enums<"professional_type">, string> = {
  general_practitioner: "General Practitioner",
  specialist: "Specialist",
  case_manager: "Case Manager",
  therapist: "Therapist",
};

export const LEAVE_KIND: Record<Enums<"leave_kind">, string> = { annual: "Annual leave", personal: "Personal leave", sick: "Sick leave" };

export const LEAVE_STATUS: Option<Enums<"leave_status">> = {
  pending: { label: "Pending", tone: "amber" },
  accepted: { label: "Accepted", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
};

/** ISO weekdays, Monday first. */
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Calendar days in an inclusive `YYYY-MM-DD` range. */
export function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

export function enumValue<K extends string>(options: Record<K, unknown>, value: string): K | null {
  return Object.hasOwn(options, value) ? (value as K) : null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** An empty string clears the date; anything else must be a real calendar day. */
export function parseDay(value: string): { value: string | null } | { error: string } {
  if (value === "") return { value: null };
  if (!DAY.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return { error: "Enter a valid date." };
  return { value };
}
