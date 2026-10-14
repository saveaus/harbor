import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Chip } from "@/components/record-list";
import { Button, Field, Input, Select, Textarea, buttonClass, textLinkClass } from "@/components/ui";
import { COMPANY_DOCUMENT_STATUS, DOCUMENT_CATEGORIES, companyDocumentState } from "@/lib/compliance";
import { getDocument, peopleOptions } from "@/lib/compliance-data";
import { requireApp } from "@/lib/workspace";
import { deleteDocument, updateDocument } from "../../actions";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireApp("compliance");
  const [document, people] = await Promise.all([getDocument(ctx, id), peopleOptions(ctx)]);
  if (!document) notFound();
  const state = companyDocumentState(document);
  const categories = DOCUMENT_CATEGORIES.includes(document.category as (typeof DOCUMENT_CATEGORIES)[number])
    ? DOCUMENT_CATEGORIES
    : [document.category, ...DOCUMENT_CATEGORIES];
  let template: { slug: string; title: string } | null = null;
  if (document.template_id) {
    const { data, error } = await ctx.supabase
      .from("policy_templates")
      .select("slug, title")
      .eq("id", document.template_id)
      .maybeSingle();
    if (error) throw error;
    template = data;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/compliance/documents" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
            <ChevronLeft size={14} /> Documents
          </Link>
          <div className="flex items-center gap-2">
            <Chip tone={state.tone}>{state.label}</Chip>
            <form action={deleteDocument.bind(null, document.id)}>
              <ConfirmSubmit confirm={`Delete ${document.title}?`} className={buttonClass("danger")}>
                <Trash2 size={14} /> Delete
              </ConfirmSubmit>
            </form>
          </div>
        </div>
        {template ? (
          <p className="mt-4 text-[13px] text-ink-3">
            Copied from the library template{" "}
            <Link href={`/compliance/library/${template.slug}`} className={textLinkClass}>
              {template.title}
            </Link>
            . This copy belongs to your organisation.
          </p>
        ) : null}
        <form action={updateDocument.bind(null, document.id)} className="mt-4 space-y-4">
          <Field label="Title">
            <Input name="title" required maxLength={200} defaultValue={document.title} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select name="category" defaultValue={document.category}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Record status" hint="Review and expiry dates change the badge while the record is current.">
              <Select name="status" defaultValue={document.status}>
                {Object.entries(COMPANY_DOCUMENT_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Issued" note="optional">
              <Input type="date" name="issued_on" defaultValue={document.issued_on ?? ""} />
            </Field>
            <Field label="Review due" note="optional">
              <Input type="date" name="review_on" defaultValue={document.review_on ?? ""} />
            </Field>
            <Field label="Expires" note="optional">
              <Input type="date" name="expires_on" defaultValue={document.expires_on ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reference" note="optional">
              <Input name="reference" maxLength={80} defaultValue={document.reference} placeholder="POL-04" />
            </Field>
            <Field label="Owner" note="optional">
              <Select name="owner_id" defaultValue={document.owner_id ?? ""}>
                <option value="">None</option>
                {people.staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Summary" note="optional">
            <Input name="summary" maxLength={500} defaultValue={document.summary} />
          </Field>
          <Field label="Document">
            <Textarea name="body" rows={16} maxLength={100000} defaultValue={document.body} placeholder="The text your organisation uses." />
          </Field>
          <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit" variant="primary">
              Save document
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
