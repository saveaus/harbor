import { Boxes, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Cell, EmptyState, Field, Input, PageHeader, Row, Table } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { createCustomApp } from "./actions";

export default async function CustomAppsPage() {
  const { supabase, workspace } = await getWorkspace();
  const { data: apps, error } = await supabase
    .from("custom_apps")
    .select("id, name, description, permissions, updated_at")
    .eq("workspace_id", workspace.id)
    .order("name");
  if (error) throw error;

  const create = (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New custom app
        </>
      }
      title="New custom app"
      description="Starts with an example you can edit."
      action={createCustomApp}
      submitLabel="Create app"
    >
      <Field label="Name">
        <Input name="name" required maxLength={60} placeholder="Client checklist" />
      </Field>
      <Field label="Description">
        <Input name="description" maxLength={280} />
      </Field>
    </FormDialog>
  );

  return (
    <>
      <PageHeader title="Custom apps" actions={apps.length ? create : null} />
      <div className="flex-1 overflow-y-auto">
        {apps.length === 0 ? (
          <EmptyState
            icon={<Boxes size={18} />}
            title="Build your own tools"
            body="Write a small HTML app that runs inside your workspace. It can't reach the internet or see anything you don't allow."
            action={create}
          />
        ) : (
          <Table columns={["Name", "Description", "Permissions", "Updated"]}>
            {apps.map((app) => (
              <Row key={app.id} href={`/apps/custom/${app.id}`}>
                <Cell className="font-medium text-ink">{app.name}</Cell>
                <Cell>
                  <span className="block max-w-80 truncate">{app.description || "—"}</span>
                </Cell>
                <Cell>{app.permissions.length ? app.permissions.join(", ") : "None"}</Cell>
                <Cell>{formatDate(app.updated_at)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
