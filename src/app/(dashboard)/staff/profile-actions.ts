"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CREDENTIALS, LEAVE_KIND, LEAVE_STATUS, enumValue, parseDay } from "@/lib/care";
import { text } from "@/lib/form-data";
import type { Enums, TablesUpdate } from "@/lib/supabase/database.types";
import { getWorkspace } from "@/lib/workspace";

const ADMIN_ONLY = "Only workspace owners and admins can change staff records.";

function path(staffId: string, tab: string) {
  return `/staff/${staffId}?tab=${tab}`;
}

function fail(staffId: string, tab: string, message: string): never {
  redirect(`${path(staffId, tab)}&error=${encodeURIComponent(message)}`);
}

async function editor(staffId: string, tab: string) {
  const ctx = await getWorkspace();
  if (ctx.member.role === "member") fail(staffId, tab, ADMIN_ONLY);
  return ctx;
}

function refresh(staffId: string) {
  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff", "layout");
}

export async function saveLeave(staffId: string, form: FormData) {
  const { supabase, workspace } = await editor(staffId, "leave");
  const kind = enumValue(LEAVE_KIND, text(form, "kind"));
  const starts = parseDay(text(form, "starts_on"));
  const ends = parseDay(text(form, "ends_on"));
  if (!kind || "error" in starts || "error" in ends || !starts.value || !ends.value) {
    fail(staffId, "leave", "Choose a leave type and valid dates.");
  }
  if (ends.value < starts.value) fail(staffId, "leave", "Leave can't end before it starts.");
  const { error } = await supabase.from("staff_leave").insert({
    workspace_id: workspace.id,
    staff_id: staffId,
    kind,
    starts_on: starts.value,
    ends_on: ends.value,
    reason: text(form, "reason").slice(0, 500),
  });
  if (error) throw error;
  refresh(staffId);
}

export async function setLeaveStatus(staffId: string, leaveId: string, form: FormData) {
  const { supabase, workspace } = await editor(staffId, "leave");
  const status = enumValue(LEAVE_STATUS, text(form, "value"));
  if (!status) return;
  const { error } = await supabase
    .from("staff_leave")
    .update({ status, decided_at: status === "pending" ? null : new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("staff_id", staffId)
    .eq("id", leaveId);
  if (error) throw error;
  refresh(staffId);
}

export async function deleteLeave(staffId: string, leaveId: string) {
  const { supabase, workspace } = await editor(staffId, "leave");
  const { error } = await supabase.from("staff_leave").delete().eq("workspace_id", workspace.id).eq("staff_id", staffId).eq("id", leaveId);
  if (error) throw error;
  refresh(staffId);
}

export async function saveAvailability(staffId: string, form: FormData) {
  const { supabase, workspace } = await editor(staffId, "availability");
  const weekday = Number.parseInt(text(form, "weekday"), 10);
  const starts_at = text(form, "starts_at");
  const ends_at = text(form, "ends_at");
  if (weekday < 1 || weekday > 7 || !/^\d{2}:\d{2}$/.test(starts_at) || !/^\d{2}:\d{2}$/.test(ends_at)) {
    fail(staffId, "availability", "Choose a weekday and start and finish times.");
  }
  if (ends_at <= starts_at) fail(staffId, "availability", "Finish time must be after the start.");
  const { error } = await supabase.from("staff_availability").upsert({
    workspace_id: workspace.id,
    staff_id: staffId,
    weekday,
    starts_at,
    ends_at,
  });
  if (error) throw error;
  refresh(staffId);
}

export async function deleteAvailability(staffId: string, weekday: number) {
  const { supabase, workspace } = await editor(staffId, "availability");
  const { error } = await supabase
    .from("staff_availability")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("staff_id", staffId)
    .eq("weekday", weekday);
  if (error) throw error;
  refresh(staffId);
}

export type FinanceField =
  | "bank_bsb"
  | "bank_account_number"
  | "super_fund"
  | "super_member_number"
  | "tax_file_number"
  | "employing_entity"
  | "employee_code"
  | "location"
  | "primary_cost_centre"
  | "additional_cost_centres"
  | "contract_type"
  | "job_title"
  | "weekly_hours"
  | "fte_hours"
  | "max_daily_hours";

function parseHours(value: string, max: number): { value: number | null } | { error: string } {
  if (value === "") return { value: null };
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0 || n > max) return { error: `Hours must be between 0 and ${max}.` };
  return { value: n };
}

function parseFinance(field: FinanceField, value: string): { change: TablesUpdate<"staff_finance"> } | { error: string } {
  switch (field) {
    case "bank_bsb": {
      const digits = value.replace(/\s/g, "");
      return /^([0-9]{6})?$/.test(digits) ? { change: { bank_bsb: digits } } : { error: "BSB is 6 digits." };
    }
    case "bank_account_number": {
      const digits = value.replace(/\s/g, "");
      return /^[0-9]{0,10}$/.test(digits) ? { change: { bank_account_number: digits } } : { error: "Account numbers are up to 10 digits." };
    }
    case "super_fund":
      return { change: { super_fund: value.slice(0, 120) } };
    case "super_member_number":
      return { change: { super_member_number: value.slice(0, 40) } };
    case "tax_file_number": {
      const digits = value.replace(/\s/g, "");
      return /^([0-9]{8,9})?$/.test(digits) ? { change: { tax_file_number: digits } } : { error: "TFN is 8 or 9 digits." };
    }
    case "employing_entity":
      return { change: { employing_entity: value.slice(0, 120) } };
    case "employee_code":
      return { change: { employee_code: value.slice(0, 40) } };
    case "location":
      return { change: { location: value.slice(0, 120) } };
    case "primary_cost_centre":
      return { change: { primary_cost_centre: value.slice(0, 80) } };
    case "additional_cost_centres":
      return { change: { additional_cost_centres: value.slice(0, 200) } };
    case "contract_type":
      return { change: { contract_type: value.slice(0, 80) } };
    case "job_title":
      return { change: { job_title: value.slice(0, 80) } };
    case "weekly_hours":
    case "fte_hours": {
      const hours = parseHours(value, 168);
      return "error" in hours ? hours : { change: { [field]: hours.value } };
    }
    case "max_daily_hours": {
      const hours = parseHours(value, 24);
      return "error" in hours ? hours : { change: { max_daily_hours: hours.value } };
    }
    default: {
      const unreachable: never = field;
      throw new Error(`Unknown finance field ${String(unreachable)}`);
    }
  }
}

export async function setFinanceField(staffId: string, field: FinanceField, form: FormData): Promise<{ error?: string }> {
  const ctx = await getWorkspace();
  if (ctx.member.role === "member") return { error: ADMIN_ONLY };
  const parsed = parseFinance(field, text(form, "value"));
  if ("error" in parsed) return parsed;
  const { error } = await ctx.supabase.from("staff_finance").upsert(
    {
      staff_id: staffId,
      workspace_id: ctx.workspace.id,
      ...parsed.change,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "staff_id" },
  );
  if (error) throw error;
  refresh(staffId);
  return {};
}

export async function setStaffRequirements(staffId: string, form: FormData) {
  const { supabase, workspace } = await editor(staffId, "compliance");
  const required = form
    .getAll("kind")
    .filter((v): v is string => typeof v === "string")
    .filter((v): v is Enums<"credential_kind"> => Boolean(enumValue(CREDENTIALS, v)));
  const { error } = await supabase.from("staff").update({ required_credentials: required }).eq("workspace_id", workspace.id).eq("id", staffId);
  if (error) throw error;
  refresh(staffId);
}

export async function setCredentialReview(staffId: string, credentialId: string, form: FormData) {
  const { supabase, workspace } = await editor(staffId, "compliance");
  const review = text(form, "value");
  if (review !== "pending" && review !== "approved" && review !== "declined") return;
  const { error } = await supabase
    .from("staff_credentials")
    .update({ review })
    .eq("workspace_id", workspace.id)
    .eq("staff_id", staffId)
    .eq("id", credentialId);
  if (error) throw error;
  refresh(staffId);
}
