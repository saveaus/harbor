import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Send } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Badge, ButtonLink, Card, Field, Select } from "@/components/ui";
import { listContactOptions } from "@/lib/contacts";
import { contactName, formatDate } from "@/lib/format";
import { fieldTypeLabels, parseFields, readAnswer } from "@/lib/forms";
import { requireApp } from "@/lib/workspace";
import { requestForm } from "../actions";

export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireApp("forms");
  const [formResult, contacts] = await Promise.all([
    ctx.supabase
      .from("forms")
      .select("*, form_requests(id, status, answers, sent_at, completed_at, contact:contacts(first_name, last_name, email))")
      .eq("workspace_id", ctx.workspace.id)
      .eq("id", id)
      .maybeSingle(),
    listContactOptions(ctx),
  ]);
  if (formResult.error) throw formResult.error;
  const form = formResult.data;
  if (!form) notFound();
  const fields = parseFields(form.fields);
  const requests = [...form.form_requests].sort((a, b) => b.sent_at.localeCompare(a.sent_at));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <Link href="/forms" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ChevronLeft size={14} /> Forms
      </Link>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">{form.name}</h1>
          {form.description ? <p className="mt-0.5 text-[13px] text-ink-3">{form.description}</p> : null}
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/forms/${form.id}/edit`}>
            <Pencil size={14} /> Edit
          </ButtonLink>
          {fields.length > 0 ? (
            <FormDialog
              trigger={
                <>
                  <Send size={14} /> Request
                </>
              }
              title={`Request "${form.name}"`}
              description="The contact will see it in their portal until they submit it."
              action={requestForm.bind(null, form.id)}
              submitLabel="Send request"
            >
              <Field label="Contact">
                <Select name="contact_id" required>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormDialog>
          ) : null}
        </div>
      </div>

      <Card className="mt-6">
        <div className="border-b border-line px-4 py-3 text-[13px] font-semibold">Questions</div>
        {fields.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-ink-3">
            No questions yet.{" "}
            <Link href={`/forms/${form.id}/edit`} className="font-medium text-link hover:underline">
              Add some
            </Link>
            .
          </p>
        ) : (
          <ol>
            {fields.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-0">
                <span className="w-5 text-ink-4">{i + 1}.</span>
                <span className="flex-1">
                  {f.label}
                  {f.required ? <span className="text-danger"> *</span> : null}
                </span>
                <span className="text-[12px] text-ink-3">{fieldTypeLabels[f.type]}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <h2 className="mt-8 mb-3 text-[14px] font-semibold">Requests</h2>
      {requests.length === 0 ? (
        <p className="text-[13px] text-ink-3">No one has been asked to fill this in yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 text-[13px] font-medium">{r.contact ? contactName(r.contact) : "Deleted contact"}</span>
                <span className="text-[12px] text-ink-3">
                  {r.status === "completed" ? `Submitted ${formatDate(r.completed_at)}` : `Requested ${formatDate(r.sent_at)}`}
                </span>
                {r.status === "completed" ? (
                  <Badge tone="success">Completed</Badge>
                ) : (
                  <>
                    <Badge tone="warning">Pending</Badge>
                    <Link href={`/forms/responses/${r.id}`} className="text-[12px] font-medium text-link hover:underline">
                      Enter answers
                    </Link>
                  </>
                )}
              </div>
              {r.status === "completed" ? (
                <dl className="border-t border-line px-4 py-3 text-[13px]">
                  {fields.map((f) => (
                    <div key={f.id} className="grid grid-cols-[200px_1fr] gap-3 py-1">
                      <dt className="text-ink-3">{f.label}</dt>
                      <dd className="whitespace-pre-wrap">{readAnswer(r.answers, f.id)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
