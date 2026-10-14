"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CLIENT_STATUS, FUNDING, GENDER, HCP_LEVELS, PLAN_MANAGEMENT, enumValue, parseDay } from "@/lib/care";
import { text } from "@/lib/form-data";
import { parseFieldType, parseFieldValue, parseFieldValues } from "@/lib/custom-fields";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { getWorkspace, type WorkspaceContext } from "@/lib/workspace";

export async function addClient(form: FormData) {
  const ctx = await getWorkspace();
  const contact = {
    workspace_id: ctx.workspace.id,
    first_name: text(form, "first_name"),
    last_name: text(form, "last_name"),
    email: text(form, "email").toLowerCase(),
  };
  const { data, error } = await ctx.supabase.from("contacts").insert(contact).select("id").single();
  if (error) {
    if (error.code === "23505") redirect(`/clients?error=${encodeURIComponent("A client with that email already exists.")}`);
    throw error;
  }
  const birth = parseDay(text(form, "date_of_birth"));
  const profile = await ctx.supabase
    .from("client_profiles")
    .update({
      status: enumValue(CLIENT_STATUS, text(form, "status")) ?? "pending",
      funding: enumValue(FUNDING, text(form, "funding")),
      gender: enumValue(GENDER, text(form, "gender")),
      date_of_birth: "error" in birth ? null : birth.value,
      address: text(form, "address").slice(0, 200),
    })
    .eq("workspace_id", ctx.workspace.id)
    .eq("contact_id", data.id);
  if (profile.error) throw profile.error;
  revalidatePath("/clients", "layout");
  redirect(`/clients/${data.id}`);
}

export async function deleteClient(contactId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("contacts").delete().eq("workspace_id", workspace.id).eq("id", contactId);
  if (error) throw error;
  revalidatePath("/clients", "layout");
  redirect("/clients");
}

async function saveDetails(
  { supabase, workspace }: WorkspaceContext,
  contactId: string,
  change: (current: { notes: string; field_values: Record<string, string> }) => {
    notes: string;
    field_values: Record<string, string>;
  },
) {
  const { data, error } = await supabase
    .from("record_details")
    .select("notes, field_values")
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId)
    .maybeSingle();
  if (error) throw error;
  const next = change({
    notes: data?.notes ?? "",
    field_values: parseFieldValues(data?.field_values),
  });
  const { error: saveError } = await supabase.from("record_details").upsert(
    {
      workspace_id: workspace.id,
      contact_id: contactId,
      ...next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contact_id" },
  );
  if (saveError) throw saveError;
  revalidatePath(`/clients/${contactId}`);
}

export async function saveNotes(contactId: string, form: FormData) {
  const notes = text(form, "notes").slice(0, 20000);
  await saveDetails(await getWorkspace(), contactId, (current) => ({
    ...current,
    notes,
  }));
}

export async function setClientNotes(contactId: string, form: FormData): Promise<{ error?: string }> {
  const notes = text(form, "value").slice(0, 20000);
  await saveDetails(await getWorkspace(), contactId, (current) => ({
    ...current,
    notes,
  }));
  return {};
}

export async function setFieldValue(contactId: string, fieldId: string, form: FormData) {
  const ctx = await getWorkspace();
  const { data: field, error } = await ctx.supabase
    .from("custom_fields")
    .select("id, type")
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", fieldId)
    .maybeSingle();
  if (error) throw error;
  if (!field) return { error: "That field no longer exists." };
  const value = text(form, "value");
  const parsed = parseFieldValue(field.type, value);
  if ("error" in parsed) return parsed;
  await saveDetails(ctx, contactId, (current) => {
    const field_values = { ...current.field_values };
    if (parsed.value === "") delete field_values[field.id];
    else field_values[field.id] = parsed.value;
    return { ...current, field_values };
  });
  return {};
}

export async function createCustomField(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const type = parseFieldType(text(form, "type"));
  const name = text(form, "name");
  if (!type || !name) return;
  const { error } = await supabase.from("custom_fields").insert({ workspace_id: workspace.id, name: name.slice(0, 60), type });
  if (error && error.code !== "23505") throw error;
  revalidatePath(`/clients/${contactId}`);
}

export type ClientField =
  | "status"
  | "funding"
  | "ndis_number"
  | "plan_management"
  | "plan_start"
  | "plan_end"
  | "date_of_birth"
  | "phone"
  | "address"
  | "key_worker_id"
  | "gender"
  | "languages"
  | "start_date"
  | "hcp_level"
  | "aged_care_id"
  | "allergies"
  | "medical_conditions"
  | "medications"
  | "bank_account_name"
  | "bank_bsb"
  | "bank_account_number";

export type ClientIdentityField = "first_name" | "last_name" | "email";

type ProfileChange = { change: TablesUpdate<"client_profiles"> } | { error: string };

async function parseClientField(ctx: WorkspaceContext, field: ClientField, value: string): Promise<ProfileChange> {
  switch (field) {
    case "status": {
      const status = enumValue(CLIENT_STATUS, value);
      return status ? { change: { status } } : { error: "Choose a status." };
    }
    case "funding":
      return { change: { funding: enumValue(FUNDING, value) } };
    case "plan_management":
      return { change: { plan_management: enumValue(PLAN_MANAGEMENT, value) } };
    case "ndis_number": {
      const digits = value.replace(/\s/g, "");
      return /^\d{0,9}$/.test(digits) ? { change: { ndis_number: digits } } : { error: "NDIS numbers are up to 9 digits." };
    }
    case "plan_start":
    case "plan_end":
    case "date_of_birth": {
      const day = parseDay(value);
      return "error" in day ? day : { change: { [field]: day.value } };
    }
    case "phone":
      return { change: { phone: value.slice(0, 40) } };
    case "address":
      return { change: { address: value.slice(0, 200) } };
    case "gender":
      return { change: { gender: enumValue(GENDER, value) } };
    case "languages":
      return { change: { languages: value.slice(0, 200) } };
    case "start_date": {
      const day = parseDay(value);
      return "error" in day ? day : { change: { start_date: day.value } };
    }
    case "hcp_level": {
      if (value === "") return { change: { hcp_level: null } };
      return Object.hasOwn(HCP_LEVELS, value) ? { change: { hcp_level: Number(value) } } : { error: "Choose a package level." };
    }
    case "aged_care_id":
      return { change: { aged_care_id: value.slice(0, 20) } };
    case "allergies":
      return { change: { allergies: value.slice(0, 2000) } };
    case "medical_conditions":
      return { change: { medical_conditions: value.slice(0, 2000) } };
    case "medications":
      return { change: { medications: value.slice(0, 2000) } };
    case "bank_account_name":
      return { change: { bank_account_name: value.slice(0, 80) } };
    case "bank_bsb": {
      const digits = value.replace(/\s/g, "");
      return /^([0-9]{6})?$/.test(digits) ? { change: { bank_bsb: digits } } : { error: "BSB is 6 digits." };
    }
    case "bank_account_number": {
      const digits = value.replace(/\s/g, "");
      return /^[0-9]{0,10}$/.test(digits) ? { change: { bank_account_number: digits } } : { error: "Account numbers are up to 10 digits." };
    }
    case "key_worker_id": {
      if (value === "") return { change: { key_worker_id: null } };
      const { data, error } = await ctx.supabase
        .from("staff")
        .select("id")
        .eq("workspace_id", ctx.workspace.id)
        .eq("id", value)
        .maybeSingle();
      if (error) throw error;
      return data ? { change: { key_worker_id: data.id } } : { error: "That staff member no longer exists." };
    }
    default: {
      const unreachable: never = field;
      throw new Error(`Unknown client field ${String(unreachable)}`);
    }
  }
}

export async function setClientField(contactId: string, field: ClientField, form: FormData): Promise<{ error?: string }> {
  const ctx = await getWorkspace();
  const parsed = await parseClientField(ctx, field, text(form, "value"));
  if ("error" in parsed) return parsed;
  const { error } = await ctx.supabase
    .from("client_profiles")
    .update({ ...parsed.change, updated_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspace.id)
    .eq("contact_id", contactId);
  if (error) {
    if (error.code === "23514") return { error: "The plan can't end before it starts." };
    throw error;
  }
  revalidatePath("/clients", "layout");
  return {};
}

export async function setClientIdentity(contactId: string, field: ClientIdentityField, form: FormData): Promise<{ error?: string }> {
  const ctx = await getWorkspace();
  const value = text(form, "value");
  let change: { first_name?: string; last_name?: string; email?: string };
  switch (field) {
    case "first_name":
      change = { first_name: value.slice(0, 80) };
      break;
    case "last_name":
      change = { last_name: value.slice(0, 80) };
      break;
    case "email": {
      const email = value.toLowerCase();
      if (!email.includes("@")) return { error: "Enter a valid email address." };
      change = { email };
      break;
    }
    default: {
      const unreachable: never = field;
      throw new Error(`Unknown identity field ${String(unreachable)}`);
    }
  }
  const { error } = await ctx.supabase.from("contacts").update(change).eq("workspace_id", ctx.workspace.id).eq("id", contactId);
  if (error) {
    if (error.code === "23505") return { error: "A client with that email already exists." };
    throw error;
  }
  revalidatePath("/clients", "layout");
  return {};
}

function selectedIds(form: FormData): string[] {
  return [...new Set(form.getAll("ids").filter((v): v is string => typeof v === "string" && v !== ""))].slice(0, 500);
}

export async function bulkSetClientStatus(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const status = enumValue(CLIENT_STATUS, text(form, "value"));
  if (!status) return;
  const { error } = await supabase
    .from("client_profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .in("contact_id", selectedIds(form));
  if (error) throw error;
  revalidatePath("/clients", "layout");
}

export async function bulkDeleteClients(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("contacts").delete().eq("workspace_id", workspace.id).in("id", selectedIds(form));
  if (error) throw error;
  revalidatePath("/clients", "layout");
}

export async function bulkAddToList(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const listId = text(form, "value");
  const rows = selectedIds(form).map((contact_id) => ({ workspace_id: workspace.id, list_id: listId, contact_id }));
  const { error } = await supabase.from("client_list_members").upsert(rows, { onConflict: "list_id,contact_id", ignoreDuplicates: true });
  if (error) throw error;
  revalidatePath("/clients", "layout");
}

export async function createClientList(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const name = text(form, "name").slice(0, 60);
  if (!name) return;
  const { error } = await supabase.from("client_lists").insert({ workspace_id: workspace.id, name });
  if (error && error.code !== "23505") throw error;
  revalidatePath("/clients", "layout");
}

export async function deleteClientList(listId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("client_lists").delete().eq("workspace_id", workspace.id).eq("id", listId);
  if (error) throw error;
  revalidatePath("/clients", "layout");
}

export async function setListMembership(contactId: string, listId: string, member: boolean) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = member
    ? await supabase
        .from("client_list_members")
        .upsert({ workspace_id: workspace.id, list_id: listId, contact_id: contactId }, { onConflict: "list_id,contact_id", ignoreDuplicates: true })
    : await supabase.from("client_list_members").delete().eq("workspace_id", workspace.id).eq("list_id", listId).eq("contact_id", contactId);
  if (error) throw error;
  revalidatePath("/clients", "layout");
}
