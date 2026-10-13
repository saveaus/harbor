import { Alert, Badge, Button, Cell, Row, Table } from "@/components/ui";
import { RelativeTime } from "@/components/relative-time";
import { appUrl } from "@/lib/stripe";
import { getWorkspace } from "@/lib/workspace";
import { revokeApiKey } from "../actions";
import { SettingsSection, SettingsTitle } from "../settings-page";
import { CreateKeyForm } from "./create-key-form";

export default async function ApiSettingsPage() {
  const { supabase, workspace, member } = await getWorkspace();
  if (member.role === "member")
    return (
      <>
        <SettingsTitle title="API" />
        <Alert>Only workspace owners and admins can manage API keys.</Alert>
      </>
    );

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at, revoked_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <SettingsTitle title="API">Read your workspace data from your own tools and scripts.</SettingsTitle>

      <SettingsSection title="API keys" description="Keys have read access to every client in this workspace. Keep them secret.">
        <CreateKeyForm />
        {keys.length > 0 ? (
          <div className="mt-5">
            <Table columns={["Name", "Key", "Last used", ""]}>
              {keys.map((key) => (
                <Row key={key.id}>
                  <Cell>
                    <span className="flex items-center gap-2">
                      {key.name}
                      {key.revoked_at ? <Badge>Revoked</Badge> : null}
                    </span>
                  </Cell>
                  <Cell className="font-mono text-[12px] text-ink-3">{key.prefix}…</Cell>
                  <Cell className="text-ink-3">{key.last_used_at ? <RelativeTime value={key.last_used_at} /> : "Never"}</Cell>
                  <Cell className="w-20 text-right">
                    {key.revoked_at ? null : (
                      <form action={revokeApiKey.bind(null, key.id)}>
                        <Button type="submit" variant="danger">
                          Revoke
                        </Button>
                      </form>
                    )}
                  </Cell>
                </Row>
              ))}
            </Table>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Endpoints">
        <div className="space-y-3 text-[13px] text-ink-2">
          <p>
            <code className="font-mono text-[12px]">GET /api/v1/contacts</code> lists contacts, 100 per page. Pass{" "}
            <code className="font-mono text-[12px]">?after=&lt;id&gt;</code> with the last id to get the next page.
          </p>
          <pre className="overflow-x-auto rounded-card border border-line bg-surface p-3 font-mono text-[12px] text-ink">
            {`curl ${appUrl()}/api/v1/contacts \\\n  -H "Authorization: Bearer hk_..."`}
          </pre>
        </div>
      </SettingsSection>
    </>
  );
}
