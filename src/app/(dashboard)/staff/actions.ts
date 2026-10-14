"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CREDENTIALS, EMPLOYMENT, GENDER, STAFF_STATUS, enumValue, parseDay } from "@/lib/care";
import { text } from "@/lib/form-data";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { getWorkspace, type WorkspaceContext } from "@/lib/workspace";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_ONLY = "Only workspace owners and admins can change staff records.";

async function staffEditor(): Promise<WorkspaceContext | null> {
  const ctx = await getWorkspace();
  return ctx.member.role === "member" ? null : ctx;
}

export async function createStaff(form: FormData) {
  const ctx = await staffEditor();
  if (!ctx) redirect(`/staff?error=${encodeURIComponent(ADMIN_ONLY)}`);
  const email = text(form, "email").toLowerCase();
  if (!EMAIL.test(email)) redirect(`/staff?error=${encodeURIComponent("Enter a valid email address.")}`);
  const { data, error } = await ctx.supabase
    .from("staff")
    .insert({
      workspace_id: ctx.workspace.id,
      first_name: text(form, "first_name").slice(0, 80),
      last_name: text(form, "last_name").slice(0, 80),
      email,
      position: text(form, "position").slice(0, 80),
      employment_type: enumValue(EMPLOYMENT, text(form, "employment_type")),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") redirect(`/staff?error=${encodeURIComponent(`${email} is already a staff member.`)}`);
    throw error;
  }
  revalidatePath("/staff");
  redirect(`/staff/${data.id}`);
}

export type StaffField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "position"
  | "employment_type"
  | "status"
  | "start_date"
  | "preferred_name"
  | "gender"
  | "nationality"
  | "date_of_birth"
  | "address"
  | "emergency_name"
  | "emergency_relationship"
  | "emergency_phone"
  | "emergency_alt_phone"
  | "emergency_email"
  | "emergency_address"
  | "abn"
  | "trading_name";

function parseStaffField(field: StaffField, value: string): { change: TablesUpdate<"staff"> } | { error: string } {
  switch (field) {
    case "first_name":
      return { change: { first_name: value.slice(0, 80) } };
    case "last_name":
      return { change: { last_name: value.slice(0, 80) } };
    case "email": {
      const email = value.toLowerCase();
      return EMAIL.test(email) ? { change: { email } } : { error: "Enter a valid email address." };
    }
    case "phone":
      return { change: { phone: value.slice(0, 40) } };
    case "position":
      return { change: { position: value.slice(0, 80) } };
    case "employment_type":
      return { change: { employment_type: enumValue(EMPLOYMENT, value) } };
    case "status": {
      const status = enumValue(STAFF_STATUS, value);
      return status ? { change: { status } } : { error: "Choose a status." };
    }
    case "start_date": {
      const day = parseDay(value);
      return "error" in day ? day : { change: { start_date: day.value } };
    }
    case "preferred_name":
      return { change: { preferred_name: value.slice(0, 80) } };
    case "gender":
      return { change: { gender: enumValue(GENDER, value) } };
    case "nationality":
      return { change: { nationality: value.slice(0, 60) } };
    case "date_of_birth": {
      const day = parseDay(value);
      return "error" in day ? day : { change: { date_of_birth: day.value } };
    }
    case "address":
      return { change: { address: value.slice(0, 200) } };
    case "emergency_name":
      return { change: { emergency_name: value.slice(0, 120) } };
    case "emergency_relationship":
      return { change: { emergency_relationship: value.slice(0, 60) } };
    case "emergency_phone":
      return { change: { emergency_phone: value.slice(0, 40) } };
    case "emergency_alt_phone":
      return { change: { emergency_alt_phone: value.slice(0, 40) } };
    case "emergency_email": {
      if (value === "") return { change: { emergency_email: "" } };
      return value.includes("@") ? { change: { emergency_email: value.slice(0, 200) } } : { error: "Enter a valid email address." };
    }
    case "emergency_address":
      return { change: { emergency_address: value.slice(0, 200) } };
    case "abn": {
      const digits = value.replace(/\s/g, "");
      return /^([0-9]{11})?$/.test(digits) ? { change: { abn: digits } } : { error: "ABN is 11 digits." };
    }
    case "trading_name":
      return { change: { trading_name: value.slice(0, 120) } };
    default: {
      const unreachable: never = field;
      throw new Error(`Unknown staff field ${String(unreachable)}`);
    }
  }
}

export async function setStaffField(staffId: string, field: StaffField, form: FormData): Promise<{ error?: string }> {
  const ctx = await staffEditor();
  if (!ctx) return { error: ADMIN_ONLY };
  const parsed = parseStaffField(field, text(form, "value"));
  if ("error" in parsed) return parsed;
  let update = ctx.supabase.from("staff").update(parsed.change).eq("workspace_id", ctx.workspace.id).eq("id", staffId);
  // A linked login owns its email address.
  if (field === "email") update = update.is("user_id", null);
  const { data, error } = await update.select("id");
  if (error) {
    if (error.code === "23505") return { error: "Another staff member already uses that email." };
    throw error;
  }
  if (data.length === 0 && field === "email")
    return {
      error: "This person signs in with this email, so it can't be changed here.",
    };
  revalidatePath("/staff", "layout");
  return {};
}

export async function addCredential(staffId: string, form: FormData) {
  const ctx = await staffEditor();
  if (!ctx) redirect(`/staff/${staffId}?error=${encodeURIComponent(ADMIN_ONLY)}`);
  const kind = enumValue(CREDENTIALS, text(form, "kind"));
  const expires = parseDay(text(form, "expires_on"));
  if (!kind || "error" in expires) redirect(`/staff/${staffId}?error=${encodeURIComponent("Choose a check and a valid expiry date.")}`);
  const { error } = await ctx.supabase.from("staff_credentials").insert({
    workspace_id: ctx.workspace.id,
    staff_id: staffId,
    kind,
    reference: text(form, "reference").slice(0, 80),
    expires_on: expires.value,
  });
  if (error) throw error;
  revalidatePath("/staff", "layout");
}

export async function deleteCredential(staffId: string, credentialId: string) {
  const ctx = await staffEditor();
  if (!ctx) redirect(`/staff/${staffId}?error=${encodeURIComponent(ADMIN_ONLY)}`);
  const { error } = await ctx.supabase
    .from("staff_credentials")
    .delete()
    .eq("workspace_id", ctx.workspace.id)
    .eq("staff_id", staffId)
    .eq("id", credentialId);
  if (error) throw error;
  revalidatePath("/staff", "layout");
}

/** People who sign in stay on record; set them inactive instead. */
export async function deleteStaff(staffId: string) {
  const ctx = await staffEditor();
  if (!ctx) redirect(`/staff/${staffId}?error=${encodeURIComponent(ADMIN_ONLY)}`);
  const { data, error } = await ctx.supabase
    .from("staff")
    .delete()
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", staffId)
    .is("user_id", null)
    .select("id");
  if (error) throw error;
  if (data.length === 0)
    redirect(`/staff/${staffId}?error=${encodeURIComponent("This person signs in to the workspace. Set them inactive instead.")}`);
  revalidatePath("/staff", "layout");
  redirect("/staff");
}

function selectedIds(form: FormData): string[] {
  return [...new Set(form.getAll("ids").filter((v): v is string => typeof v === "string" && v !== ""))].slice(0, 500);
}

export async function bulkSetStaffStatus(form: FormData) {
  const ctx = await staffEditor();
  if (!ctx) return;
  const status = enumValue(STAFF_STATUS, text(form, "value"));
  if (!status) return;
  const { error } = await ctx.supabase.from("staff").update({ status }).eq("workspace_id", ctx.workspace.id).in("id", selectedIds(form));
  if (error) throw error;
  revalidatePath("/staff", "layout");
}
