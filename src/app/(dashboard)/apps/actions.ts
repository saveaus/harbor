"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { APPS, type AppKey } from "@/lib/apps";
import { getWorkspace } from "@/lib/workspace";

/** Removing an app hides it for the team and clients but keeps its data. */
export async function setAppInstalled(key: AppKey, installed: boolean) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = installed
    ? await supabase
        .from("app_installs")
        .upsert({ workspace_id: workspace.id, app_key: key }, { onConflict: "workspace_id,app_key", ignoreDuplicates: true })
    : await supabase.from("app_installs").delete().eq("workspace_id", workspace.id).eq("app_key", key);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function installApp(key: AppKey) {
  await setAppInstalled(key, true);
  redirect(APPS[key].href);
}
