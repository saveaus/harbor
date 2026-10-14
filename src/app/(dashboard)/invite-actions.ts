"use server";

import { revalidatePath } from "next/cache";
import { text } from "@/lib/form-data";
import { createInvite } from "@/lib/invites";
import { getWorkspace } from "@/lib/workspace";

export type InviteResult = { token: string } | { error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteTeammate(form: FormData): Promise<InviteResult> {
  const ctx = await getWorkspace();
  const { supabase, workspace, member } = ctx;
  if (member.role === "member") return { error: "Only owners and admins can invite staff." };

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
  if (existing.count) return { error: `${email} already has workspace access.` };

  const revoked = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("kind", "team")
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (revoked.error) throw revoked.error;

  const staff = await supabase
    .from("staff")
    .upsert({ workspace_id: workspace.id, email }, { onConflict: "workspace_id,email", ignoreDuplicates: true });
  if (staff.error) throw staff.error;

  const token = await createInvite(ctx, { kind: "team", email, role });
  revalidatePath("/staff", "layout");
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
  revalidatePath("/staff", "layout");
  revalidatePath("/clients", "layout");
}
