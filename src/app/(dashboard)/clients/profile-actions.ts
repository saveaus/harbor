"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ASSESSMENT_TYPE,
  CLIENT_CONTACT_KIND,
  CREDENTIALS,
  DOCUMENT_FOLDER,
  GOAL_STATUS,
  OBSERVATION_KIND,
  OBSERVATION_SEVERITY,
  PROFESSIONAL_TYPE,
  enumValue,
  parseDay,
} from "@/lib/care";
import { checked, money, optionalId, text } from "@/lib/form-data";
import type { Enums } from "@/lib/supabase/database.types";
import { getWorkspace } from "@/lib/workspace";

function path(contactId: string, tab: string) {
  return `/clients/${contactId}?tab=${tab}`;
}

function fail(contactId: string, tab: string, message: string): never {
  redirect(`${path(contactId, tab)}&error=${encodeURIComponent(message)}`);
}

function refresh(contactId: string) {
  revalidatePath(`/clients/${contactId}`);
  revalidatePath("/clients", "layout");
}

export async function saveCarePlan(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const title = text(form, "title").slice(0, 120);
  const created = parseDay(text(form, "created_on"));
  const renews = parseDay(text(form, "renews_on"));
  if (!title || "error" in created || "error" in renews || !created.value || !renews.value) {
    fail(contactId, "care", "Give the plan a title and valid dates.");
  }
  if (renews.value < created.value) fail(contactId, "care", "The renewal date can't be before the plan starts.");
  const { error } = await supabase.from("care_plans").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    title,
    created_on: created.value,
    renews_on: renews.value,
    summary: text(form, "summary").slice(0, 5000),
    storage_path: optionalId(form, "storage_path"),
    file_name: text(form, "file_name").slice(0, 200),
  });
  if (error) throw error;
  refresh(contactId);
}

export async function deleteCarePlan(contactId: string, planId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("care_plans").delete().eq("workspace_id", workspace.id).eq("contact_id", contactId).eq("id", planId);
  if (error) throw error;
  refresh(contactId);
}

export async function saveGoal(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const title = text(form, "title").slice(0, 160);
  if (!title) fail(contactId, "care", "Give the goal a title.");
  const target = parseDay(text(form, "target_on"));
  if ("error" in target) fail(contactId, "care", target.error);
  const { error } = await supabase.from("client_goals").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    title,
    description: text(form, "description").slice(0, 2000),
    status: enumValue(GOAL_STATUS, text(form, "status")) ?? "not_started",
    target_on: target.value,
  });
  if (error) throw error;
  refresh(contactId);
}

export async function setGoalStatus(contactId: string, goalId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const status = enumValue(GOAL_STATUS, text(form, "value"));
  if (!status) return;
  const { error } = await supabase
    .from("client_goals")
    .update({ status })
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId)
    .eq("id", goalId);
  if (error) throw error;
  refresh(contactId);
}

export async function deleteGoal(contactId: string, goalId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("client_goals").delete().eq("workspace_id", workspace.id).eq("contact_id", contactId).eq("id", goalId);
  if (error) throw error;
  refresh(contactId);
}

export async function saveObservation(contactId: string, form: FormData) {
  const { supabase, workspace, member } = await getWorkspace();
  const title = text(form, "title").slice(0, 160);
  const kind = enumValue(OBSERVATION_KIND, text(form, "kind"));
  const occurred = parseDay(text(form, "occurred_on"));
  if (!title || !kind || "error" in occurred || !occurred.value) fail(contactId, "observe", "Give the observation a title, type and date.");
  const { error } = await supabase.from("client_observations").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    kind,
    severity: enumValue(OBSERVATION_SEVERITY, text(form, "severity")) ?? "low",
    title,
    details: text(form, "details").slice(0, 5000),
    occurred_on: occurred.value,
    reporter_name: member.display_name || member.email,
  });
  if (error) throw error;
  refresh(contactId);
}

export async function resolveObservation(contactId: string, observationId: string, resolved: boolean) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("client_observations")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId)
    .eq("id", observationId);
  if (error) throw error;
  refresh(contactId);
}

export async function deleteObservation(contactId: string, observationId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("client_observations")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId)
    .eq("id", observationId);
  if (error) throw error;
  refresh(contactId);
}

export async function saveClientContact(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const name = text(form, "name").slice(0, 120);
  const kind = enumValue(CLIENT_CONTACT_KIND, text(form, "kind"));
  if (!name || !kind) fail(contactId, "contacts", "Give the connection a name and type.");
  const relationship = text(form, "relationship").slice(0, 60);
  if (kind === "contact" && !relationship) fail(contactId, "contacts", "Say how this person is related.");
  const email = text(form, "email");
  if (email && !email.includes("@")) fail(contactId, "contacts", "Enter a valid email address.");
  const { error } = await supabase.from("client_contacts").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    kind,
    name,
    relationship,
    is_primary: checked(form, "is_primary"),
    phone: text(form, "phone").slice(0, 40),
    email,
    address: text(form, "address").slice(0, 200),
    clinic: text(form, "clinic").slice(0, 120),
    specialty: text(form, "specialty").slice(0, 120),
    professional_type: enumValue(PROFESSIONAL_TYPE, text(form, "professional_type")),
    show_in_app: checked(form, "show_in_app"),
  });
  if (error) throw error;
  refresh(contactId);
}

export async function deleteClientContact(contactId: string, id: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("client_contacts").delete().eq("workspace_id", workspace.id).eq("contact_id", contactId).eq("id", id);
  if (error) throw error;
  refresh(contactId);
}

export async function saveBudgetLine(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const amount = money(form, "amount");
  if ("error" in amount) fail(contactId, "budget", amount.error);
  const starts = parseDay(text(form, "starts_on"));
  const ends = parseDay(text(form, "ends_on"));
  if ("error" in starts || "error" in ends) fail(contactId, "budget", "Enter valid dates.");
  const temporary = checked(form, "temporary");
  if (temporary && !ends.value) fail(contactId, "budget", "Temporary funding needs an end date.");
  const category = text(form, "category");
  if (category && !/^[0-9]{2}$/.test(category)) fail(contactId, "budget", "Support categories are two digits, or leave blank.");
  const { error } = await supabase.from("budget_lines").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    category,
    label: text(form, "label").slice(0, 120),
    amount_cents: amount.value,
    starts_on: starts.value,
    ends_on: ends.value,
    temporary,
  });
  if (error) throw error;
  refresh(contactId);
}

export async function deleteBudgetLine(contactId: string, lineId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("budget_lines").delete().eq("workspace_id", workspace.id).eq("contact_id", contactId).eq("id", lineId);
  if (error) throw error;
  refresh(contactId);
}

export async function saveDocument(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const title = text(form, "title").slice(0, 160);
  const folder = enumValue(DOCUMENT_FOLDER, text(form, "folder"));
  const storage_path = text(form, "storage_path");
  const file_name = text(form, "file_name").slice(0, 200);
  if (!title || !folder || !storage_path || !file_name) fail(contactId, "files", "Upload a file and give it a title.");
  const assessment = enumValue(ASSESSMENT_TYPE, text(form, "assessment_type"));
  if ((folder === "assessment") !== Boolean(assessment)) fail(contactId, "files", "Assessment files need an assessment type.");
  const size = Number.parseInt(text(form, "size_bytes"), 10);
  const { error } = await supabase.from("client_documents").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    folder,
    title,
    assessment_type: assessment,
    storage_path,
    file_name,
    size_bytes: Number.isFinite(size) ? size : 0,
    show_in_app: folder !== "secure" && checked(form, "show_in_app"),
  });
  if (error) throw error;
  refresh(contactId);
}

export async function deleteDocument(contactId: string, documentId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { data, error } = await supabase
    .from("client_documents")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId)
    .eq("id", documentId)
    .select("storage_path")
    .maybeSingle();
  if (error) throw error;
  if (data?.storage_path) await supabase.storage.from("workspace-files").remove([data.storage_path]);
  refresh(contactId);
}

export async function saveTask(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const title = text(form, "title").slice(0, 200);
  if (!title) fail(contactId, "tasks", "Give the task a title.");
  const due = parseDay(text(form, "due_on"));
  if ("error" in due) fail(contactId, "tasks", due.error);
  const minutes = Number.parseInt(text(form, "minutes") || "0", 10);
  const { error } = await supabase.from("billable_tasks").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    title,
    notes: text(form, "notes").slice(0, 4000),
    due_on: due.value,
    assignee_id: optionalId(form, "assignee_id"),
    minutes: Number.isFinite(minutes) ? Math.min(Math.max(minutes, 0), 10080) : 0,
  });
  if (error) throw error;
  refresh(contactId);
}

export async function setTaskDone(contactId: string, taskId: string, done: boolean) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("billable_tasks")
    .update({
      status: done ? "done" : "outstanding",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId)
    .eq("id", taskId)
    .is("billable_id", null);
  if (error) throw error;
  refresh(contactId);
}

export async function deleteTask(contactId: string, taskId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("billable_tasks")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId)
    .eq("id", taskId)
    .is("billable_id", null);
  if (error) throw error;
  refresh(contactId);
}

export async function setStaffPreference(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const staffId = optionalId(form, "staff_id");
  const preference = text(form, "preference") === "excluded" ? "excluded" : "preferred";
  if (!staffId) fail(contactId, "overview", "Choose a staff member.");
  const { error } = await supabase.from("client_staff_preferences").upsert(
    { workspace_id: workspace.id, contact_id: contactId, staff_id: staffId, preference },
    { onConflict: "contact_id,staff_id" },
  );
  if (error) throw error;
  refresh(contactId);
}

export async function removeStaffPreference(contactId: string, staffId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("client_staff_preferences")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId)
    .eq("staff_id", staffId);
  if (error) throw error;
  refresh(contactId);
}

export async function setRequiredCredentials(contactId: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const required = form
    .getAll("kind")
    .filter((v): v is string => typeof v === "string")
    .filter((v): v is Enums<"credential_kind"> => Boolean(enumValue(CREDENTIALS, v)));
  const { error } = await supabase
    .from("client_profiles")
    .update({ required_credentials: required, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contactId);
  if (error) throw error;
  refresh(contactId);
}
