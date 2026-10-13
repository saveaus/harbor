import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { requireApp } from "@/lib/workspace";
import { updateTemplate } from "../../actions";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireApp("contracts");
  const { data: template, error } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!template) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <Link href="/contracts/templates" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ChevronLeft size={14} /> Templates
      </Link>
      <form action={updateTemplate.bind(null, template.id)} className="mt-4 space-y-4">
        <Field label="Name">
          <Input name="name" defaultValue={template.name} required maxLength={120} />
        </Field>
        <Field label="Contract text" hint="Changes apply to contracts you send from now on.">
          <Textarea name="body" rows={18} defaultValue={template.body} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary">
            Save template
          </Button>
        </div>
      </form>
    </div>
  );
}
