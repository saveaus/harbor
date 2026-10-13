"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { text } from "@/lib/form-data";
import { notify } from "@/lib/notify";
import { requireApp } from "@/lib/workspace";

export async function createTemplate(form: FormData) {
  const { supabase, workspace } = await requireApp("contracts");
  const { data, error } = await supabase
    .from("contract_templates")
    .insert({ workspace_id: workspace.id, name: text(form, "name"), body: text(form, "body") })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/contracts", "layout");
  redirect(`/contracts/templates/${data.id}`);
}

export async function updateTemplate(templateId: string, form: FormData) {
  const { supabase, workspace } = await requireApp("contracts");
  const { error } = await supabase
    .from("contract_templates")
    .update({ name: text(form, "name"), body: text(form, "body") })
    .eq("workspace_id", workspace.id)
    .eq("id", templateId);
  if (error) throw error;
  revalidatePath("/contracts", "layout");
}

export async function sendContract(form: FormData) {
  const { supabase, workspace } = await requireApp("contracts");
  const { data: template, error } = await supabase
    .from("contract_templates")
    .select("id, name, body")
    .eq("workspace_id", workspace.id)
    .eq("id", text(form, "template_id"))
    .single();
  if (error) throw error;
  const { error: insertError } = await supabase.from("contracts").insert({
    workspace_id: workspace.id,
    template_id: template.id,
    contact_id: text(form, "contact_id"),
    name: template.name,
    body: template.body,
  });
  if (insertError) throw insertError;
  revalidatePath("/contracts", "layout");
}

export async function recordSignature(contractId: string, form: FormData) {
  const ctx = await requireApp("contracts");
  const signedName = text(form, "signed_name");
  if (!signedName) throw new Error("Enter the signer's full name");
  const { data, error } = await ctx.supabase
    .from("contracts")
    .update({ status: "signed", signed_at: new Date().toISOString(), signed_name: signedName })
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", contractId)
    .eq("status", "awaiting_signature")
    .select("name")
    .maybeSingle();
  if (error) throw error;
  if (data) await notify(ctx, { title: `${signedName} signed ${data.name}`, href: `/contracts/${contractId}` });
  revalidatePath("/", "layout");
}
