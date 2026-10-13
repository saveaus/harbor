import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Bell } from "lucide-react";
import { RelativeTime } from "@/components/relative-time";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { getWorkspace } from "@/lib/workspace";

async function markAllRead() {
  "use server";
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .is("read_at", null);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export default async function NotificationsPage() {
  const { supabase, workspace } = await getWorkspace();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const hasUnread = data.some((n) => n.read_at === null);

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          hasUnread ? (
            <form action={markAllRead}>
              <Button type="submit">Mark all as read</Button>
            </form>
          ) : null
        }
      />
      {data.length === 0 ? (
        <EmptyState
          icon={<Bell size={18} />}
          title="You're all caught up"
          body="When clients pay invoices, sign contracts, submit forms or add files, you'll hear about it here."
        />
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {data.map((n) => (
            <li key={n.id} className="border-b border-line">
              <Link href={n.href || "/notifications"} className="flex items-start gap-3 px-5 py-3 hover:bg-surface">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-accent"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{n.title}</div>
                  {n.body ? <div className="truncate text-[13px] text-ink-3">{n.body}</div> : null}
                </div>
                <RelativeTime value={n.created_at} className="text-[12px] text-ink-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
