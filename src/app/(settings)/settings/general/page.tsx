import { Field, Input, Textarea } from "@/components/ui";
import { getWorkspace } from "@/lib/workspace";
import { updateWorkspace } from "../actions";
import { SaveBar, SettingsSection, SettingsTitle, SwitchRow } from "../settings-page";

export default async function GeneralSettingsPage() {
  const { workspace } = await getWorkspace();
  return (
    <>
      <SettingsTitle title="General" />
      <form action={updateWorkspace}>
        <SettingsSection title="Business details" description="Used on invoices and contracts. Your client-facing name is set on the Brand page.">
          <div className="space-y-4">
            <Field label="Legal name">
              <Input name="legal_name" defaultValue={workspace.legal_name} maxLength={50} />
            </Field>
            <Field label="Country">
              <Input name="country" defaultValue={workspace.country} maxLength={60} placeholder="Australia" />
            </Field>
          </div>
        </SettingsSection>
        <SettingsSection title="Client organisation">
          <SwitchRow
            name="companies_enabled"
            label="Group clients into companies"
            description="Clients in the same company share one conversation and one file space."
            defaultChecked={workspace.companies_enabled}
          />
        </SettingsSection>
        <SettingsSection title="Welcome message" description="Shown to a client the first time they open a conversation.">
          <Textarea name="welcome_message" rows={3} defaultValue={workspace.welcome_message} maxLength={1000} />
        </SettingsSection>
        <SaveBar />
      </form>
    </>
  );
}
