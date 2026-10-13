import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FormFieldInputs } from "@/components/form-fields";
import { Button, Card } from "@/components/ui";
import { contactName } from "@/lib/format";
import { parseFields } from "@/lib/forms";
import { requireApp } from "@/lib/workspace";
import { submitAnswers } from "../../actions";

export default async function RespondPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireApp("forms");
  const { data: request, error } = await supabase
    .from("form_requests")
    .select("id, status, form:forms(id, name, description, fields), contact:contacts(first_name, last_name, email)")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!request?.form || request.status !== "pending") notFound();
  const fields = parseFields(request.form.fields);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      <Link href={`/forms/${request.form.id}`} className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ChevronLeft size={14} /> {request.form.name}
      </Link>
      <h1 className="mt-3 text-[18px] font-semibold">Enter answers for {request.contact ? contactName(request.contact) : "contact"}</h1>
      <p className="mt-0.5 text-[13px] text-ink-3">
        Use this when a client sends answers another way. Clients with portal access can fill it in themselves.
      </p>
      <Card className="mt-5 p-5">
        <form action={submitAnswers.bind(null, request.id)} className="space-y-4">
          <FormFieldInputs fields={fields} />
          <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit" variant="primary">
              Submit answers
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
