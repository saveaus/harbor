import { Field, Input } from "@/components/ui";
import { getWorkspace } from "@/lib/workspace";
import { updateProfile } from "../actions";
import { SaveBar, SettingsSection, SettingsTitle } from "../settings-page";

export default async function AccountSettingsPage() {
  const { member } = await getWorkspace();
  return (
    <>
      <SettingsTitle title="Account" />
      <form action={updateProfile}>
        <SettingsSection title="Profile" description="How you appear to teammates and clients.">
          <div className="space-y-4">
            <Field label="Display name">
              <Input name="display_name" defaultValue={member.display_name} maxLength={80} required />
            </Field>
            <Field label="Email" hint="Email changes aren't supported yet.">
              <Input defaultValue={member.email} disabled />
            </Field>
          </div>
        </SettingsSection>
        <SaveBar />
      </form>
    </>
  );
}
