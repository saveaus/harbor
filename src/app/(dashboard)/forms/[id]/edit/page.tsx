import { notFound } from "next/navigation";
import { parseFields } from "@/lib/forms";
import { requireApp } from "@/lib/workspace";
import { FormBuilder } from "./form-builder";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireApp("forms");
  const { data, error } = await supabase
    .from("forms")
    .select("id, name, description, fields")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return <FormBuilder formId={data.id} initial={{ name: data.name, description: data.description, fields: parseFields(data.fields) }} />;
}
