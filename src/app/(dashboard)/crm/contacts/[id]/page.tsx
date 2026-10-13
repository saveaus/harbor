import Link from "next/link";
import { notFound } from "next/navigation";
import { MoreHorizontal, Send } from "lucide-react";
import { InviteDialog } from "@/components/invite-dialog";
import { Menu } from "@/components/menu";
import { Avatar, Badge, Button, Select } from "@/components/ui";
import { contactName, formatDate } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { inviteContact, revokeInvite } from "../../../invite-actions";
import { deleteContact, removeContactFromCompany, setContactCompany } from "../../actions";
import { CustomFieldsSection } from "../../custom-fields-section";
import { InlineForm, PanelSection } from "../../record-panel";
import { RecordView, parseRecordView } from "../../record-view";
import { contactStatus } from "../../status";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; panel?: string }>;
}) {
  const [{ id }, view] = await Promise.all([params, searchParams.then(parseRecordView)]);
  const ctx = await getWorkspace();
  const { supabase, workspace } = ctx;
  const [contactResult, companiesResult, inviteResult] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, company:companies(id, name, channels(id, kind, title)), channels(id, kind, title)")
      .eq("workspace_id", workspace.id)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("companies").select("id, name").eq("workspace_id", workspace.id).order("name"),
    supabase
      .from("invites")
      .select("id, created_at, expires_at")
      .eq("workspace_id", workspace.id)
      .eq("contact_id", id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (contactResult.error) throw contactResult.error;
  if (companiesResult.error) throw companiesResult.error;
  if (inviteResult.error) throw inviteResult.error;
  const contact = contactResult.data;
  if (!contact) notFound();
  const pendingInvite = inviteResult.data;

  const name = contactName(contact);
  const record = { kind: "contact", id: contact.id } as const;
  const status = contactStatus[contact.status];
  const path = `/crm/contacts/${contact.id}`;

  return (
    <RecordView
      ctx={ctx}
      record={record}
      path={path}
      crumb={{ label: "Contacts", href: "/crm" }}
      name={name}
      view={view}
      channels={contact.company ? contact.company.channels : contact.channels}
      welcomePending={contact.status !== "active"}
      panelTitle="Contact Details"
      menu={[
        ...(contact.company ? [{ label: "Open company", href: `/crm/companies/${contact.company.id}` }] : []),
        { label: "Delete contact", action: deleteContact.bind(null, contact.id), danger: true },
      ]}
      details={
        <div className="divide-y divide-line">
          <section className="space-y-2 px-4 py-4 text-[13px]">
            <div className="flex items-center gap-2.5">
              <Avatar name={name} />
              <div className="min-w-0">
                <div className="truncate font-medium">{name}</div>
                <div className="truncate text-ink-3">{contact.email}</div>
              </div>
            </div>
            <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 pt-2">
              <dt className="text-ink-3">Status</dt>
              <dd>
                <Badge tone={status.tone}>{status.label}</Badge>
              </dd>
              <dt className="text-ink-3">Created</dt>
              <dd>{formatDate(contact.created_at)}</dd>
            </dl>
            {contact.user_id ? null : (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <InviteDialog
                  triggerVariant="secondary"
                  trigger={
                    <>
                      <Send /> {pendingInvite ? "New invite link" : "Invite to portal"}
                    </>
                  }
                  title={`Invite ${name} to the portal`}
                  description="Create a private link that lets them set a password and sign in."
                  create={inviteContact.bind(null, contact.id)}
                  submitLabel="Create link"
                >
                  <p className="text-[13px] text-ink">
                    The link only works for <span className="font-medium">{contact.email}</span>
                    {pendingInvite ? " and replaces the link you created earlier." : "."}
                  </p>
                </InviteDialog>
                {pendingInvite ? (
                  <>
                    <span className="text-[12px] text-ink-3">
                      Link {new Date(pendingInvite.expires_at) < new Date() ? "expired" : `expires ${formatDate(pendingInvite.expires_at)}`}
                    </span>
                    <form action={revokeInvite.bind(null, pendingInvite.id)}>
                      <button type="submit" className="text-[12px] text-danger hover:underline">
                        Revoke
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            )}
          </section>

          <PanelSection
            title="Company"
            addForm={
              <InlineForm action={setContactCompany.bind(null, contact.id)}>
                <Select name="company_id" defaultValue={contact.company?.id ?? ""} aria-label="Company">
                  <option value="">No company</option>
                  {companiesResult.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="primary">
                  Save
                </Button>
              </InlineForm>
            }
          >
            {contact.company ? (
              <div className="flex items-center gap-2.5 text-[13px]">
                <Avatar name={contact.company.name} size="sm" square />
                <Link href={`/crm/companies/${contact.company.id}`} className="flex-1 truncate hover:underline">
                  {contact.company.name}
                </Link>
                <Menu
                  label={`Actions for ${contact.company.name}`}
                  triggerClassName="inline-flex size-6 items-center justify-center rounded-control hover:bg-hover"
                  trigger={<MoreHorizontal size={15} />}
                  items={[
                    { label: "Open company", href: `/crm/companies/${contact.company.id}` },
                    { label: "Remove from company", action: removeContactFromCompany.bind(null, contact.id), danger: true },
                  ]}
                />
              </div>
            ) : (
              <p className="text-[13px] text-ink-3">Not part of a company.</p>
            )}
          </PanelSection>

          <CustomFieldsSection ctx={ctx} record={record} />
        </div>
      }
    />
  );
}
