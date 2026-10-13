import { Button, Card, Field, Input } from "@/components/ui";
import { getWorkspace } from "@/lib/workspace";
import { deleteWorkspace } from "../actions";
import { SettingsNotice, SettingsTitle, type SettingsSearchParams } from "../settings-page";

export default async function DangerZonePage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const { workspace, member } = await getWorkspace();
  const owner = member.role === "owner";
  return (
    <>
      <SettingsTitle title="Danger zone" />
      <SettingsNotice searchParams={searchParams} />
      <Card className="border-danger/40 p-5">
        <h2 className="text-[14px] font-medium text-ink">Delete workspace</h2>
        <p className="mt-1 text-[13px] text-ink-3">
          Permanently deletes {workspace.name}, including every client, message, file, invoice, contract and app. Clients lose
          portal access immediately. This can&apos;t be undone.
        </p>
        {owner ? (
          <form action={deleteWorkspace} className="mt-5 space-y-3">
            <Field label={`Type ${workspace.name} to confirm`}>
              <Input name="confirm" autoComplete="off" required className="max-w-80" />
            </Field>
            <Button type="submit" variant="danger">
              Delete workspace
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-[13px] text-ink-3">Only the workspace owner can delete it.</p>
        )}
      </Card>
    </>
  );
}
