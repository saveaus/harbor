import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RelativeTime } from "@/components/relative-time";
import { Card, PageHeader } from "@/components/ui";
import { APPS, APP_KEYS } from "@/lib/apps";
import { formatMoney } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";

export default async function HomePage() {
  const ctx = await getWorkspace();
  const { supabase, workspace, member, installedApps } = ctx;
  const id = workspace.id;

  const [companies, contacts, openInvoices, channels] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("workspace_id", id),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", id),
    supabase
      .from("invoices")
      .select("currency, invoice_items(quantity, unit_amount_cents)")
      .eq("workspace_id", id)
      .eq("status", "open"),
    supabase
      .from("channels")
      .select("id, kind, title, last_activity_at, last_activity_summary")
      .eq("workspace_id", id)
      .order("last_activity_at", { ascending: false })
      .limit(6),
  ]);
  for (const result of [companies, contacts, openInvoices, channels]) if (result.error) throw result.error;

  const outstanding = (openInvoices.data ?? []).reduce(
    (sum, invoice) => sum + invoice.invoice_items.reduce((s, item) => s + item.quantity * item.unit_amount_cents, 0),
    0,
  );

  const stats = [
    { label: "Companies", value: String(companies.count ?? 0), href: "/crm/companies" },
    { label: "Contacts", value: String(contacts.count ?? 0), href: "/crm" },
    {
      label: "Outstanding",
      value: installedApps.has("payments") ? formatMoney(outstanding) : "—",
      href: installedApps.has("payments") ? "/payments/invoices" : "/apps?app=payments",
    },
  ];

  const missingApps = APP_KEYS.filter((key) => !installedApps.has(key));
  const firstName = member.display_name.split(" ")[0] || "there";

  return (
    <>
      <PageHeader title="Home" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-[22px] font-semibold tracking-tight">Good to see you, {firstName}</h1>
          <p className="mt-1 text-[13px] text-ink-3">Here&apos;s what&apos;s happening across {workspace.name}.</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <Link key={stat.label} href={stat.href} className="rounded-card border border-line p-4 shadow-control hover:bg-surface">
                <div className="text-[12px] font-medium text-ink-3">{stat.label}</div>
                <div className="mt-1 text-[20px] font-semibold tracking-tight">{stat.value}</div>
              </Link>
            ))}
          </div>

          <Card className="mt-6">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-semibold">Recent activity</h2>
            </div>
            <ul>
              {(channels.data ?? []).map((channel) => (
                <li key={channel.id} className="border-b border-line last:border-0">
                  <Link
                    href={channel.kind === "messages" ? `/messages/${channel.id}` : `/files/${channel.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface"
                  >
                    <span className="w-16 text-[12px] text-ink-3">{channel.kind === "messages" ? "Message" : "Files"}</span>
                    <span className="flex-1 truncate text-[13px] font-medium">{channel.title}</span>
                    <span className="truncate text-[13px] text-ink-3">{channel.last_activity_summary}</span>
                    <RelativeTime value={channel.last_activity_at} className="w-10 text-right text-[12px] text-ink-4" />
                  </Link>
                </li>
              ))}
              {(channels.data ?? []).length === 0 ? (
                <li className="px-4 py-6 text-center text-[13px] text-ink-3">No activity yet.</li>
              ) : null}
            </ul>
          </Card>

          {missingApps.length > 0 ? (
            <Card className="mt-6">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-[13px] font-semibold">Add more to your portal</h2>
              </div>
              <ul className="grid grid-cols-2">
                {missingApps.map((key) => (
                  <li key={key}>
                    <Link href={`/apps?app=${key}`} className="flex items-start gap-2 px-4 py-3 hover:bg-surface">
                      <div className="flex-1">
                        <div className="text-[13px] font-medium">{APPS[key].name}</div>
                        <div className="text-[12px] text-ink-3">{APPS[key].summary}</div>
                      </div>
                      <ArrowUpRight size={14} className="mt-0.5 text-ink-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
