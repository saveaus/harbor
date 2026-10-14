import type { Enums } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";

/** Product templates for policies and procedures. Content is added later; this module does not store organisation documents. */
export const POLICY_KIND: Record<Enums<"policy_kind">, string> = {
  policy: "Policies",
  procedure: "Procedures",
};

export type PolicyTemplate = {
  id: string;
  slug: string;
  kind: Enums<"policy_kind">;
  title: string;
  category: string;
  summary: string;
  body: string;
  version: string;
};

type Client = WorkspaceContext["supabase"];

export async function listPolicyTemplates(supabase: Client): Promise<PolicyTemplate[]> {
  const { data, error } = await supabase
    .from("policy_templates")
    .select("id, slug, kind, title, category, summary, body, version")
    .eq("published", true)
    .order("sort_order")
    .order("title");
  if (error) throw error;
  return data;
}

export async function getPolicyTemplate(supabase: Client, slug: string): Promise<PolicyTemplate | null> {
  const { data, error } = await supabase
    .from("policy_templates")
    .select("id, slug, kind, title, category, summary, body, version")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
