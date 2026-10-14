import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  INCIDENT_PRIORITY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  formatDateTime,
  formatDuration,
  incidentCode,
  statusDurations,
} from "@/lib/compliance";
import { getIncident, labelMap, listIncidentNotes, listStatusEvents, peopleOptions } from "@/lib/compliance-data";
import { requireApp } from "@/lib/workspace";
import { PrintButton } from "../../../print-button";

export default async function IncidentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireApp("compliance");
  const [incident, notes, events, people] = await Promise.all([
    getIncident(ctx, id),
    listIncidentNotes(ctx, id),
    listStatusEvents(ctx, id),
    peopleOptions(ctx),
  ]);
  if (!incident) notFound();
  const staff = labelMap(people.staff);
  const clients = labelMap(people.clients);
  const durations = statusDurations(events);
  const facts = [
    ["Status", INCIDENT_STATUS[incident.status].label],
    ["Priority", INCIDENT_PRIORITY[incident.priority].label],
    ["Severity", INCIDENT_SEVERITY[incident.severity].label],
    ["Category", incident.category],
    ["Client", clients.get(incident.contact_id ?? "") || "—"],
    ["Reported by", staff.get(incident.reported_by_id ?? "") || "—"],
    ["Assigned to", staff.get(incident.assigned_to_id ?? "") || "—"],
    ["Location", incident.location || "—"],
    ["Occurred", formatDateTime(incident.occurred_at)],
    ["Reported", formatDateTime(incident.reported_at)],
  ];

  return (
    <article className="min-h-0 flex-1 overflow-y-auto px-9 py-6 print:overflow-visible">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/compliance/incidents/${incident.id}`} className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Back to incident
        </Link>
        <PrintButton />
      </div>
      <p className="text-[12px] tracking-wide text-ink-3 uppercase">{incidentCode(incident.number)}</p>
      <h1 className="mt-1 text-[24px] font-medium">{incident.title}</h1>
      <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[12px] text-ink-3">{label}</dt>
            <dd className="text-[14px]">{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-8 text-[16px] font-medium">What happened</h2>
      <p className="mt-2 text-[14px] whitespace-pre-wrap">{incident.description || "No description recorded."}</p>
      <h2 className="mt-8 text-[16px] font-medium">Notes</h2>
      {notes.length === 0 ? <p className="mt-2 text-[14px] text-ink-3">No notes.</p> : null}
      <ol className="mt-2 space-y-3">
        {[...notes].reverse().map((note) => (
          <li key={note.id}>
            <p className="text-[12px] text-ink-3">
              {note.author_name || "Team"} · {formatDateTime(note.created_at)}
            </p>
            <p className="text-[14px] whitespace-pre-wrap">{note.body}</p>
          </li>
        ))}
      </ol>
      <h2 className="mt-8 text-[16px] font-medium">Time in each status</h2>
      <ul className="mt-2 space-y-1 text-[14px]">
        {durations.map((span) => (
          <li key={span.status}>
            {INCIDENT_STATUS[span.status].label}: {formatDuration(span.ms)}
            {span.current ? " (current)" : ""}
          </li>
        ))}
      </ul>
    </article>
  );
}
