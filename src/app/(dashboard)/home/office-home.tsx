import Link from "next/link";
import { CREDENTIALS, isClosedClient, isoDay, PLAN_ENDING_DAYS, planEndTone } from "@/lib/care";
import { claimLabel } from "@/lib/finance";
import { formatDay, personName } from "@/lib/format";
import { formatLongDay, localParts } from "@/lib/roster";
import { Badge } from "@/components/ui";
import type { WorkspaceContext } from "@/lib/workspace";

type Tone = "neutral" | "warning" | "danger";
type Row = { id: string; href: string; label: string; detail: string; tone?: Tone; more?: string };

function Queue({ title, href, empty, rows }: { title: string; href: string; empty: string; rows: Row[] }) {
  return (
    <section className="rounded-card border border-line-strong bg-canvas p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-medium text-ink">
          {title}
          {rows.length ? <span className="ml-1.5 text-ink-3">{rows.length}</span> : null}
        </h2>
        <Link href={href} className="text-[13px] text-ink-3 hover:text-ink">
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className="-mx-2 flex items-start justify-between gap-3 rounded-control px-2 py-2.5 hover:bg-hover">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">{row.label}</span>
                  {row.more ? <span className="mt-0.5 block truncate text-[12px] text-ink-3">{row.more}</span> : null}
                </span>
                {row.tone ? <Badge tone={row.tone}>{row.detail}</Badge> : <span className="shrink-0 text-[13px] text-ink-3">{row.detail}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function OfficeHome({ ctx }: { ctx: WorkspaceContext }) {
  const { supabase, workspace, member, installedApps } = ctx;
  if (member.role === "member") return null;

  const id = workspace.id;
  const day = isoDay();
  const finance = installedApps.has("finance");
  const scheduling = installedApps.has("scheduling");

  const [plans, credentials, shifts, claims] = await Promise.all([
    supabase
      .from("client_profiles")
      .select("contact_id, plan_end, status, contact:contacts(first_name, last_name, email)")
      .eq("workspace_id", id)
      .not("plan_end", "is", null)
      .lte("plan_end", isoDay(PLAN_ENDING_DAYS))
      .order("plan_end")
      .limit(8),
    supabase
      .from("staff_credentials")
      .select("id, staff_id, kind, expires_on, staff:staff(first_name, last_name, email)")
      .eq("workspace_id", id)
      .eq("review", "approved")
      .not("expires_on", "is", null)
      .lte("expires_on", isoDay(30))
      .order("expires_on")
      .limit(8),
    scheduling
      ? supabase
          .from("shifts")
          .select("id, title, starts_at, billables(status)")
          .eq("workspace_id", id)
          .eq("status", "completed")
          .order("starts_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null }),
    finance
      ? supabase
          .from("claims")
          .select("id, number, period_start, export_error")
          .eq("workspace_id", id)
          .neq("export_error", "")
          .order("updated_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [plans, credentials, shifts, claims]) if (result.error) throw result.error;

  const planRows: Row[] = (plans.data ?? []).flatMap((plan) => {
    if (!plan.plan_end || isClosedClient(plan.status)) return [];
    const ended = plan.plan_end < day;
    return [
      {
        id: plan.contact_id,
        href: `/clients/${plan.contact_id}?tab=budget`,
        label: plan.contact ? personName(plan.contact) : "Participant",
        detail: ended ? `Ended ${formatDay(plan.plan_end)}` : `Ends ${formatDay(plan.plan_end)}`,
        tone: planEndTone(plan.plan_end) === "red" ? ("danger" as const) : ("warning" as const),
      },
    ];
  });

  const credentialRows: Row[] = (credentials.data ?? []).flatMap((credential) => {
    if (!credential.expires_on) return [];
    const expired = credential.expires_on < day;
    return [
      {
        id: credential.id,
        href: `/staff/${credential.staff_id}`,
        label: credential.staff ? personName(credential.staff) : "Staff member",
        detail: expired ? `Expired ${formatDay(credential.expires_on)}` : `Expires ${formatDay(credential.expires_on)}`,
        more: CREDENTIALS[credential.kind],
        tone: expired ? ("danger" as const) : ("warning" as const),
      },
    ];
  });

  const shiftRows: Row[] = (shifts.data ?? []).flatMap((shift) => {
    if (!shift.billables.some((b) => b.status === "unbilled")) return [];
    return [
      {
        id: shift.id,
        href: `/schedule/shifts/${shift.id}`,
        label: shift.title || formatLongDay(localParts(shift.starts_at, workspace.timezone).day),
        detail: formatDay(localParts(shift.starts_at, workspace.timezone).day),
        more: "Completed, not billed",
        tone: "warning" as const,
      },
    ];
  }).slice(0, 8);

  const claimRows: Row[] = (claims.data ?? []).map((claim) => ({
    id: claim.id,
    href: `/finance/claims/${claim.id}`,
    label: claimLabel(claim.period_start, claim.number),
    detail: "Export failed",
    more: claim.export_error.split("\n")[0],
    tone: "danger" as const,
  }));

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-[15px] font-medium text-ink">Needs attention</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Queue title="Plans" href="/clients" empty="No plans ending in the next 60 days." rows={planRows} />
        <Queue title="Credentials" href="/staff" empty="No credentials expiring in the next 30 days." rows={credentialRows} />
        {scheduling ? <Queue title="Unbilled shifts" href="/finance/billables" empty="No completed shifts are waiting to be billed." rows={shiftRows} /> : null}
        {finance ? <Queue title="Claim exports" href="/finance/claims" empty="No claims failed their last export." rows={claimRows} /> : null}
      </div>
    </div>
  );
}
