"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ViewObject } from "@/lib/saved-views";
import { getWorkspace } from "@/lib/workspace";

export async function saveView(object: ViewObject, query: string, name: string): Promise<{ error?: string }> {
  const { supabase, workspace } = await getWorkspace();
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return { error: "Name the view." };
  const { data, error } = await supabase
    .from("saved_views")
    .insert({ workspace_id: workspace.id, object, name: trimmed, query: query.slice(0, 2000) })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "A view with that name already exists." };
    throw error;
  }
  revalidatePath(`/${object}`);
  redirect(`/${object}?view=${data.id}${query ? `&${query}` : ""}`);
}

export async function deleteView(object: ViewObject, viewId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("saved_views").delete().eq("workspace_id", workspace.id).eq("object", object).eq("id", viewId);
  if (error) throw error;
  revalidatePath(`/${object}`);
  redirect(`/${object}`);
}
