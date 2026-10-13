import { UserPlus } from "lucide-react";
import { InviteDialog } from "@/components/invite-dialog";
import { Badge, Cell, Field, Input, PageHeader, Person, Row, SectionTitle, Select, Table } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { inviteTeammate, revokeInvite } from "../invite-actions";

const roleLabels = { owner: "Owner", admin: "Admin", member: "Member" } as const;

export default async function TeamPage() {
  const { supabase, workspace, member } = await getWorkspace();
  const [members, invites] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, display_name, email, role, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at"),
    supabase
      .from("invites")
      .select("id, email, role, created_at, expires_at")
      .eq("workspace_id", workspace.id)
      .eq("kind", "team")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);
  if (members.error) throw members.error;
  if (invites.error) throw invites.error;
  const canInvite = member.role !== "member";
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Team"
        actions={
          canInvite ? (
            <InviteDialog
              trigger={
                <>
                  <UserPlus size={14} /> Invite teammate
                </>
              }
              title="Invite a teammate"
              description="Create a private link for one email address."
              create={inviteTeammate}
              submitLabel="Create link"
            >
              <Field label="Email">
                <Input name="email" type="email" required placeholder="sam@company.com" />
              </Field>
              <Field label="Role" hint="Admins can invite teammates, install apps and change settings.">
                <Select name="role" defaultValue="member">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
            </InviteDialog>
          ) : null
        }
      />
      <div className="flex-1 overflow-y-auto">
        <Table columns={["Name", "Role", "Joined", "Status"]}>
          {members.data.map((m) => (
            <Row key={m.user_id}>
              <Cell>
                <Person name={m.display_name || m.email} detail={m.display_name ? m.email : null} />
              </Cell>
              <Cell>{roleLabels[m.role]}</Cell>
              <Cell>{formatDate(m.created_at)}</Cell>
              <Cell>
                <Badge tone="success">Active</Badge>
              </Cell>
            </Row>
          ))}
        </Table>

        {invites.data.length ? (
          <div className="px-9 pt-8">
            <SectionTitle title="Pending invites" description="Links that haven't been used yet." />
            <div className="divide-y divide-line rounded-card border border-line">
              {invites.data.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <span className="flex-1 font-medium">{invite.email}</span>
                  <Badge>{roleLabels[invite.role]}</Badge>
                  <span className="w-40 text-ink-3">
                    {new Date(invite.expires_at) < now ? "Expired" : `Expires ${formatDate(invite.expires_at)}`}
                  </span>
                  {canInvite ? (
                    <form action={revokeInvite.bind(null, invite.id)}>
                      <button type="submit" className="text-[12px] font-medium text-danger hover:underline">
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
