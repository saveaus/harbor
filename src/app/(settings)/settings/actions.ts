"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { text } from "@/lib/form-data";
import { getWorkspace, requireAdmin } from "@/lib/workspace";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const LOGO_PATH = /^[0-9a-f-]{36}\/logo-\d+\.(png|jpe?g|webp)$/;
/** Same rule as the workspaces.custom_domain check constraint. */
const HOSTNAME = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export async function updateWorkspace(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("workspaces")
    .update({
      legal_name: text(form, "legal_name"),
      country: text(form, "country"),
      companies_enabled: form.get("companies_enabled") === "on",
      welcome_message: text(form, "welcome_message"),
    })
    .eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function updateBrand(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const color = text(form, "brand_color");
  if (!HEX_COLOR.test(color)) throw new Error("Brand color must be a hex value like #2f6fed");
  const { error } = await supabase
    .from("workspaces")
    .update({ name: text(form, "name"), brand_color: color })
    .eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

async function replaceLogo(newPath: string | null) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("workspaces").update({ logo_path: newPath }).eq("id", workspace.id);
  if (error) throw error;
  if (workspace.logo_path && workspace.logo_path !== newPath) {
    const removal = await supabase.storage.from("brand-assets").remove([workspace.logo_path]);
    if (removal.error) throw removal.error;
  }
  revalidatePath("/", "layout");
}

/** The browser uploads the image directly; this records it and removes the previous logo. */
export async function setLogo(path: string) {
  const { workspace } = await getWorkspace();
  if (!LOGO_PATH.test(path) || !path.startsWith(`${workspace.id}/`)) throw new Error("Logo path is outside this workspace");
  await replaceLogo(path);
}

export async function removeLogo() {
  await replaceLogo(null);
}

export async function updateCustomDomain(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const domain = text(form, "domain").toLowerCase().replace(/\.$/, "");
  if (!HOSTNAME.test(domain))
    redirect(`/settings/custom-domains?error=${encodeURIComponent("Enter a hostname like portal.yourcompany.com, without https://")}`);
  const { error } = await supabase
    .from("workspaces")
    .update({ custom_domain: domain, custom_domain_added_at: new Date().toISOString() })
    .eq("id", workspace.id);
  if (error?.code === "23505") redirect(`/settings/custom-domains?error=${encodeURIComponent("Another workspace already uses that domain.")}`);
  if (error) throw error;
  revalidatePath("/settings/custom-domains");
  redirect("/settings/custom-domains");
}

export async function removeCustomDomain() {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("workspaces")
    .update({ custom_domain: null, custom_domain_added_at: null })
    .eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/settings/custom-domains");
}

export async function updateProfile(form: FormData) {
  const { supabase, workspace, userId } = await getWorkspace();
  const { error } = await supabase
    .from("workspace_members")
    .update({ display_name: text(form, "display_name") })
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

const on = (form: FormData, name: string) => form.get(name) === "on";

function saved(path: string): never {
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

export async function updateNotificationPreferences(form: FormData) {
  const { supabase, workspace, userId } = await getWorkspace();
  const { error } = await supabase
    .from("workspace_members")
    .update({
      email_messages: on(form, "email_messages"),
      email_payments: on(form, "email_payments"),
      email_documents: on(form, "email_documents"),
    })
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId);
  if (error) throw error;
  saved("/settings/notifications");
}

export async function updateAssistantSettings(form: FormData) {
  const path = "/settings/assistant";
  const { supabase, workspace } = await requireAdmin(path);
  const { error } = await supabase
    .from("workspaces")
    .update({ assistant_enabled: on(form, "assistant_enabled"), assistant_instructions: text(form, "assistant_instructions").slice(0, 2000) })
    .eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/", "layout");
  saved(path);
}

export async function updateContactAuthentication(form: FormData) {
  const path = "/settings/contact-authentication";
  const { supabase, workspace } = await requireAdmin(path);
  const { error } = await supabase.from("workspaces").update({ contact_link_sign_in: on(form, "contact_link_sign_in") }).eq("id", workspace.id);
  if (error) throw error;
  saved(path);
}

export async function updateContactNotifications(form: FormData) {
  const path = "/settings/contact-notifications";
  const { supabase, workspace } = await requireAdmin(path);
  const { error } = await supabase
    .from("workspaces")
    .update({
      contact_email_messages: on(form, "contact_email_messages"),
      contact_email_invoices: on(form, "contact_email_invoices"),
      contact_email_contracts: on(form, "contact_email_contracts"),
      contact_email_forms: on(form, "contact_email_forms"),
    })
    .eq("id", workspace.id);
  if (error) throw error;
  saved(path);
}

export type ApiKeyState = { key?: string; error?: string };

export async function createApiKey(_state: ApiKeyState, form: FormData): Promise<ApiKeyState> {
  const { supabase, workspace } = await requireAdmin("/settings/api");
  const name = text(form, "name");
  if (!name || name.length > 60) return { error: "Name the key in 60 characters or fewer." };
  const key = `hk_${randomBytes(24).toString("base64url")}`;
  const { error } = await supabase.from("api_keys").insert({
    workspace_id: workspace.id,
    name,
    prefix: key.slice(0, 10),
    key_hash: createHash("sha256").update(key).digest("hex"),
  });
  if (error) throw error;
  revalidatePath("/settings/api");
  return { key };
}

export async function revokeApiKey(keyId: string) {
  const { supabase, workspace } = await requireAdmin("/settings/api");
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", keyId)
    .is("revoked_at", null);
  if (error) throw error;
  revalidatePath("/settings/api");
}

const STORAGE_BATCH = 1000;

export async function deleteWorkspace(form: FormData) {
  const path = "/settings/danger-zone";
  const { supabase, workspace, member } = await getWorkspace();
  const fail = (message: string): never => redirect(`${path}?error=${encodeURIComponent(message)}`);
  if (member.role !== "owner") fail("Only the workspace owner can delete it.");
  if (text(form, "confirm") !== workspace.name) fail(`Type ${workspace.name} exactly to confirm.`);

  const { data: files, error } = await supabase
    .from("file_items")
    .select("storage_path")
    .eq("workspace_id", workspace.id)
    .not("storage_path", "is", null);
  if (error) throw error;
  const paths = files.flatMap((file) => (file.storage_path ? [file.storage_path] : []));
  for (let start = 0; start < paths.length; start += STORAGE_BATCH) {
    const removal = await supabase.storage.from("workspace-files").remove(paths.slice(start, start + STORAGE_BATCH));
    if (removal.error) throw removal.error;
  }
  if (workspace.logo_path) {
    const removal = await supabase.storage.from("brand-assets").remove([workspace.logo_path]);
    if (removal.error) throw removal.error;
  }

  const { error: deleteError, count } = await supabase.from("workspaces").delete({ count: "exact" }).eq("id", workspace.id);
  if (deleteError) throw deleteError;
  if (count !== 1) fail("The workspace could not be deleted.");
  revalidatePath("/", "layout");
  redirect("/");
}
