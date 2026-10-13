"use server";

import { redirect } from "next/navigation";
import { text } from "@/lib/form-data";
import { getInvitePreview, parseInviteKind } from "@/lib/invites";
import { appUrl } from "@/lib/stripe";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";

function back(token: string, message: string, mode?: "signin"): never {
  const params = new URLSearchParams({ error: message });
  if (mode) params.set("mode", mode);
  redirect(`/invite/${encodeURIComponent(token)}?${params}`);
}

async function accept(supabase: ServerSupabase, token: string): Promise<never> {
  const { data, error } = await supabase.rpc("accept_invite", { token });
  if (error) back(token, error.message);
  const kind = parseInviteKind(data);
  if (!kind) throw new Error(`Unrecognised invite kind ${data}`);
  switch (kind) {
    case "client":
      redirect("/portal");
    case "team":
      redirect("/home");
    default: {
      const unhandled: never = kind;
      throw new Error(`Unhandled invite kind ${String(unhandled)}`);
    }
  }
}

async function validInvite(supabase: ServerSupabase, token: string) {
  const preview = await getInvitePreview(supabase, token);
  if (preview?.state !== "valid") back(token, "This invite link can no longer be used.");
  return preview;
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  await validInvite(supabase, token);
  await accept(supabase, token);
}

export async function createAccountAndAccept(token: string, form: FormData) {
  const supabase = await createClient();
  const invite = await validInvite(supabase, token);
  const password = text(form, "password");
  if (password.length < 8) back(token, "Use at least 8 characters for your password.");

  const response = await fetch(`${supabaseUrl}/functions/v1/create-invited-account`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: supabaseKey },
    body: JSON.stringify({ token, password }),
  });
  if (response.status === 409) back(token, "You already have an account. Sign in to accept the invite.", "signin");
  if (!response.ok) back(token, "We couldn't create your account. Ask for a new invite link.");

  const { error } = await supabase.auth.signInWithPassword({ email: invite.email, password });
  if (error) back(token, error.message, "signin");
  await accept(supabase, token);
}

export async function signInAndAccept(token: string, form: FormData) {
  const supabase = await createClient();
  const invite = await validInvite(supabase, token);
  const { error } = await supabase.auth.signInWithPassword({ email: invite.email, password: text(form, "password") });
  if (error) back(token, error.message, "signin");
  await accept(supabase, token);
}

export async function emailSignInLink(token: string) {
  const supabase = await createClient();
  const invite = await validInvite(supabase, token);
  if (!invite.linkSignIn) back(token, "Sign-in links aren't available for this invite. Use a password instead.");
  const next = `/invite/${encodeURIComponent(token)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: invite.email,
    options: { shouldCreateUser: true, emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) back(token, error.message);
  redirect(`${next}?sent=1`);
}

export async function signOutForInvite(token: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/invite/${encodeURIComponent(token)}`);
}
