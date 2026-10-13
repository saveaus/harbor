import { ClipboardList } from "lucide-react";
import { Alert, Badge, Cell, EmptyState, PageHeader, Row, Table } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requirePortalApp } from "@/lib/portal";

export default async function PortalFormsPage({ searchParams }: { searchParams: Promise<{ submitted?: string; error?: string }> }) {
  const [{ submitted, error: notice }, { supabase, workspace }] = await Promise.all([searchParams, requirePortalApp("forms")]);
  const { data: requests, error } = await supabase
    .from("form_requests")
    .select("id, status, sent_at, completed_at, form:forms(name)").eq("workspace_id", workspace.id)
    .order("sent_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <PageHeader title="Forms" />
      <div className="flex-1 overflow-y-auto">
        {submitted || notice ? (
          <div className="px-5 pt-4">
            {notice ? <Alert>{notice}</Alert> : <Alert tone="success">Thanks, your answers were sent.</Alert>}
          </div>
        ) : null}
        {requests.length === 0 ? (
          <EmptyState icon={<ClipboardList size={18} />} title="No forms" body="Questionnaires sent to you will appear here." />
        ) : (
          <Table columns={["Form", "Status", "Sent", "Completed"]}>
            {requests.map((request) => (
              <Row key={request.id} href={request.status === "pending" ? `/portal/forms/${request.id}` : undefined}>
                <Cell className="font-medium text-ink">{request.form?.name ?? "Form"}</Cell>
                <Cell>
                  {request.status === "pending" ? <Badge tone="warning">To complete</Badge> : <Badge tone="success">Completed</Badge>}
                </Cell>
                <Cell>{formatDate(request.sent_at)}</Cell>
                <Cell>{formatDate(request.completed_at)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
