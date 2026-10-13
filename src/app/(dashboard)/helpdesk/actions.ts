"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { text } from "@/lib/form-data";
import { requireApp } from "@/lib/workspace";

export async function createArticle(form: FormData) {
  const { supabase, workspace } = await requireApp("helpdesk");
  const { data, error } = await supabase
    .from("help_articles")
    .insert({ workspace_id: workspace.id, title: text(form, "title") })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/helpdesk");
  redirect(`/helpdesk/${data.id}`);
}

export async function saveArticle(articleId: string, form: FormData) {
  const { supabase, workspace } = await requireApp("helpdesk");
  const { error } = await supabase
    .from("help_articles")
    .update({
      title: text(form, "title"),
      body: text(form, "body"),
      published: form.get("published") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspace.id)
    .eq("id", articleId);
  if (error) throw error;
  revalidatePath("/helpdesk", "layout");
  redirect("/helpdesk");
}

export async function deleteArticle(articleId: string) {
  const { supabase, workspace } = await requireApp("helpdesk");
  const { error } = await supabase.from("help_articles").delete().eq("workspace_id", workspace.id).eq("id", articleId);
  if (error) throw error;
  revalidatePath("/helpdesk", "layout");
  redirect("/helpdesk");
}
