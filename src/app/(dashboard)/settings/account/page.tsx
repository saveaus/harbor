import { Button, Field, Input, SectionTitle } from "@/components/ui";
import { getWorkspace } from "@/lib/workspace";
import { updateProfile } from "../actions";

export default async function AccountSettingsPage() {
  const { member } = await getWorkspace();
  return (
    <form action={updateProfile} className="space-y-6">
      <SectionTitle title="Your account" description="How you appear to teammates and clients." />
      <Field label="Display name">
        <Input name="display_name" defaultValue={member.display_name} maxLength={80} required />
      </Field>
      <Field label="Email" hint="Email changes aren't supported yet.">
        <Input defaultValue={member.email} disabled />
      </Field>
      <div className="flex justify-end border-t border-line pt-5">
        <Button type="submit" variant="primary">
          Save changes
        </Button>
      </div>
    </form>
  );
}
