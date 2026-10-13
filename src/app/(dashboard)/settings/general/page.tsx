import { Button, Field, Input, SectionTitle, Textarea } from "@/components/ui";
import { getWorkspace } from "@/lib/workspace";
import { updateWorkspace } from "../actions";

export default async function GeneralSettingsPage() {
  const { workspace } = await getWorkspace();
  return (
    <form action={updateWorkspace} className="space-y-10">
      <section>
        <SectionTitle
          title="Business details"
          description="Used on invoices and contracts. Your client-facing name is set on the Brand page."
        />
        <div className="space-y-4">
          <Field label="Legal name">
            <Input name="legal_name" defaultValue={workspace.legal_name} maxLength={50} />
          </Field>
          <Field label="Country">
            <Input name="country" defaultValue={workspace.country} maxLength={60} placeholder="Australia" />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle title="Client organisation" />
        <label className="flex items-start gap-3 rounded-card border border-line p-4">
          <input
            type="checkbox"
            name="companies_enabled"
            defaultChecked={workspace.companies_enabled}
            className="mt-0.5 size-4 accent-[var(--color-accent)]"
          />
          <span>
            <span className="block text-[13px] font-medium">Group contacts into companies</span>
            <span className="block text-[12px] text-ink-3">
              Contacts in the same company share one conversation and one file space.
            </span>
          </span>
        </label>
      </section>

      <section>
        <SectionTitle title="Welcome message" description="Shown to a client the first time they open a conversation." />
        <Textarea name="welcome_message" rows={3} defaultValue={workspace.welcome_message} maxLength={1000} />
      </section>

      <div className="flex justify-end border-t border-line pt-5">
        <Button type="submit" variant="primary">
          Save changes
        </Button>
      </div>
    </form>
  );
}
