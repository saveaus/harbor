import { History } from "lucide-react";
import { auditChanges, describeAuditEvent } from "@/lib/audit";
import type { WorkspaceContext } from "@/lib/workspace";
import { RelativeTime } from "./relative-time";

/** Changes to one client or worker and everything attached to them, newest first. Owners and admins only. */
export async function ActivityLog({ ctx, subjectId, limit = 100 }: { ctx: WorkspaceContext; subjectId: string; limit?: number }) {
  if (ctx.member.role === "member") return <p className="px-4 py-6 text-[13px] text-ink-3">Only owners and admins can see activity.</p>;
  const { data, error } = await ctx.supabase
    .from("audit_events")
    .select("id, actor_name, action, entity, label, changes, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!data.length) return <p className="px-4 py-6 text-[13px] text-ink-3">No changes recorded yet.</p>;

  return (
    <ol className="px-4 py-3">
      {data.map((event) => {
        const changes = auditChanges(event.changes);
        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-hover text-ink-3">
              <History size={11} />
            </span>
            <div className="min-w-0 flex-1 text-[13px]">
              <p>
                <span className="font-medium">{event.actor_name || "System"}</span>{" "}
                <span className="text-ink-2">{describeAuditEvent(event.action, event.entity).toLowerCase()}</span>
                {event.label && event.entity !== "contacts" && event.entity !== "staff" ? <span className="text-ink-2"> {event.label}</span> : null}
              </p>
              {changes.length ? (
                <ul className="mt-1 space-y-0.5 text-[12px] text-ink-3">
                  {changes.map((change) => (
                    <li key={change.field} className="break-words">
                      <span className="capitalize">{change.field}</span>
                      {"hidden" in change ? (
                        " changed"
                      ) : (
                        <>
                          : <s className="text-ink-4">{change.from}</s> → <span className="text-ink-2">{change.to}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-0.5 text-[12px] text-ink-4">
                <RelativeTime value={event.created_at} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
