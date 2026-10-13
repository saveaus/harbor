import { cache } from "react";
import { redirect } from "next/navigation";
import { parseAppKey, type AppKey } from "@/lib/apps";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type PortalContext = {
  supabase: ServerSupabase;
  contact: Pick<Tables<"contacts">, "id" | "first_name" | "last_name" | "email" | "company_id">;
  company: { id: string; name: string } | null;
  workspace: Pick<
    Tables<"workspaces">,
    | "id"
    | "name"
    | "brand_color"
    | "logo_path"
    | "welcome_message"
    | "portal_home_body"
    | "portal_sidebar_color"
    | "portal_banner_path"
    | "portal_home_title"
    | "portal_home_show_tasks"
    | "portal_home_show_apps"
  >;
  installedApps: ReadonlySet<AppKey>;
  /** Contacts in a company share the company's conversation and file space. */
  channels: { messages: string | null; files: string | null };
};

export const getPortal = cache(async (): Promise<PortalContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contact, error } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, company_id, company:companies(id, name), workspace:workspaces(id, name, brand_color, logo_path, welcome_message, portal_home_body, portal_sidebar_color, portal_banner_path, portal_home_title, portal_home_show_tasks, portal_home_show_apps)",
    )
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!contact?.workspace) redirect("/");

  const { company, workspace, ...self } = contact;
  const channelQuery = supabase.from("channels").select("id, kind").eq("workspace_id", workspace.id);
  const [installs, channelRows] = await Promise.all([
    supabase.from("app_installs").select("app_key").eq("workspace_id", workspace.id),
    company ? channelQuery.eq("company_id", company.id) : channelQuery.eq("contact_id", self.id),
  ]);
  if (installs.error) throw installs.error;
  if (channelRows.error) throw channelRows.error;

  const installedApps = new Set<AppKey>();
  for (const install of installs.data) {
    const key = parseAppKey(install.app_key);
    if (key) installedApps.add(key);
  }

  return {
    supabase,
    contact: self,
    company,
    workspace,
    installedApps,
    channels: {
      messages: channelRows.data.find((c) => c.kind === "messages")?.id ?? null,
      files: channelRows.data.find((c) => c.kind === "files")?.id ?? null,
    },
  };
});

export async function requirePortalApp(key: AppKey): Promise<PortalContext> {
  const portal = await getPortal();
  if (!portal.installedApps.has(key)) redirect("/portal");
  return portal;
}
