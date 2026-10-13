"use server";

import { revalidatePath } from "next/cache";
import { text } from "@/lib/form-data";
import { getWorkspace } from "@/lib/workspace";
import type { SaveState } from "../brand/actions";

export async function updatePortalHome(_state: SaveState, form: FormData): Promise<SaveState> {
  const { supabase, workspace, member } = await getWorkspace();
  if (member.role === "member") return { error: "Only workspace owners and admins can change the client home." };
  const title = text(form, "portal_home_title");
  const body = text(form, "portal_home_body");
  if (title.length > 120) return { error: "Keep the title to 120 characters." };
  if (body.length > 1000) return { error: "Keep the message to 1,000 characters." };
  const { error } = await supabase
    .from("workspaces")
    .update({
      portal_home_title: title,
      portal_home_body: body,
      portal_home_show_tasks: form.get("portal_home_show_tasks") === "on",
      portal_home_show_apps: form.get("portal_home_show_apps") === "on",
    })
    .eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/home");
  revalidatePath("/portal", "layout");
  return { saved: true };
}

export async function dismissGettingStarted() {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("workspaces").update({ getting_started_dismissed: true }).eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/home");
}
