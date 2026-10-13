import { FileSignature } from "lucide-react";
import { Badge, Cell, EmptyState, PageHeader, Row, Table } from "@/components/ui";
import { contractStatus } from "@/lib/contracts";
import { formatDate } from "@/lib/format";
import { requirePortalApp } from "@/lib/portal";

export default async function PortalContractsPage() {
  const { supabase, workspace } = await requirePortalApp("contracts");
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, name, status, sent_at, signed_at").eq("workspace_id", workspace.id)
    .order("sent_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <PageHeader title="Contracts" />
      <div className="flex-1 overflow-y-auto">
        {contracts.length === 0 ? (
          <EmptyState icon={<FileSignature size={18} />} title="No contracts" body="Agreements sent to you will appear here." />
        ) : (
          <Table columns={["Contract", "Status", "Sent", "Signed"]}>
            {contracts.map((contract) => {
              const status = contractStatus[contract.status];
              return (
                <Row key={contract.id} href={`/portal/contracts/${contract.id}`}>
                  <Cell className="font-medium text-ink">{contract.name}</Cell>
                  <Cell>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Cell>
                  <Cell>{formatDate(contract.sent_at)}</Cell>
                  <Cell>{formatDate(contract.signed_at)}</Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
