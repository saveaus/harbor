import { BookOpen, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Badge, Cell, EmptyState, Field, Input, Row, Table } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { createArticle } from "./actions";

function NewArticleDialog() {
  return (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New article
        </>
      }
      title="New article"
      action={createArticle}
      submitLabel="Create and edit"
    >
      <Field label="Title">
        <Input name="title" required maxLength={200} placeholder="How to upload documents" />
      </Field>
    </FormDialog>
  );
}

export default async function HelpdeskPage() {
  const { supabase, workspace } = await requireApp("helpdesk");
  const { data, error } = await supabase
    .from("help_articles")
    .select("id, title, published, updated_at")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  if (data.length === 0)
    return (
      <EmptyState
        icon={<BookOpen size={18} />}
        title="Answer questions before they're asked"
        body="Write guides and FAQs once. Published articles appear in every client's portal."
        action={<NewArticleDialog />}
      />
    );

  return (
    <>
      <div className="flex justify-end px-5 py-3">
        <NewArticleDialog />
      </div>
      <Table columns={["Article", "Status", "Updated"]}>
        {data.map((a) => (
          <Row key={a.id} href={`/helpdesk/${a.id}`}>
            <Cell className="font-medium text-ink">{a.title}</Cell>
            <Cell>
              <Badge tone={a.published ? "success" : "neutral"}>{a.published ? "Published" : "Draft"}</Badge>
            </Cell>
            <Cell>{formatDate(a.updated_at)}</Cell>
          </Row>
        ))}
      </Table>
    </>
  );
}
