import { emailConfigured } from "@/lib/email";
import { getWorkspace } from "@/lib/workspace";
import { updateNotificationPreferences } from "../actions";
import { SaveBar, SettingsNotice, SettingsSection, SettingsTitle, SwitchRow, type SettingsSearchParams } from "../settings-page";

export default async function NotificationSettingsPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const { supabase, workspace, userId, member } = await getWorkspace();
  const { data: prefs, error } = await supabase
    .from("workspace_members")
    .select("email_messages, email_payments, email_documents")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .single();
  if (error) throw error;

  return (
    <>
      <SettingsTitle title="Notifications">
        Choose which updates are emailed to {member.email}. Everything still appears in your in-app notifications.
      </SettingsTitle>
      <SettingsNotice searchParams={searchParams} />
      <form action={updateNotificationPreferences}>
        <SettingsSection
          title="Email"
          description={emailConfigured() ? undefined : "Email delivery isn't connected yet, so these take effect once it is."}
        >
          <div className="divide-y divide-line">
            <SwitchRow name="email_messages" label="Client messages" description="When a client sends a message." defaultChecked={prefs.email_messages} />
            <SwitchRow
              name="email_payments"
              label="Payments"
              description="When an invoice is paid or someone buys from your store or a payment link."
              defaultChecked={prefs.email_payments}
            />
            <SwitchRow
              name="email_documents"
              label="Contracts and forms"
              description="When a client signs a contract or submits a form."
              defaultChecked={prefs.email_documents}
            />
          </div>
        </SettingsSection>
        <SaveBar />
      </form>
    </>
  );
}
