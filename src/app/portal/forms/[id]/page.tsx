import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FormFieldInputs } from "@/components/form-fields";
import { Alert, Button } from "@/components/ui";
import { parseFields } from "@/lib/forms";
import { requirePortalApp } from "@/lib/portal";
import { submitPortalForm } from "../../actions";

export default async function PortalFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error: notice }, { supabase, workspace }] = await Promise.all([params, searchParams, requirePortalApp("forms")]);
  const { data: request, error } = await supabase
    .from("form_requests")
    .select("id, status, form:forms(name, description, fields)").eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!request?.form) notFound();
  if (request.status !== "pending") redirect("/portal/forms");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-6">
        <Link href="/portal/forms" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Forms
        </Link>
        <h1 className="mt-3 text-[20px] font-semibold tracking-tight">{request.form.name}</h1>
        {request.form.description ? <p className="mt-1 text-[13px] whitespace-pre-wrap text-ink-3">{request.form.description}</p> : null}

        <form action={submitPortalForm.bind(null, request.id)} className="mt-6 space-y-4">
          {notice ? <Alert>{notice}</Alert> : null}
          <FormFieldInputs fields={parseFields(request.form.fields)} />
          <div className="flex justify-end border-t border-line pt-5">
            <Button type="submit" variant="primary">
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
