import { FileText, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Cell, EmptyState, Field, Input, Row, Table, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { createTemplate } from "../actions";

function NewTemplateDialog() {
  return (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New template
        </>
      }
      title="New contract template"
      action={createTemplate}
      submitLabel="Create template"
    >
      <Field label="Name">
        <Input name="name" required maxLength={120} placeholder="Services agreement" />
      </Field>
      <Field label="Contract text">
        <Textarea name="body" rows={8} placeholder="Write or paste your agreement…" />
      </Field>
    </FormDialog>
  );
}

export default async function TemplatesPage() {
  const { supabase, workspace } = await requireApp("contracts");
  const { data, error } = await supabase
    .from("contract_templates")
    .select("id, name, created_at")
    .eq("workspace_id", workspace.id)
    .order("name");
  if (error) throw error;

  if (data.length === 0)
    return (
      <EmptyState
        icon={<FileText size={18} />}
        title="No templates yet"
        body="Write an agreement once and send it to as many clients as you need."
        action={<NewTemplateDialog />}
      />
    );

  return (
    <>
      <div className="flex justify-end px-5 py-3">
        <NewTemplateDialog />
      </div>
      <Table columns={["Template", "Created"]}>
        {data.map((t) => (
          <Row key={t.id} href={`/contracts/templates/${t.id}`}>
            <Cell className="font-medium text-ink">{t.name}</Cell>
            <Cell>{formatDate(t.created_at)}</Cell>
          </Row>
        ))}
      </Table>
    </>
  );
}
