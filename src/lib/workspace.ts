import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { DEFAULT_APP_KEYS, parseAppKey, type AppKey } from "@/lib/apps";

export type WorkspaceContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  member: Pick<Tables<"workspace_members">, "role" | "display_name" | "email">;
  workspace: Tables<"workspaces">;
  installedApps: ReadonlySet<AppKey>;
};

export const getWorkspace = cache(async (): Promise<WorkspaceContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("role, display_name, email, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!membership?.workspace) redirect("/");

  const { workspace, ...member } = membership;
  const { data: installs, error: installError } = await supabase
    .from("app_installs")
    .select("app_key")
    .eq("workspace_id", workspace.id);
  if (installError) throw installError;

  const installedApps = new Set<AppKey>(DEFAULT_APP_KEYS);
  for (const install of installs) {
    const key = parseAppKey(install.app_key);
    if (key) installedApps.add(key);
  }

  return { supabase, userId: user.id, member, workspace, installedApps };
});

export async function requireApp(key: AppKey): Promise<WorkspaceContext> {
  const context = await getWorkspace();
  if (!context.installedApps.has(key)) redirect(`/apps?app=${key}`);
  return context;
}

/** Owners and admins only; members are sent back to `path` with an explanation. */
export async function requireAdmin(path: string): Promise<WorkspaceContext> {
  const context = await getWorkspace();
  if (context.member.role === "member")
    redirect(`${path}?error=${encodeURIComponent("Only workspace owners and admins can change this.")}`);
  return context;
}
