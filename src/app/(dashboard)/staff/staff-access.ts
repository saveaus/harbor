import type { ChipTone } from "@/lib/care";
import type { Enums } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";

const ROLE_LABELS: Record<Enums<"member_role">, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

type PendingInvite = {
  id: string;
  role: Enums<"member_role">;
  expires_at: string;
};

export type StaffAccess = { kind: "member"; role: Enums<"member_role"> } | { kind: "invited"; invite: PendingInvite } | { kind: "none" };

export type AccessDirectory = {
  roles: Map<string, Enums<"member_role">>;
  invites: Map<string, PendingInvite>;
};

export async function loadAccessDirectory({ supabase, workspace }: WorkspaceContext): Promise<AccessDirectory> {
  const [members, invites] = await Promise.all([
    supabase.from("workspace_members").select("user_id, role").eq("workspace_id", workspace.id),
    supabase
      .from("invites")
      .select("id, email, role, expires_at")
      .eq("workspace_id", workspace.id)
      .eq("kind", "team")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at"),
  ]);
  if (members.error) throw members.error;
  if (invites.error) throw invites.error;
  return {
    roles: new Map(members.data.map((m) => [m.user_id, m.role])),
    // Later links replace earlier ones for the same email.
    invites: new Map(invites.data.map(({ email, ...invite }) => [email.toLowerCase(), invite])),
  };
}

export function staffAccess(staff: { user_id: string | null; email: string }, directory: AccessDirectory): StaffAccess {
  const role = staff.user_id ? directory.roles.get(staff.user_id) : undefined;
  if (role) return { kind: "member", role };
  const invite = directory.invites.get(staff.email.toLowerCase());
  return invite ? { kind: "invited", invite } : { kind: "none" };
}

export function accessLabel(access: StaffAccess): {
  label: string;
  tone: ChipTone;
} {
  switch (access.kind) {
    case "member":
      return {
        label: ROLE_LABELS[access.role],
        tone: access.role === "member" ? "grey" : "blue",
      };
    case "invited":
      return new Date(access.invite.expires_at) < new Date()
        ? { label: "Invite expired", tone: "red" }
        : { label: "Invited", tone: "amber" };
    case "none":
      return { label: "No access", tone: "grey" };
    default: {
      const unreachable: never = access;
      return unreachable;
    }
  }
}
