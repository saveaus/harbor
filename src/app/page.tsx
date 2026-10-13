import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function Root() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}

async function Landing(): Promise<null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [memberships, clientOf] = await Promise.all([
    supabase.from("workspace_members").select("workspace_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  if (memberships.error) throw memberships.error;
  if (clientOf.error) throw clientOf.error;

  if (memberships.count) redirect("/home");
  if (clientOf.count) redirect("/portal");
  redirect("/onboarding");
}
