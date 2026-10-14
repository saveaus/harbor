import { FileText, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { ListSearch } from "@/components/list-search";
import { Chip, GridCell, GridNameCell, GridRow, GridTable, ViewBar } from "@/components/record-list";
import { EmptyState, Field, Input, Select } from "@/components/ui";
import {
  COMPANY_DOCUMENT_STATUS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_VIEWS,
  companyDocumentState,
  documentListHref,
  documentMatches,
  documentView,
  param,
} from "@/lib/compliance";
import { labelMap, listDocuments, peopleOptions } from "@/lib/compliance-data";
import { formatDay } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { createDocument } from "../actions";

function NewDocument({ staff }: { staff: { id: string; label: string }[] }) {
  return (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New document
        </>
      }
      title="New document"
      description="This is a document your organisation keeps. Templates live in the library."
      action={createDocument}
      submitLabel="Create document"
    >
      <Field label="Title">
        <Input name="title" required maxLength={200} placeholder="Incident management procedure" />
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue="Policy">
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Record status">
        <Select name="status" defaultValue="draft">
          {Object.entries(COMPANY_DOCUMENT_STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Owner" note="optional">
        <Select name="owner_id" defaultValue="">
          <option value="">None</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.label}
            </option>
          ))}
        </Select>
      </Field>
    </FormDialog>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = documentView(param(params.view));
  const q = param(params.q).trim();
  const ctx = await requireApp("compliance");
  const [documents, people] = await Promise.all([listDocuments(ctx, q), peopleOptions(ctx)]);
  const staff = labelMap(people.staff);
  const visible = documents.filter((doc) => documentMatches(view, companyDocumentState(doc).key, doc.status));
  const keep = view === "all" ? "" : `view=${view}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewBar
        active={documentListHref(view, q)}
        views={(Object.keys(DOCUMENT_VIEWS) as (keyof typeof DOCUMENT_VIEWS)[]).map((key) => ({
          href: documentListHref(key, q),
          label: DOCUMENT_VIEWS[key],
        }))}
      >
        <NewDocument staff={people.staff} />
        <ListSearch path="/compliance/documents" q={q} keep={keep} placeholder="Search documents" />
      </ViewBar>
      {visible.length === 0 ? (
        <EmptyState
          icon={<FileText size={18} />}
          title={q ? "No documents match that search" : "No documents in this view"}
          body="Keep the policies, procedures and registers your organisation uses. Copying a template from the library starts a draft here."
          action={<NewDocument staff={people.staff} />}
        />
      ) : (
        <GridTable
          label="Company documents"
          footer={`${visible.length} document${visible.length === 1 ? "" : "s"}`}
          columns={[
            { label: "Document" },
            { label: "State" },
            { label: "Category" },
            { label: "Owner", priority: "lg" },
            { label: "Review", priority: "xl" },
            { label: "Expires", priority: "xl" },
          ]}
        >
          {visible.map((doc) => {
            const state = companyDocumentState(doc);
            return (
              <GridRow key={doc.id} href={`/compliance/documents/${doc.id}`} label={doc.title}>
                <GridNameCell name={doc.title} detail={doc.reference || doc.summary || null} />
                <GridCell>
                  <Chip tone={state.tone}>{state.label}</Chip>
                </GridCell>
                <GridCell>{doc.category}</GridCell>
                <GridCell priority="lg">{staff.get(doc.owner_id ?? "")}</GridCell>
                <GridCell priority="xl">{formatDay(doc.review_on)}</GridCell>
                <GridCell priority="xl">{formatDay(doc.expires_on)}</GridCell>
              </GridRow>
            );
          })}
        </GridTable>
      )}
    </div>
  );
}
