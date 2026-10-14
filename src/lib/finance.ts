import type { Enums } from "@/lib/supabase/database.types";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export type BillableStatus = Enums<"billable_status">;
export type BillableKind = Enums<"billable_kind">;
export type BillingUnit = Enums<"billing_unit">;
export type GstCode = Enums<"gst_code">;
export type ClaimType = Enums<"claim_type">;
export type CancellationReason = Enums<"cancellation_reason">;
export type TimesheetStatus = Enums<"timesheet_status">;

export const BILLABLE_STATUS: Record<BillableStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  unbilled: { label: "Ready", tone: "warning" },
  invoiced: { label: "Invoiced", tone: "accent" },
  claimed: { label: "In claim", tone: "accent" },
  exported: { label: "Exported", tone: "accent" },
  paid: { label: "Paid", tone: "success" },
  void: { label: "Void", tone: "danger" },
};

export const BILLABLE_KIND: Record<BillableKind, string> = {
  service: "Support",
  travel: "Travel",
  cancellation: "Cancellation",
  expense: "Reimbursement",
  manual: "Manual",
  task: "Task",
};

export type BillableTaskStatus = Enums<"billable_task_status">;

export const BILLABLE_TASK_STATUS: Record<BillableTaskStatus, { label: string; tone: Tone }> = {
  outstanding: { label: "Outstanding", tone: "warning" },
  done: { label: "Billed", tone: "success" },
  non_billable: { label: "Non-billable", tone: "neutral" },
};

export const UNITS: Record<BillingUnit, { label: string; short: string }> = {
  hour: { label: "Per hour", short: "hr" },
  each: { label: "Each", short: "ea" },
  km: { label: "Per kilometre", short: "km" },
};

export const GST: Record<GstCode, string> = {
  P1: "GST 10%",
  P2: "GST free",
  P5: "Out of scope",
};

export const CLAIM_TYPES: Record<ClaimType, string> = {
  CANC: "Cancellation",
  REPW: "Report writing",
  TRAN: "Provider travel",
  NF2F: "Non-face-to-face",
  THLT: "Telehealth",
  IRSS: "Irregular SIL",
};

export const CANCELLATION_REASONS: Record<CancellationReason, string> = {
  NSDH: "No show due to health",
  NSDF: "No show due to family",
  NSDT: "No show due to transport",
  NSDO: "Other reason",
};

export const TIMESHEET_STATUS: Record<TimesheetStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  locked: { label: "Locked", tone: "accent" },
};

/** Support items are written like `01_011_0107_1_1`. */
export const SUPPORT_NUMBER = /^[0-9A-Z_]{0,50}$/;
export const ABN = /^\d{11}$/;
export const NDIS_NUMBER = /^\d{9}$/;
/** NDIA short-notice cancellations: seven clear days. */
export const SHORT_NOTICE_HOURS = 168;

export function insideShortNotice(startsAt: string, hours = SHORT_NOTICE_HOURS, now = Date.now()): boolean {
  return now > Date.parse(startsAt) - hours * 3_600_000;
}

/** Hours left until a cancellation would stop being charged. Zero once the window has closed. */
export function hoursUntilChargeFree(startsAt: string, hours = SHORT_NOTICE_HOURS, now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(startsAt) - hours * 3_600_000 - now) / 3_600_000));
}

export function formatQuantity(quantity: number, unit: BillingUnit): string {
  const value = Number(quantity.toFixed(2)).toString();
  switch (unit) {
    case "hour":
      return `${value} hrs`;
    case "km":
      return `${value} km`;
    case "each":
      return value;
    default: {
      const unknown: never = unit;
      return unknown;
    }
  }
}

/** Dollars with two decimals and no symbol, as CSV and PRODA expect. */
export function plainDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export type ClaimLine = {
  id: string;
  ndis_number: string | null;
  service_date: string;
  support_number: string;
  quantity: number;
  unit: BillingUnit;
  unit_price_cents: number;
  gst_code: GstCode;
  claim_type: ClaimType | null;
  cancellation_reason: CancellationReason | null;
};

export type TravelClaimKind = Enums<"travel_claim_kind">;
export type TravelClaimStatus = Enums<"travel_claim_status">;

export const TRAVEL_CLAIM_KIND: Record<TravelClaimKind, string> = {
  between: "In-between",
  to_from: "To / from",
  community: "Community",
};

export const TRAVEL_CLAIM_STATUS: Record<TravelClaimStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

/** Imploy claim numbers look like NDIS-2026-001. */
export function claimLabel(periodStart: string, number: number): string {
  return `NDIS-${periodStart.slice(0, 4)}-${String(number).padStart(3, "0")}`;
}

export type ProviderDetails = { abn: string; ndis_registration_number: string };

export const PRODA_HEADER = [
  "RegistrationNumber",
  "NDISNumber",
  "SupportsDeliveredFrom",
  "SupportsDeliveredTo",
  "SupportNumber",
  "ClaimReference",
  "Quantity",
  "Hours",
  "UnitPrice",
  "GSTCode",
  "AuthorisedBy",
  "ParticipantApproved",
  "InKindFundingProgram",
  "ClaimType",
  "CancellationReason",
  "ABN of Support Provider",
] as const;

/** PRODA rejects files with more rows than this. */
export const PRODA_MAX_ROWS = 5000;

/** Everything that would make PRODA reject the file, so the export can be refused up front. */
export function claimProblems(provider: ProviderDetails | null, lines: readonly ClaimLine[]): string[] {
  const problems: string[] = [];
  if (!provider || !ABN.test(provider.abn)) problems.push("Add your ABN in Finance settings.");
  if (!provider?.ndis_registration_number) problems.push("Add your NDIS registration number in Finance settings.");
  if (lines.length === 0) problems.push("This claim has no entries.");
  if (lines.length > PRODA_MAX_ROWS) problems.push(`PRODA accepts at most ${PRODA_MAX_ROWS} lines per file. Split the claim period.`);
  const noNumber = lines.filter((l) => !l.ndis_number || !NDIS_NUMBER.test(l.ndis_number)).length;
  if (noNumber) problems.push(`${noNumber} ${noNumber === 1 ? "entry is" : "entries are"} for participants without a valid 9-digit NDIS number.`);
  const noItem = lines.filter((l) => !l.support_number).length;
  if (noItem) problems.push(`${noItem} ${noItem === 1 ? "entry has" : "entries have"} no NDIS support item number.`);
  return problems;
}

/**
 * Rows for the NDIA bulk payment request upload. Hourly supports go in Hours
 * (Quantity empty); km and each go in Quantity. ClaimReference is the claim id
 * so a remittance matches the whole claim, as PRODA's help describes.
 */
export function prodaRows(provider: ProviderDetails, claimId: string, lines: readonly ClaimLine[]): string[][] {
  return [
    [...PRODA_HEADER],
    ...lines.map((line) => {
      const qty = Number(line.quantity.toFixed(2)).toString();
      const hourly = line.unit === "hour";
      return [
        provider.ndis_registration_number,
        line.ndis_number ?? "",
        line.service_date,
        line.service_date,
        line.support_number,
        claimId,
        hourly ? "" : qty,
        hourly ? qty : "",
        plainDollars(line.unit_price_cents),
        line.gst_code,
        "",
        "",
        "",
        line.claim_type ?? "",
        line.cancellation_reason ?? "",
        provider.abn,
      ];
    }),
  ];
}

/** PRODA limits upload file names to 20 characters. */
export function prodaFilename(claimNumber: number): string {
  return `CLAIM${String(claimNumber).padStart(4, "0")}.csv`;
}

export type PayLine = {
  staff: string;
  email: string;
  work_date: string;
  start: string;
  end: string;
  break_minutes: number;
  worked_minutes: number;
  km: number;
  client: string;
  notes: string;
  hourly_cents: number | null;
  km_cents: number | null;
  /** Sleepover time is paid as the sleepover allowance instead of hourly. */
  sleepover_cents: number | null;
  /** The worker's broken shift allowance for the day, carried on their last entry that day. */
  broken_cents: number;
};

type PayInputs = Pick<PayLine, "worked_minutes" | "km" | "hourly_cents" | "km_cents" | "sleepover_cents" | "broken_cents">;

export function payCents(line: PayInputs): number {
  const time = line.sleepover_cents === null ? Math.round((line.worked_minutes / 60) * (line.hourly_cents ?? 0)) : line.sleepover_cents;
  return time + Math.round(line.km * (line.km_cents ?? 0)) + line.broken_cents;
}

export function payrollRows(lines: readonly PayLine[]): string[][] {
  return [
    [
      "Staff",
      "Email",
      "Date",
      "Start",
      "End",
      "Break (min)",
      "Hours",
      "Kilometres",
      "Client",
      "Notes",
      "Hourly rate",
      "Per km",
      "Sleepover allowance",
      "Broken shift allowance",
      "Pay",
    ],
    ...lines.map((line) => [
      line.staff,
      line.email,
      line.work_date,
      line.start,
      line.end,
      String(line.break_minutes),
      (line.worked_minutes / 60).toFixed(2),
      String(line.km),
      line.client,
      line.notes,
      line.hourly_cents === null ? "" : plainDollars(line.hourly_cents),
      line.km_cents === null ? "" : plainDollars(line.km_cents),
      line.sleepover_cents === null ? "" : plainDollars(line.sleepover_cents),
      line.broken_cents ? plainDollars(line.broken_cents) : "",
      line.hourly_cents === null && line.km_cents === null && line.sleepover_cents === null ? "" : plainDollars(payCents(line)),
    ]),
  ];
}

/** NDIS support categories, named by the first two digits of a support number. */
export const NDIS_CATEGORIES: Record<string, string> = {
  "01": "Assistance with daily life",
  "02": "Transport",
  "03": "Consumables",
  "04": "Assistance with social, economic and community participation",
  "05": "Assistive technology",
  "06": "Home modifications",
  "07": "Support coordination",
  "08": "Improved living arrangements",
  "09": "Increased social and community participation",
  "10": "Finding and keeping a job",
  "11": "Improved relationships",
  "12": "Improved health and wellbeing",
  "13": "Improved learning",
  "14": "Improved life choices",
  "15": "Improved daily living",
};

export function supportCategory(supportNumber: string): string {
  const prefix = supportNumber.slice(0, 2);
  return prefix in NDIS_CATEGORIES ? prefix : "";
}

export type BudgetLine = {
  id: string;
  contact_id: string;
  category: string;
  label: string;
  amount_cents: number;
  starts_on: string | null;
  ends_on: string | null;
  temporary: boolean;
};

export type BudgetCharge = { contact_id: string; support_number: string; service_date: string; amount_cents: number | null; status: BillableStatus };

export type BudgetUsage = BudgetLine & { deliveredCents: number; scheduledCents: number; remainingCents: number };

/**
 * Spend against each budget line. A line covers the client's charges in its
 * category (or all supports) within its own dates, falling back to the plan dates.
 * Pending charges are scheduled; anything else that isn't void is delivered.
 */
export function budgetUsage(
  lines: readonly BudgetLine[],
  charges: readonly BudgetCharge[],
  plans: ReadonlyMap<string, { plan_start: string | null; plan_end: string | null }>,
): BudgetUsage[] {
  return lines.map((line) => {
    const plan = plans.get(line.contact_id);
    const from = line.starts_on ?? plan?.plan_start ?? null;
    const to = line.ends_on ?? plan?.plan_end ?? null;
    let deliveredCents = 0;
    let scheduledCents = 0;
    for (const c of charges) {
      if (c.contact_id !== line.contact_id || c.status === "void") continue;
      if (line.category && supportCategory(c.support_number) !== line.category) continue;
      if ((from && c.service_date < from) || (to && c.service_date > to)) continue;
      if (c.status === "pending") scheduledCents += c.amount_cents ?? 0;
      else deliveredCents += c.amount_cents ?? 0;
    }
    return { ...line, deliveredCents, scheduledCents, remainingCents: line.amount_cents - deliveredCents - scheduledCents };
  });
}

export function budgetLineName(line: Pick<BudgetLine, "category" | "label" | "temporary">): string {
  const base = line.label || (line.category ? `${line.category} ${NDIS_CATEGORIES[line.category]}` : "All supports");
  return line.temporary ? `${base} (top-up)` : base;
}
