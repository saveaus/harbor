import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Trash2 } from "lucide-react";
import { Button, Field, Input, PageHeader, SectionTitle, textareaClass } from "@/components/ui";
import { APP_PERMISSIONS, permissionLabels } from "@/lib/custom-apps";
import { getWorkspace } from "@/lib/workspace";
import { deleteCustomApp, updateCustomApp } from "../../actions";

export default async function EditCustomAppPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, workspace }] = await Promise.all([params, getWorkspace()]);
  const { data: app, error } = await supabase
    .from("custom_apps")
    .select("id, name, description, code, permissions")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!app) notFound();

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-1.5">
            <Link href={`/apps/custom/${app.id}`} className="font-normal text-ink-3 hover:text-ink">
              {app.name}
            </Link>
            <ChevronRight size={14} className="text-ink-4" />
            Edit
          </span>
        }
        actions={
          <form action={deleteCustomApp.bind(null, app.id)}>
            <Button type="submit" variant="danger">
              <Trash2 size={14} /> Delete app
            </Button>
          </form>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <form action={updateCustomApp.bind(null, app.id)} className="mx-auto max-w-4xl space-y-8 px-6 py-8">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name">
              <Input name="name" required maxLength={60} defaultValue={app.name} />
            </Field>
            <Field label="Description">
              <Input name="description" maxLength={280} defaultValue={app.description} />
            </Field>
          </div>

          <section>
            <SectionTitle title="Permissions" description="What the app may ask Harbor for. Everything else is blocked." />
            <div className="space-y-2">
              {APP_PERMISSIONS.map((permission) => (
                <label key={permission} className="flex items-start gap-3 rounded-card border border-line p-3">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission}
                    defaultChecked={app.permissions.includes(permission)}
                    className="mt-0.5 size-4 accent-[var(--color-accent)]"
                  />
                  <span>
                    <span className="block text-[13px] font-medium">{permissionLabels[permission].label}</span>
                    <span className="block text-[12px] text-ink-3">{permissionLabels[permission].detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle
              title="Code"
              description="HTML, CSS and JavaScript. It runs in a locked-down frame with no network access and reaches data only through harbor.clients and harbor.storage."
            />
            <textarea
              name="code"
              defaultValue={app.code}
              rows={24}
              spellCheck={false}
              maxLength={200000}
              className={`${textareaClass} font-mono text-[12px] leading-relaxed`}
            />
          </section>

          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <Link href={`/apps/custom/${app.id}`} className="inline-flex h-8 items-center px-3 text-[13px] text-ink-3 hover:text-ink">
              Cancel
            </Link>
            <Button type="submit" variant="primary">
              Save and run
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
