import type { WorkspaceContext } from "@/lib/workspace";

export type ViewObject = "clients" | "staff";

export type SavedView = { id: string; name: string; query: string };

export async function loadSavedViews({ supabase, workspace }: WorkspaceContext, object: ViewObject): Promise<SavedView[]> {
  const { data, error } = await supabase
    .from("saved_views")
    .select("id, name, query")
    .eq("workspace_id", workspace.id)
    .eq("object", object)
    .order("created_at");
  if (error) throw error;
  return data;
}

/** Saved view queries are stored without a leading "?" and parsed like a page's search params. */
export function viewParams(query: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    const existing = params[key];
    params[key] = existing === undefined ? value : Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return params;
}
