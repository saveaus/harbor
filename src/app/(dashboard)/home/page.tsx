import Link from "next/link";
import { Check, X } from "lucide-react";
import { clsx } from "clsx";
import { PageHeader } from "@/components/ui";
import { brandAssetUrl } from "@/lib/brand";
import { portalHomeContent, sampleTasks } from "@/lib/portal-home";
import { getWorkspace, type WorkspaceContext } from "@/lib/workspace";
import { dismissGettingStarted } from "./actions";
import { HomeEditor } from "./home-editor";

const DEFAULT_BRAND_COLOR = "#2f6fed";

async function gettingStartedSteps({ supabase, workspace }: WorkspaceContext) {
  const id = workspace.id;
  const [contacts, invited, members, payout] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", id),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", id).neq("status", "not_invited"),
    supabase.from("workspace_members").select("user_id", { count: "exact", head: true }).eq("workspace_id", id),
    supabase.from("payout_accounts").select("charges_enabled").eq("workspace_id", id).maybeSingle(),
  ]);
  for (const result of [contacts, invited, members, payout]) if (result.error) throw result.error;

  return [
    { label: "Customize your brand", href: "/brand", done: Boolean(workspace.logo_path) || workspace.brand_color !== DEFAULT_BRAND_COLOR },
    { label: "Add your first client", href: "/crm", done: (contacts.count ?? 0) > 0 },
    { label: "Invite a client to the portal", href: "/crm", done: (invited.count ?? 0) > 0 },
    {
      label: "Personalize the client home",
      href: "/home",
      done: Boolean(workspace.portal_home_title || workspace.portal_home_body || workspace.portal_banner_path),
    },
    { label: "Set up payments", href: "/settings/payout-account", done: Boolean(payout.data?.charges_enabled) },
    { label: "Invite a teammate", href: "/team", done: (members.count ?? 0) > 1 },
  ];
}

async function GettingStarted({ ctx }: { ctx: WorkspaceContext }) {
  const steps = await gettingStartedSteps(ctx);
  const done = steps.filter((step) => step.done).length;
  return (
    <section className="mb-8 rounded-card border border-line-strong bg-canvas p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-medium text-ink">Getting started</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {done} of {steps.length} done. Finish these to give clients the full portal experience.
          </p>
        </div>
        <form action={dismissGettingStarted}>
          <button type="submit" aria-label="Dismiss getting started" className="flex size-7 items-center justify-center rounded-control text-ink-3 hover:bg-hover">
            <X size={14} />
          </button>
        </form>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-hover">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-[13px] hover:bg-surface"
            >
              <span
                className={clsx(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border",
                  step.done ? "border-accent bg-accent text-white" : "border-line-strong",
                )}
              >
                {step.done ? <Check size={10} strokeWidth={3} /> : null}
              </span>
              <span className={clsx("truncate", step.done ? "text-ink-3 line-through" : "text-ink")}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function HomePage() {
  const ctx = await getWorkspace();
  const { workspace, member, installedApps } = ctx;
  return (
    <>
      <PageHeader title="Home" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-8 py-8">
          {workspace.getting_started_dismissed ? null : <GettingStarted ctx={ctx} />}
          <HomeEditor
            workspaceId={workspace.id}
            brand={{
              name: workspace.name,
              accentColor: workspace.brand_color,
              sidebarColor: workspace.portal_sidebar_color,
              logoUrl: brandAssetUrl(workspace.logo_path),
            }}
            initial={portalHomeContent(workspace)}
            tasks={sampleTasks(workspace.currency)}
            installedApps={[...installedApps]}
            locked={member.role === "member"}
          />
        </div>
      </div>
    </>
  );
}
