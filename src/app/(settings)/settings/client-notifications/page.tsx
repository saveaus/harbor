import { emailConfigured } from "@/lib/email";
import { getWorkspace } from "@/lib/workspace";
import { updateContactNotifications } from "../actions";
import { SaveBar, SettingsNotice, SettingsSection, SettingsTitle, SwitchRow, type SettingsSearchParams } from "../settings-page";

export default async function ContactNotificationsPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const { workspace, member } = await getWorkspace();
  const locked = member.role === "member";
  return (
    <>
      <SettingsTitle title="Client notifications">
        Emails your clients receive when something needs their attention. They are sent from {workspace.name} with your brand
        color, and link to the client portal.
      </SettingsTitle>
      <SettingsNotice searchParams={searchParams} />
      <form action={updateContactNotifications}>
        <SettingsSection
          title="Email clients when"
          description={emailConfigured() ? undefined : "Email delivery isn't connected yet, so these take effect once it is."}
        >
          <div className="divide-y divide-line">
            <SwitchRow name="contact_email_messages" label="You send them a message" defaultChecked={workspace.contact_email_messages} disabled={locked} />
            <SwitchRow name="contact_email_invoices" label="You send them an invoice" defaultChecked={workspace.contact_email_invoices} disabled={locked} />
            <SwitchRow name="contact_email_contracts" label="A contract is ready to sign" defaultChecked={workspace.contact_email_contracts} disabled={locked} />
            <SwitchRow name="contact_email_forms" label="You request a form" defaultChecked={workspace.contact_email_forms} disabled={locked} />
          </div>
          <p className="mt-3 text-[13px] text-ink-3">Clients who haven&apos;t been invited to the portal aren&apos;t emailed.</p>
        </SettingsSection>
        {locked ? null : <SaveBar />}
      </form>
    </>
  );
}
