"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/form-data";

export async function signIn(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(form, "email"),
    password: text(form, "password"),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function signUp(form: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: text(form, "email"),
    password: text(form, "password"),
  });
  if (error) redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}`);
  if (!data.session)
    redirect("/login?notice=Check%20your%20inbox%20to%20confirm%20your%20email%2C%20then%20sign%20in.");
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createWorkspace(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: text(form, "workspace"),
    member_name: text(form, "name"),
  });
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect("/home");
}
