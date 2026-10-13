import { createHash, randomBytes } from "node:crypto";
import type { Database } from "@/lib/supabase/database.types";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/lib/workspace";

const INVITE_KINDS = ["client", "team"] as const;
const INVITE_STATES = ["valid", "revoked", "accepted", "expired"] as const;

export type InviteKind = (typeof INVITE_KINDS)[number];

export type InvitePreview = {
  workspaceName: string;
  brandColor: string;
  logoPath: string | null;
  email: string;
  kind: InviteKind;
  state: (typeof INVITE_STATES)[number];
};

function member<T extends string>(values: readonly T[], value: string): T | undefined {
  return (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseInviteKind(value: string): InviteKind | undefined {
  return member(INVITE_KINDS, value);
}

/** Returns null when no invite matches the token. */
export async function getInvitePreview(supabase: ServerSupabase, token: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase.rpc("invite_preview", { token });
  if (error) throw error;
  const row = data[0];
  if (!row) return null;
  const kind = parseInviteKind(row.kind);
  const state = member(INVITE_STATES, row.state);
  if (!kind || !state) throw new Error(`Unrecognised invite ${row.kind}/${row.state}`);
  return {
    workspaceName: row.workspace_name,
    brandColor: row.brand_color,
    logoPath: row.logo_path || null,
    email: row.email,
    kind,
    state,
  };
}

type InviteDraft =
  | { kind: "client"; email: string; contactId: string }
  | { kind: "team"; email: string; role: Exclude<Database["public"]["Enums"]["member_role"], "owner"> };

/** The database stores only the SHA-256 of the token; the raw token is shown once. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createInvite({ supabase, workspace, userId }: WorkspaceContext, draft: InviteDraft): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const { error } = await supabase.from("invites").insert({
    workspace_id: workspace.id,
    kind: draft.kind,
    email: draft.email.toLowerCase(),
    contact_id: draft.kind === "client" ? draft.contactId : null,
    role: draft.kind === "team" ? draft.role : "member",
    token_hash: hashInviteToken(token),
    created_by: userId,
  });
  if (error) throw error;
  return token;
}
