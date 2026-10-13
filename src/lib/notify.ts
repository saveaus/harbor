import type { WorkspaceContext } from "@/lib/workspace";

export async function notify(
  { supabase, workspace }: WorkspaceContext,
  notification: { title: string; body?: string; href?: string },
) {
  const { error } = await supabase.from("notifications").insert({ workspace_id: workspace.id, ...notification });
  if (error) throw error;
}
