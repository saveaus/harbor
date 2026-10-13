"use server";

import { revalidatePath } from "next/cache";
import { text } from "@/lib/form-data";
import { createInvite } from "@/lib/invites";
import { getWorkspace } from "@/lib/workspace";

export type InviteResult = { token: string } | { error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Creating a new link replaces any earlier pending link for the same person. */
export async function inviteContact(contactId: string): Promise<InviteResult> {
  const ctx = await getWorkspace();
  const { supabase, workspace } = ctx;
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("id, email, status, user_id")
    .eq("workspace_id", workspace.id)
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw error;
  if (!contact) return { error: "This contact no longer exists." };
  if (contact.user_id) return { error: "This contact already has portal access." };

  const revoked = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("contact_id", contact.id)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (revoked.error) throw revoked.error;

  const token = await createInvite(ctx, { kind: "client", email: contact.email, contactId: contact.id });
  if (contact.status === "not_invited") {
    const updated = await supabase.from("contacts").update({ status: "invited" }).eq("id", contact.id);
    if (updated.error) throw updated.error;
  }
  revalidatePath("/crm", "layout");
  return { token };
}

export async function inviteTeammate(form: FormData): Promise<InviteResult> {
  const ctx = await getWorkspace();
  const { supabase, workspace, member } = ctx;
  if (member.role === "member") return { error: "Only owners and admins can invite teammates." };

  const email = text(form, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };
  const role = text(form, "role");
  if (role !== "admin" && role !== "member") return { error: "Choose a role." };

  const existing = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("email", email);
  if (existing.error) throw existing.error;
  if (existing.count) return { error: `${email} is already on the team.` };

  const revoked = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("kind", "team")
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (revoked.error) throw revoked.error;

  const token = await createInvite(ctx, { kind: "team", email, role });
  revalidatePath("/team");
  return { token };
}

export async function revokeInvite(inviteId: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", inviteId)
    .is("accepted_at", null);
  if (error) throw error;
  revalidatePath("/team");
  revalidatePath("/crm", "layout");
}
