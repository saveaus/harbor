import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Alert, Cell, EmptyState, Row, Table, textLinkClass } from "@/components/ui";
import { RelativeTime } from "@/components/relative-time";
import { describeAuditEvent } from "@/lib/audit";
import { getWorkspace } from "@/lib/workspace";
import { SettingsTitle } from "../settings-page";

const PAGE_SIZE = 50;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const [{ before }, { supabase, workspace, member }] = await Promise.all([searchParams, getWorkspace()]);
  if (member.role === "member")
    return (
      <>
        <SettingsTitle title="Audit log" />
        <Alert>Only workspace owners and admins can view the audit log.</Alert>
      </>
    );

  let query = supabase
    .from("audit_events")
    .select("id, actor_id, actor_name, action, entity, label, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);
  const cursor = before && !Number.isNaN(Date.parse(before)) ? before : null;
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw error;
  const events = data.slice(0, PAGE_SIZE);
  const older = data.length > PAGE_SIZE ? events.at(-1)?.created_at : null;

  return (
    <>
      <SettingsTitle title="Audit log">A record of changes made in this workspace, newest first.</SettingsTitle>
      {events.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={16} />}
          title="No activity yet"
          body="Changes to clients, payments, contracts, apps and settings appear here."
        />
      ) : (
        <Table columns={["Change", "Item", "By", "When"]}>
          {events.map((event) => (
            <Row key={event.id}>
              <Cell>{describeAuditEvent(event.action, event.entity)}</Cell>
              <Cell>
                <span className="block max-w-56 truncate" title={event.label}>
                  {event.label || "-"}
                </span>
              </Cell>
              <Cell className="text-ink-3">{event.actor_name || (event.actor_id ? "Former member" : "Harbor")}</Cell>
              <Cell className="whitespace-nowrap text-ink-3">
                <RelativeTime value={event.created_at} />
              </Cell>
            </Row>
          ))}
        </Table>
      )}
      <div className="mt-4 flex justify-end gap-4 text-[13px] font-medium">
        {cursor ? (
          <Link href="/settings/audit-log" className={textLinkClass}>
            Newest
          </Link>
        ) : null}
        {older ? (
          <Link href={`/settings/audit-log?before=${encodeURIComponent(older)}`} className={textLinkClass}>
            Older
          </Link>
        ) : null}
      </div>
    </>
  );
}
