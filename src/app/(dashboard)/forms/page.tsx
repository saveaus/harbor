import { ClipboardList, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Cell, EmptyState, Field, Input, Row, Table, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { createForm } from "./actions";

function NewFormDialog() {
  return (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New form
        </>
      }
      title="New form"
      action={createForm}
      submitLabel="Create and add questions"
    >
      <Field label="Name">
        <Input name="name" required maxLength={120} placeholder="Client intake" />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} placeholder="What should clients know before they start?" />
      </Field>
    </FormDialog>
  );
}

export default async function FormsPage() {
  const { supabase, workspace } = await requireApp("forms");
  const { data, error } = await supabase
    .from("forms")
    .select("id, name, created_at, form_requests(status)")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  if (data.length === 0)
    return (
      <EmptyState
        icon={<ClipboardList size={18} />}
        title="Collect information from clients"
        body="Build intake questionnaires and checklists, then request them from the clients who need to fill them in."
        action={<NewFormDialog />}
      />
    );

  return (
    <>
      <div className="flex justify-end px-5 py-3">
        <NewFormDialog />
      </div>
      <Table columns={["Form", "Pending", "Completed", "Created"]}>
        {data.map((f) => (
          <Row key={f.id} href={`/forms/${f.id}`}>
            <Cell className="font-medium text-ink">{f.name}</Cell>
            <Cell className="tabular-nums">{f.form_requests.filter((r) => r.status === "pending").length}</Cell>
            <Cell className="tabular-nums">{f.form_requests.filter((r) => r.status === "completed").length}</Cell>
            <Cell>{formatDate(f.created_at)}</Cell>
          </Row>
        ))}
      </Table>
    </>
  );
}
