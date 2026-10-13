"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { APPS, type AppKey } from "@/lib/apps";
import { getWorkspace } from "@/lib/workspace";

export async function installApp(key: AppKey) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("app_installs")
    .upsert({ workspace_id: workspace.id, app_key: key }, { onConflict: "workspace_id,app_key", ignoreDuplicates: true });
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect(APPS[key].href);
}

export async function uninstallApp(key: AppKey) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("app_installs").delete().eq("workspace_id", workspace.id).eq("app_key", key);
  if (error) throw error;
  revalidatePath("/", "layout");
}
