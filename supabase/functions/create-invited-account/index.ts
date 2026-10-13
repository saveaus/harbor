// Creates a confirmed account for the address on a valid invite link.
// Holding the invite token is the only authorization, so the function never
// accepts an email address from the caller.
import { createClient } from "npm:@supabase/supabase-js@2";

type Failure = "bad_request" | "invite_invalid" | "account_exists" | "server_error";

function reply(status: number, body: { ok: true } | { error: Failure }) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, { error: "bad_request" });

  let token: unknown;
  let password: unknown;
  try {
    ({ token, password } = await req.json());
  } catch {
    return reply(400, { error: "bad_request" });
  }
  if (typeof token !== "string" || token.length < 32 || token.length > 128) return reply(400, { error: "bad_request" });
  if (typeof password !== "string" || password.length < 8 || password.length > 72) return reply(400, { error: "bad_request" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: invite, error: lookupError } = await admin
    .from("invites")
    .select("email, expires_at, accepted_at, revoked_at")
    .eq("token_hash", await sha256Hex(token))
    .maybeSingle();
  if (lookupError) return reply(500, { error: "server_error" });
  if (!invite || invite.accepted_at || invite.revoked_at || new Date(invite.expires_at) < new Date())
    return reply(410, { error: "invite_invalid" });

  const { error } = await admin.auth.admin.createUser({ email: invite.email, password, email_confirm: true });
  if (error) {
    if (error.code === "email_exists" || error.code === "user_already_exists") return reply(409, { error: "account_exists" });
    return reply(500, { error: "server_error" });
  }
  return reply(200, { ok: true });
});
