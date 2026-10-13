import { notFound } from "next/navigation";
import type { WorkspaceContext } from "@/lib/workspace";

export async function listChannels({ supabase, workspace }: WorkspaceContext, kind: "messages" | "files") {
  const { data, error } = await supabase
    .from("channels")
    .select("id, title, company_id, last_activity_at, last_activity_summary")
    .eq("workspace_id", workspace.id)
    .eq("kind", kind)
    .order("last_activity_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getChannel({ supabase, workspace }: WorkspaceContext, kind: "messages" | "files", id: string) {
  const { data, error } = await supabase
    .from("channels")
    .select("id, title, company_id, contact_id")
    .eq("workspace_id", workspace.id)
    .eq("kind", kind)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
}

export async function touchChannel({ supabase, workspace }: WorkspaceContext, id: string, summary: string) {
  const { error } = await supabase
    .from("channels")
    .update({ last_activity_at: new Date().toISOString(), last_activity_summary: summary.slice(0, 140) })
    .eq("workspace_id", workspace.id)
    .eq("id", id);
  if (error) throw error;
}
