import { Field, Textarea } from "@/components/ui";
import { getWorkspace } from "@/lib/workspace";
import { updateAssistantSettings } from "../actions";
import { SaveBar, SettingsNotice, SettingsSection, SettingsTitle, SwitchRow, type SettingsSearchParams } from "../settings-page";

export default async function AssistantSettingsPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const { workspace, member } = await getWorkspace();
  const locked = member.role === "member";
  const aiConfigured = Boolean(process.env.AI_GATEWAY_API_KEY);
  return (
    <>
      <SettingsTitle title="Assistant">
        The assistant answers questions about your clients, staff, files, credentials, invoices, contracts and messages, and
        drafts replies. It only reads data staff can already see.
      </SettingsTitle>
      <SettingsNotice searchParams={searchParams} />
      <form action={updateAssistantSettings}>
        <SettingsSection
          title="Availability"
          description={aiConfigured ? undefined : "AI isn't connected for this deployment yet, so the assistant stays hidden."}
        >
          <SwitchRow
            name="assistant_enabled"
            label="Turn on the assistant"
            description="Shows the assistant to all staff."
            defaultChecked={workspace.assistant_enabled}
            disabled={locked}
          />
        </SettingsSection>
        <SettingsSection title="Instructions" description="Tell the assistant about your business, tone of voice, or anything it should always keep in mind.">
          <Field label="Custom instructions" note="optional">
            <Textarea
              name="assistant_instructions"
              rows={6}
              maxLength={2000}
              defaultValue={workspace.assistant_instructions}
              placeholder="We're a bookkeeping firm. Keep replies short and friendly, and sign off with your first name."
              disabled={locked}
            />
          </Field>
        </SettingsSection>
        {locked ? null : <SaveBar />}
      </form>
    </>
  );
}
