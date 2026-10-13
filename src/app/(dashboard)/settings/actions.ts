"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { text } from "@/lib/form-data";
import { getWorkspace } from "@/lib/workspace";

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
    redirect(`/settings/domain?error=${encodeURIComponent("Enter a hostname like portal.yourcompany.com, without https://")}`);
  const { error } = await supabase
    .from("workspaces")
    .update({ custom_domain: domain, custom_domain_added_at: new Date().toISOString() })
    .eq("id", workspace.id);
  if (error?.code === "23505") redirect(`/settings/domain?error=${encodeURIComponent("Another workspace already uses that domain.")}`);
  if (error) throw error;
  revalidatePath("/settings/domain");
  redirect("/settings/domain");
}

export async function removeCustomDomain() {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("workspaces")
    .update({ custom_domain: null, custom_domain_added_at: null })
    .eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/settings/domain");
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
