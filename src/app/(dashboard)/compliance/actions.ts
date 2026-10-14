"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enumValue, parseDay } from "@/lib/care";
import {
  COMPANY_DOCUMENT_STATUS,
  INCIDENT_CATEGORIES,
  INCIDENT_PRIORITY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  reportKey,
} from "@/lib/compliance";
import { text } from "@/lib/form-data";
import { registrationGroup } from "@/lib/ndis-registration";
import { getPolicyTemplate } from "@/lib/policy-library";
import type { Json } from "@/lib/supabase/database.types";
import { requireAdmin, requireApp, type WorkspaceContext } from "@/lib/workspace";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiredText(value: string, label: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) throw new Error(`Enter a ${label} under ${max} characters.`);
  return trimmed;
}

function bounded(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`${label} must be under ${max} characters.`);
  return trimmed;
}

function timestamp(value: string, label: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error(`Enter a valid ${label}.`);
  return date.toISOString();
}

function optionalUuid(form: FormData, name: string): string | null {
  const value = text(form, name);
  if (!value) return null;
  if (!UUID.test(value)) throw new Error("Choose a person from the list.");
  return value;
}

function day(form: FormData, name: string): string | null {
  const parsed = parseDay(text(form, name));
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.value;
}

function selectedIds(form: FormData): string[] {
  return [...new Set(form.getAll("ids").filter((value): value is string => typeof value === "string" && UUID.test(value)))].slice(0, 500);
}

async function owned(ctx: WorkspaceContext, table: "contacts" | "staff", id: string | null, label: string) {
  if (!id) return;
  const { data, error } = await ctx.supabase.from(table).select("id").eq("workspace_id", ctx.workspace.id).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Choose a ${label} in this workspace.`);
}

function incidentInput(form: FormData) {
  const category = text(form, "category");
  if (!(INCIDENT_CATEGORIES as readonly string[]).includes(category)) throw new Error("Choose a category.");
  return {
    title: requiredText(text(form, "title"), "title", 200),
    description: bounded(text(form, "description"), 20000, "Description"),
    category,
    priority: enumValue(INCIDENT_PRIORITY, text(form, "priority")) ?? "medium",
    severity: enumValue(INCIDENT_SEVERITY, text(form, "severity")) ?? "minor",
    location: bounded(text(form, "location"), 200, "Location"),
    occurred_at: timestamp(text(form, "occurred_at"), "date occurred"),
    reported_at: timestamp(text(form, "reported_at"), "date reported"),
    contact_id: optionalUuid(form, "contact_id"),
    reported_by_id: optionalUuid(form, "reported_by_id"),
    assigned_to_id: optionalUuid(form, "assigned_to_id"),
  };
}

async function checkPeople(ctx: WorkspaceContext, input: ReturnType<typeof incidentInput>) {
  await owned(ctx, "contacts", input.contact_id, "client");
  await owned(ctx, "staff", input.reported_by_id, "staff member");
  await owned(ctx, "staff", input.assigned_to_id, "staff member");
}

export async function createIncident(form: FormData) {
  const ctx = await requireApp("compliance");
  const input = incidentInput(form);
  await checkPeople(ctx, input);
  const { data, error } = await ctx.supabase
    .from("incidents")
    .insert({ workspace_id: ctx.workspace.id, status: "triage", ...input })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/compliance/incidents");
  redirect(`/compliance/incidents/${data.id}`);
}

export async function updateIncident(incidentId: string, form: FormData) {
  const ctx = await requireApp("compliance");
  const input = incidentInput(form);
  await checkPeople(ctx, input);
  const { error } = await ctx.supabase.from("incidents").update(input).eq("workspace_id", ctx.workspace.id).eq("id", incidentId);
  if (error) throw error;
  revalidatePath("/compliance/incidents");
  redirect(`/compliance/incidents/${incidentId}`);
}

export async function setIncidentStatus(incidentId: string, form: FormData): Promise<{ error?: string }> {
  const ctx = await requireApp("compliance");
  const status = enumValue(INCIDENT_STATUS, text(form, "value"));
  if (!status) return { error: "Choose a status." };
  const { error } = await ctx.supabase.from("incidents").update({ status }).eq("workspace_id", ctx.workspace.id).eq("id", incidentId);
  if (error) return { error: error.message };
  revalidatePath("/compliance/incidents");
  return {};
}

export async function bulkSetIncidentStatus(form: FormData) {
  const ctx = await requireApp("compliance");
  const status = enumValue(INCIDENT_STATUS, text(form, "value"));
  const ids = selectedIds(form);
  if (!status || ids.length === 0) return;
  const { error } = await ctx.supabase.from("incidents").update({ status }).eq("workspace_id", ctx.workspace.id).in("id", ids);
  if (error) throw error;
  revalidatePath("/compliance/incidents");
}

export async function addIncidentNote(incidentId: string, form: FormData) {
  const ctx = await requireApp("compliance");
  const body = requiredText(text(form, "body"), "note", 8000);
  const { error } = await ctx.supabase.from("incident_notes").insert({
    workspace_id: ctx.workspace.id,
    incident_id: incidentId,
    body,
    author_name: ctx.member.display_name || ctx.member.email,
  });
  if (error) throw error;
  revalidatePath(`/compliance/incidents/${incidentId}`);
  redirect(`/compliance/incidents/${incidentId}?tab=notes`);
}

export async function deleteIncident(incidentId: string) {
  const ctx = await requireApp("compliance");
  const { error } = await ctx.supabase.from("incidents").delete().eq("workspace_id", ctx.workspace.id).eq("id", incidentId);
  if (error) throw error;
  revalidatePath("/compliance/incidents");
  redirect("/compliance/incidents");
}

function documentInput(form: FormData) {
  const status = enumValue(COMPANY_DOCUMENT_STATUS, text(form, "status")) ?? "current";
  return {
    title: requiredText(text(form, "title"), "title", 200),
    category: requiredText(text(form, "category"), "category", 80),
    status,
    summary: bounded(text(form, "summary"), 500, "Summary"),
    body: bounded(text(form, "body"), 100000, "Document"),
    reference: bounded(text(form, "reference"), 80, "Reference"),
    owner_id: optionalUuid(form, "owner_id"),
    issued_on: day(form, "issued_on"),
    review_on: day(form, "review_on"),
    expires_on: day(form, "expires_on"),
  };
}

export async function createDocument(form: FormData) {
  const ctx = await requireApp("compliance");
  const input = documentInput(form);
  await owned(ctx, "staff", input.owner_id, "owner");
  const { data, error } = await ctx.supabase
    .from("company_documents")
    .insert({ workspace_id: ctx.workspace.id, ...input })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/compliance/documents");
  redirect(`/compliance/documents/${data.id}`);
}

export async function updateDocument(documentId: string, form: FormData) {
  const ctx = await requireApp("compliance");
  const input = documentInput(form);
  await owned(ctx, "staff", input.owner_id, "owner");
  const { error } = await ctx.supabase.from("company_documents").update(input).eq("workspace_id", ctx.workspace.id).eq("id", documentId);
  if (error) throw error;
  revalidatePath("/compliance/documents");
  redirect(`/compliance/documents/${documentId}`);
}

export async function deleteDocument(documentId: string) {
  const ctx = await requireApp("compliance");
  const { error } = await ctx.supabase.from("company_documents").delete().eq("workspace_id", ctx.workspace.id).eq("id", documentId);
  if (error) throw error;
  revalidatePath("/compliance/documents");
  redirect("/compliance/documents");
}

export async function copyPolicyTemplate(slug: string) {
  const ctx = await requireApp("compliance");
  const template = await getPolicyTemplate(ctx.supabase, slug);
  if (!template) throw new Error("That template is not in the library.");
  const { data, error } = await ctx.supabase
    .from("company_documents")
    .insert({
      workspace_id: ctx.workspace.id,
      title: template.title,
      category: template.category,
      summary: template.summary,
      body: template.body,
      status: "draft",
      template_id: template.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/compliance/documents");
  redirect(`/compliance/documents/${data.id}`);
}

const FILTER_KEYS = ["status", "priority", "severity", "category", "from", "to", "q", "window"] as const;

export async function saveReport(key: string, form: FormData) {
  const ctx = await requireApp("compliance");
  const report = reportKey(key);
  if (!report) throw new Error("Choose a report.");
  const filters: Record<string, string> = {};
  for (const name of FILTER_KEYS) {
    const value = text(form, name).slice(0, 80);
    if (value) filters[name] = value;
  }
  const { error } = await ctx.supabase.from("saved_reports").insert({
    workspace_id: ctx.workspace.id,
    name: requiredText(text(form, "name"), "name", 120),
    report_key: report,
    filters: filters as Json,
  });
  if (error) throw error;
  revalidatePath("/compliance/reports");
  redirect(`/compliance/reports/${report}`);
}

export async function saveRegistrationGroups(form: FormData) {
  await requireApp("compliance");
  const { supabase, workspace } = await requireAdmin("/compliance");
  const groups = [
    ...new Set(
      form
        .getAll("group")
        .filter((value): value is string => typeof value === "string")
        .flatMap((value) => {
          const code = registrationGroup(value);
          return code ? [code] : [];
        }),
    ),
  ];
  const { error: clearError } = await supabase.from("workspace_registration_groups").delete().eq("workspace_id", workspace.id);
  if (clearError) throw clearError;
  if (groups.length) {
    const { error } = await supabase
      .from("workspace_registration_groups")
      .insert(groups.map((group_code) => ({ workspace_id: workspace.id, group_code })));
    if (error) throw error;
  }
  revalidatePath("/compliance");
  redirect("/compliance");
}

export async function deleteSavedReport(reportId: string) {
  const ctx = await requireApp("compliance");
  const { error } = await ctx.supabase.from("saved_reports").delete().eq("workspace_id", ctx.workspace.id).eq("id", reportId);
  if (error) throw error;
  revalidatePath("/compliance/reports");
}
