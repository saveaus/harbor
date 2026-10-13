"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { text } from "@/lib/form-data";
import { fieldsToJson, parseAnswers, parseFields, type FormField } from "@/lib/forms";
import { emailClients, notify } from "@/lib/notify";
import { requireApp } from "@/lib/workspace";

export async function createForm(form: FormData) {
  const { supabase, workspace } = await requireApp("forms");
  const { data, error } = await supabase
    .from("forms")
    .insert({ workspace_id: workspace.id, name: text(form, "name"), description: text(form, "description") })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/forms");
  redirect(`/forms/${data.id}/edit`);
}

/** Redirects to the saved form on success; returns only expected validation failures. */
export async function saveForm(
  formId: string,
  draft: { name: string; description: string; fields: FormField[] },
): Promise<{ error: string }> {
  const { supabase, workspace } = await requireApp("forms");
  const fields = parseFields(draft.fields);
  if (!draft.name.trim()) return { error: "Give the form a name." };
  const { error } = await supabase
    .from("forms")
    .update({ name: draft.name.trim(), description: draft.description.trim(), fields: fieldsToJson(fields) })
    .eq("workspace_id", workspace.id)
    .eq("id", formId);
  if (error) throw error;
  revalidatePath("/forms", "layout");
  redirect(`/forms/${formId}`);
}

export async function requestForm(formId: string, form: FormData) {
  const { supabase, workspace } = await requireApp("forms");
  const { data: request, error } = await supabase
    .from("form_requests")
    .insert({ workspace_id: workspace.id, form_id: formId, contact_id: text(form, "contact_id") })
    .select("id, contact_id, form:forms(name)")
    .single();
  if (error) throw error;
  emailClients(workspace.id, { contact_id: request.contact_id, company_id: null }, {
    topic: "forms",
    subject: `${workspace.name} asked you to fill out ${request.form?.name ?? "a form"}`,
    path: `/portal/forms/${request.id}`,
  });
  revalidatePath(`/forms/${formId}`);
}

export async function submitAnswers(requestId: string, form: FormData) {
  const ctx = await requireApp("forms");
  const { data: request, error } = await ctx.supabase
    .from("form_requests")
    .select("id, form:forms(id, name, fields)")
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", requestId)
    .eq("status", "pending")
    .single();
  if (error) throw error;
  if (!request.form) throw new Error("This form no longer exists");

  const answers = parseAnswers(parseFields(request.form.fields), form);
  const { error: updateError } = await ctx.supabase
    .from("form_requests")
    .update({ status: "completed", answers, completed_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", requestId);
  if (updateError) throw updateError;
  await notify(ctx, { topic: "documents", title: `New response to ${request.form.name}`, href: `/forms/${request.form.id}` });
  revalidatePath("/", "layout");
  redirect(`/forms/${request.form.id}`);
}
