import { Users } from "lucide-react";
import { ButtonLink, Cell, EmptyState, Row, Table } from "@/components/ui";
import { CLIENT_CONTACT_KIND } from "@/lib/care";
import { personName } from "@/lib/format";
import { requireApp } from "@/lib/workspace";

export default async function RecipientsPage() {
  const { supabase, workspace } = await requireApp("finance");
  const { data, error } = await supabase
    .from("client_contacts")
    .select("id, name, kind, email, phone, address, contact_id, contact:contacts(first_name, last_name, email)")
    .eq("workspace_id", workspace.id)
    .order("name");
  if (error) throw error;

  return (
    <>
      <div className="px-9 pt-5 pb-3">
        <h1 className="text-[16px] font-medium">Recipients</h1>
        <p className="mt-1 text-[13px] text-ink-3">People and organisations invoices and rosters can be sent to, besides the participant.</p>
      </div>
      {data.length === 0 ? (
        <EmptyState
          icon={<Users size={18} />}
          title="No recipients yet"
          body="Add a plan manager, family contact, or other recipient on the participant's record. Invoices use the plan manager when one is set."
          action={
            <ButtonLink href="/clients">Go to Clients</ButtonLink>
          }
        />
      ) : (
        <Table columns={["Name", "Participant", "Type", "Email", "Phone", "Address"]}>
          {data.map((row) => (
            <Row key={row.id} href={`/clients/${row.contact_id}`}>
              <Cell className="font-medium">{row.name}</Cell>
              <Cell>{row.contact ? personName(row.contact) : "Participant"}</Cell>
              <Cell>{CLIENT_CONTACT_KIND[row.kind]}</Cell>
              <Cell className="text-ink-3">{row.email || "—"}</Cell>
              <Cell className="text-ink-3">{row.phone || "—"}</Cell>
              <Cell className="text-ink-3">{row.address || "—"}</Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}
