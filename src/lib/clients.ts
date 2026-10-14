import { personName } from "@/lib/format";
import type { WorkspaceContext } from "@/lib/workspace";

export async function listClientOptions({ supabase, workspace }: WorkspaceContext) {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email")
    .eq("workspace_id", workspace.id)
    .order("first_name");
  if (error) throw error;
  return data.map((c) => ({ id: c.id, label: `${personName(c)} · ${c.email}` }));
}
