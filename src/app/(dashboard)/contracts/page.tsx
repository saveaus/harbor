import { FileSignature, Send } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Badge, ButtonLink, Cell, EmptyState, Field, Row, Select, Table } from "@/components/ui";
import { listClientOptions } from "@/lib/clients";
import { personName, formatDate } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { sendContract } from "./actions";
import { contractStatus } from "@/lib/contracts";

export default async function ContractsPage() {
  const ctx = await requireApp("contracts");
  const [contracts, templates, contacts] = await Promise.all([
    ctx.supabase
      .from("contracts")
      .select("id, name, status, sent_at, signed_at, contact:contacts(first_name, last_name, email)")
      .eq("workspace_id", ctx.workspace.id)
      .order("sent_at", { ascending: false }),
    ctx.supabase.from("contract_templates").select("id, name").eq("workspace_id", ctx.workspace.id).order("name"),
    listClientOptions(ctx),
  ]);
  if (contracts.error) throw contracts.error;
  if (templates.error) throw templates.error;

  const action =
    templates.data.length === 0 ? (
      <ButtonLink href="/contracts/templates" variant="primary">
        Create a template
      </ButtonLink>
    ) : (
      <FormDialog
        trigger={
          <>
            <Send size={14} /> Send contract
          </>
        }
        title="Send a contract"
        description="The client can review and sign it from their portal."
        action={sendContract}
        submitLabel="Send"
      >
        <Field label="Template">
          <Select name="template_id" required>
            {templates.data.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Recipient">
          <Select name="contact_id" required>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </FormDialog>
    );

  if (contracts.data.length === 0)
    return (
      <EmptyState
        icon={<FileSignature size={18} />}
        title="No contracts sent yet"
        body="Turn your standard agreements into templates, then send them to clients to sign."
        action={action}
      />
    );

  return (
    <>
      <div className="flex justify-end px-5 py-3">{action}</div>
      <Table columns={["Contract", "Recipient", "Status", "Sent", "Signed"]}>
        {contracts.data.map((c) => {
          const status = contractStatus[c.status];
          return (
            <Row key={c.id} href={`/contracts/${c.id}`}>
              <Cell className="font-medium text-ink">{c.name}</Cell>
              <Cell>{c.contact ? personName(c.contact) : "—"}</Cell>
              <Cell>
                <Badge tone={status.tone}>{status.label}</Badge>
              </Cell>
              <Cell>{formatDate(c.sent_at)}</Cell>
              <Cell>{formatDate(c.signed_at)}</Cell>
            </Row>
          );
        })}
      </Table>
    </>
  );
}
