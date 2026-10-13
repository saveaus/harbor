import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Sparkles } from "lucide-react";
import { PageHeader, buttonClass } from "@/components/ui";
import { sandboxDocument } from "@/lib/custom-apps";
import { getWorkspace } from "@/lib/workspace";
import { callCustomApp } from "../actions";
import { AppFrame } from "./app-frame";

export default async function CustomAppPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, workspace }] = await Promise.all([params, getWorkspace()]);
  const { data: app, error } = await supabase
    .from("custom_apps")
    .select("id, name, code, updated_at")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!app) notFound();

  return (
    <>
      <PageHeader
        title={app.name}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/apps/custom/${app.id}/edit`} className={buttonClass("secondary")}>
              <Pencil size={14} /> Edit code
            </Link>
            <Link href={`/apps/custom/${app.id}/build`} className={buttonClass("primary")}>
              <Sparkles size={14} /> Edit with AI
            </Link>
          </div>
        }
      />
      <AppFrame key={app.updated_at} title={app.name} srcDoc={sandboxDocument(app.code)} call={callCustomApp.bind(null, app.id)} />
    </>
  );
}
