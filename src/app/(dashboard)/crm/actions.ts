"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { optionalId, text } from "@/lib/form-data";
import { parseFieldType, parseFieldValue, parseFieldValues } from "@/lib/custom-fields";
import { getWorkspace, type WorkspaceContext } from "@/lib/workspace";

async function openChannels(
  { supabase, workspace }: WorkspaceContext,
  owner: { company_id: string } | { contact_id: string },
  title: string,
) {
  const { error } = await supabase.from("channels").insert([
    { workspace_id: workspace.id, kind: "messages", title, last_activity_summary: "Conversation started", ...owner },
    { workspace_id: workspace.id, kind: "files", title, last_activity_summary: "Shared space created", ...owner },
  ]);
  if (error) throw error;
}

export async function createCompany(form: FormData) {
  const ctx = await getWorkspace();
  const name = text(form, "name");
  const { data, error } = await ctx.supabase
    .from("companies")
    .insert({ workspace_id: ctx.workspace.id, name, website: text(form, "website") })
    .select("id")
    .single();
  if (error) throw error;
  await openChannels(ctx, { company_id: data.id }, name);
  revalidatePath("/crm");
}

export async function createContact(form: FormData) {
  const ctx = await getWorkspace();
  const companyId = optionalId(form, "company_id");
  const contact = {
    workspace_id: ctx.workspace.id,
    company_id: companyId,
    first_name: text(form, "first_name"),
    last_name: text(form, "last_name"),
    email: text(form, "email").toLowerCase(),
  };
  const { data, error } = await ctx.supabase.from("contacts").insert(contact).select("id").single();
  if (error) {
    if (error.code === "23505") redirect(`/crm?error=${encodeURIComponent("A contact with that email already exists.")}`);
    throw error;
  }
  if (!companyId) {
    const title = `${contact.first_name} ${contact.last_name}`.trim() || contact.email;
    await openChannels(ctx, { contact_id: data.id }, title);
  }
  revalidatePath("/crm", "layout");
}

export async function deleteCompany(companyId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("companies").delete().eq("workspace_id", workspace.id).eq("id", companyId);
  if (error) throw error;
  revalidatePath("/crm", "layout");
  redirect("/crm/companies");
}

export async function deleteContact(contactId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("contacts").delete().eq("workspace_id", workspace.id).eq("id", contactId);
  if (error) throw error;
  revalidatePath("/crm", "layout");
  redirect("/crm");
}

export type RecordRef = { kind: "contact"; id: string } | { kind: "company"; id: string };

function recordPath(record: RecordRef): string {
  return record.kind === "contact" ? `/crm/contacts/${record.id}` : `/crm/companies/${record.id}`;
}

async function saveDetails(
  { supabase, workspace }: WorkspaceContext,
  record: RecordRef,
  change: (current: { notes: string; field_values: Record<string, string> }) => { notes: string; field_values: Record<string, string> },
) {
  const column = record.kind === "contact" ? "contact_id" : "company_id";
  const { data, error } = await supabase
    .from("record_details")
    .select("notes, field_values")
    .eq("workspace_id", workspace.id)
    .eq(column, record.id)
    .maybeSingle();
  if (error) throw error;
  const next = change({ notes: data?.notes ?? "", field_values: parseFieldValues(data?.field_values) });
  const { error: saveError } = await supabase
    .from("record_details")
    .upsert(
      { workspace_id: workspace.id, [column]: record.id, ...next, updated_at: new Date().toISOString() },
      { onConflict: column },
    );
  if (saveError) throw saveError;
  revalidatePath(recordPath(record));
}

export async function saveNotes(record: RecordRef, form: FormData) {
  const notes = text(form, "notes").slice(0, 20000);
  await saveDetails(await getWorkspace(), record, (current) => ({ ...current, notes }));
}

export async function setFieldValue(record: RecordRef, fieldId: string, form: FormData) {
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
  await saveDetails(ctx, record, (current) => {
    const field_values = { ...current.field_values };
    if (parsed.value === "") delete field_values[field.id];
    else field_values[field.id] = parsed.value;
    return { ...current, field_values };
  });
  return {};
}

export async function createCustomField(record: RecordRef, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const type = parseFieldType(text(form, "type"));
  const name = text(form, "name");
  if (!type || !name) return;
  const { error } = await supabase.from("custom_fields").insert({ workspace_id: workspace.id, name: name.slice(0, 60), type });
  if (error && error.code !== "23505") throw error;
  revalidatePath(recordPath(record));
}

export async function setContactCompany(contactId: string, form: FormData) {
  await assignCompany(contactId, optionalId(form, "company_id"));
}

export async function removeContactFromCompany(contactId: string) {
  await assignCompany(contactId, null);
}

async function assignCompany(contactId: string, companyId: string | null) {
  const ctx = await getWorkspace();
  const { data: contact, error } = await ctx.supabase
    .from("contacts")
    .update({ company_id: companyId })
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", contactId)
    .select("first_name, last_name, email, channels(id)")
    .single();
  if (error) throw error;
  if (!companyId && contact.channels.length === 0) {
    const title = `${contact.first_name} ${contact.last_name}`.trim() || contact.email;
    await openChannels(ctx, { contact_id: contactId }, title);
  }
  revalidatePath("/crm", "layout");
}
