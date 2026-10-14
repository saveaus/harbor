import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { RelativeTime } from "@/components/relative-time";
import { Chip, RecordSummary } from "@/components/record-list";
import { StatusPicker } from "@/components/status-picker";
import { Button, Field, Tabs, Textarea, buttonClass } from "@/components/ui";
import {
  INCIDENT_PRIORITY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  formatDuration,
  incidentCode,
  param,
  statusDurations,
} from "@/lib/compliance";
import { getIncident, labelMap, listIncidentNotes, listStatusEvents, peopleOptions } from "@/lib/compliance-data";
import { requireApp } from "@/lib/workspace";
import { addIncidentNote, deleteIncident, setIncidentStatus, updateIncident } from "../../actions";
import { IncidentFields } from "../fields";

export default async function IncidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const tab = param((await searchParams).tab);
  const ctx = await requireApp("compliance");
  const [incident, notes, events, people] = await Promise.all([
    getIncident(ctx, id),
    listIncidentNotes(ctx, id),
    listStatusEvents(ctx, id),
    peopleOptions(ctx),
  ]);
  if (!incident) notFound();
  const clients = labelMap(people.clients);
  const base = `/compliance/incidents/${incident.id}`;
  const tabs = [
    { href: base, label: "Record" },
    { href: `${base}?tab=notes`, label: notes.length ? `Notes (${notes.length})` : "Notes" },
    { href: `${base}?tab=pulse`, label: "Pulse" },
  ];
  const active = tab === "notes" ? tabs[1].href : tab === "pulse" ? tabs[2].href : tabs[0].href;
  const durations = statusDurations(events);
  const oldest = events[0];
  const activity = [
    ...events.map((event) => ({
      id: event.id,
      at: event.started_at,
      kind: "status" as const,
      status: event.status,
      actor: event.actor_name || "Team",
      first: event.id === oldest?.id,
    })),
    ...notes.map((note) => ({
      id: note.id,
      at: note.created_at,
      kind: "note" as const,
      actor: note.author_name || "Team",
      body: note.body,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between gap-3 px-9 pt-4">
        <Link href="/compliance/incidents" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Incidents
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`${base}/print`} className={buttonClass("secondary")}>
            Print summary
          </Link>
          <form action={deleteIncident.bind(null, incident.id)}>
            <ConfirmSubmit confirm={`Delete ${incident.title}? Notes and history are deleted with it.`} className={buttonClass("danger")}>
              <Trash2 size={14} /> Delete
            </ConfirmSubmit>
          </form>
        </div>
      </div>
      <RecordSummary
        name={incident.title}
        detail={`${incidentCode(incident.number)} · ${incident.category}${clients.get(incident.contact_id ?? "") ? ` · ${clients.get(incident.contact_id ?? "")}` : ""}`}
        chips={
          <>
            <StatusPicker
              value={incident.status}
              options={Object.entries(INCIDENT_STATUS).map(([value, option]) => ({ value, label: option.label, tone: option.tone }))}
              action={setIncidentStatus.bind(null, incident.id)}
            />
            <Chip tone={INCIDENT_PRIORITY[incident.priority].tone}>{INCIDENT_PRIORITY[incident.priority].label}</Chip>
            <Chip tone={INCIDENT_SEVERITY[incident.severity].tone}>{INCIDENT_SEVERITY[incident.severity].label}</Chip>
          </>
        }
      />
      <Tabs items={tabs} active={active} />
      {active === tabs[0].href ? (
        <form action={updateIncident.bind(null, incident.id)} className="mx-auto w-full max-w-3xl space-y-4 px-9 py-6">
          <IncidentFields clients={people.clients} staff={people.staff} values={incident} />
          <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit" variant="primary">
              Save incident
            </Button>
          </div>
        </form>
      ) : null}
      {active === tabs[1].href ? (
        <div className="mx-auto w-full max-w-3xl px-9 py-6">
          <form action={addIncidentNote.bind(null, incident.id)} className="space-y-3">
            <Field label="Note">
              <Textarea name="body" required rows={4} maxLength={8000} placeholder="What changed, who was told, and what happens next." />
            </Field>
            <Button type="submit" variant="primary">
              Add note
            </Button>
          </form>
          <ol className="mt-6 space-y-4">
            {notes.length === 0 ? <li className="text-[13px] text-ink-3">No notes yet.</li> : null}
            {notes.map((note) => (
              <li key={note.id} className="rounded-card border border-line-strong px-4 py-3">
                <p className="text-[13px] whitespace-pre-wrap text-ink">{note.body}</p>
                <p className="mt-2 text-[12px] text-ink-3">
                  {note.author_name || "Team"} · <RelativeTime value={note.created_at} />
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {active === tabs[2].href ? (
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-9 py-6 lg:grid-cols-2">
          <section>
            <h2 className="text-[14px] font-medium">Time in each status</h2>
            <ul className="mt-3 space-y-2">
              {durations.length === 0 ? <li className="text-[13px] text-ink-3">No status history yet.</li> : null}
              {durations.map((span) => (
                <li key={span.status} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="inline-flex items-center gap-2">
                    <Chip tone={INCIDENT_STATUS[span.status].tone}>{INCIDENT_STATUS[span.status].label}</Chip>
                    {span.current ? <span className="text-ink-3">current</span> : null}
                  </span>
                  <span className="text-ink-3">{formatDuration(span.ms)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-[14px] font-medium">Activity</h2>
            <ol className="mt-3 space-y-3">
              {activity.length === 0 ? <li className="text-[13px] text-ink-3">No activity yet.</li> : null}
              {activity.map((item) => (
                <li key={item.id} className="text-[13px]">
                  {item.kind === "status" ? (
                    <p>
                      <span className="font-medium">{item.actor}</span>{" "}
                      <span className="text-ink-2">
                        {item.first ? "started this in" : "moved this to"} {INCIDENT_STATUS[item.status].label.toLowerCase()}
                      </span>
                    </p>
                  ) : (
                    <>
                      <p>
                        <span className="font-medium">{item.actor}</span> <span className="text-ink-2">added a note</span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-ink-3">{item.body}</p>
                    </>
                  )}
                  <p className="text-[12px] text-ink-4">
                    <RelativeTime value={item.at} />
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </div>
  );
}
