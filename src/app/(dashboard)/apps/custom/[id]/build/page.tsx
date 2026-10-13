import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Code2, Sparkles } from "lucide-react";
import { AppPrompt } from "@/components/app-prompt";
import { PageHeader, buttonClass } from "@/components/ui";
import { sandboxDocument } from "@/lib/custom-apps";
import { getWorkspace } from "@/lib/workspace";
import { callCustomApp, reviseApp } from "../../actions";
import { AppFrame } from "../app-frame";

export default async function BuildCustomAppPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, workspace }] = await Promise.all([params, getWorkspace()]);
  const [app, messages] = await Promise.all([
    supabase.from("custom_apps").select("id, name, code, updated_at").eq("workspace_id", workspace.id).eq("id", id).maybeSingle(),
    supabase
      .from("custom_app_messages")
      .select("id, role, content")
      .eq("workspace_id", workspace.id)
      .eq("app_id", id)
      .order("created_at"),
  ]);
  if (app.error) throw app.error;
  if (messages.error) throw messages.error;
  if (!app.data) notFound();

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-1.5">
            <Link href="/apps" className="font-normal text-ink-3 hover:text-ink">
              Add App
            </Link>
            <ChevronRight size={14} className="text-ink-4" />
            {app.data.name}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/apps/custom/${app.data.id}/edit`} className={buttonClass("secondary")}>
              <Code2 /> Edit code
            </Link>
            <Link href={`/apps/custom/${app.data.id}`} className={buttonClass("primary")}>
              Done
            </Link>
          </div>
        }
      />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-line">
          <ol className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.data.length === 0 ? (
              <li className="text-[13px] text-ink-3">Describe a change and the builder will update the app.</li>
            ) : (
              messages.data.map((message) =>
                message.role === "user" ? (
                  <li key={message.id} className="ml-8 rounded-card bg-surface px-3 py-2 text-[13px] whitespace-pre-wrap text-ink">
                    {message.content}
                  </li>
                ) : (
                  <li key={message.id} className="flex gap-2 text-[13px] text-ink">
                    <Sparkles size={14} className="mt-0.5 shrink-0 text-ink-3" />
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  </li>
                ),
              )
            )}
          </ol>
          <div className="border-t border-line p-3">
            <AppPrompt
              action={reviseApp.bind(null, app.data.id)}
              placeholder="Ask for a change"
              pendingLabel="Updating your app…"
            />
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col bg-surface p-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line-strong bg-canvas shadow-card">
            <div className="flex h-9 shrink-0 items-center border-b border-line px-3 text-[12px] text-ink-3">Preview</div>
            <AppFrame
              key={app.data.updated_at}
              title={app.data.name}
              srcDoc={sandboxDocument(app.data.code)}
              call={callCustomApp.bind(null, app.data.id)}
            />
          </div>
        </section>
      </div>
    </>
  );
}
