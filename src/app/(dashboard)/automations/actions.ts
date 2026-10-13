"use server";

import { revalidatePath } from "next/cache";
import { parseAction, parseTrigger } from "@/lib/automations";
import { text } from "@/lib/form-data";
import { getWorkspace } from "@/lib/workspace";

export async function createAutomation(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const trigger = parseTrigger(text(form, "trigger"));
  const action = parseAction(text(form, "action"));
  if (!trigger || !action) throw new Error("Choose when the automation runs and what it does");
  const message = text(form, "message");
  if (action === "send_message" && !message) throw new Error("Write the message to send");
  const { error } = await supabase
    .from("automations")
    .insert({ workspace_id: workspace.id, name: text(form, "name"), trigger, action, message });
  if (error) throw error;
  revalidatePath("/automations");
}

export async function setAutomationEnabled(id: string, enabled: boolean) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("automations").update({ enabled }).eq("workspace_id", workspace.id).eq("id", id);
  if (error) throw error;
  revalidatePath("/automations");
}

export async function deleteAutomation(id: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("automations").delete().eq("workspace_id", workspace.id).eq("id", id);
  if (error) throw error;
  revalidatePath("/automations");
}
