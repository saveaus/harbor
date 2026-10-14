import { cache } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteNote, saveNote, type NoteSubject } from "@/app/(dashboard)/note-actions";
import { formatDate } from "@/lib/format";
import { formatLongDay, formatShiftTime, localParts } from "@/lib/roster";
import type { WorkspaceContext } from "@/lib/workspace";
import { ConfirmSubmit } from "./confirm-submit";
import { FormDialog } from "./dialog";
import { TabBar, TabEmpty } from "./profile";
import { Chip } from "./record-list";
import { Field, Input, Select, Textarea, buttonClass } from "./ui";

type Shift = { id: string; starts_at: string; ends_at: string };

type FeedItem = {
  key: string;
  kind: "general" | "appointment";
  noteId: string | null;
  title: string;
  body: string;
  author: string;
  at: string;
  shift: Shift | null;
  editable: boolean;
};

export const NOTE_TYPES = { general: "General", appointment: "Appointment" } as const;
export type NoteType = keyof typeof NOTE_TYPES;

const shiftLabel = (shift: Shift, tz: string) =>
  `${formatLongDay(localParts(shift.starts_at, tz).day)}, ${formatShiftTime(shift.starts_at, shift.ends_at, tz)}`;

const loadFeed = (ctx: WorkspaceContext, subject: NoteSubject) => loadFeedOnce(ctx, subject.kind, subject.id);

const loadFeedOnce = cache(async (ctx: WorkspaceContext, kind: NoteSubject["kind"], id: string): Promise<{ items: FeedItem[]; shifts: Shift[] }> => {
  const subject: NoteSubject = { kind, id };
  const { supabase, workspace } = ctx;
  const column = subject.kind === "client" ? "contact_id" : "staff_id";
  const [notes, entries, linked] = await Promise.all([
    supabase
      .from("record_notes")
      .select("id, title, body, author_name, created_at, updated_at, shift:shifts(id, starts_at, ends_at)")
      .eq("workspace_id", workspace.id)
      .eq(column, subject.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("timesheet_entries")
      .select("id, notes, starts_at, ends_at, created_at, staff:staff(first_name, last_name), contact:contacts(first_name, last_name)")
      .eq("workspace_id", workspace.id)
      .eq(column, subject.id)
      .neq("notes", "")
      .order("starts_at", { ascending: false })
      .limit(200),
    subject.kind === "client"
      ? supabase.from("shift_clients").select("shift:shifts(id, starts_at, ends_at)").eq("contact_id", subject.id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (notes.error) throw notes.error;
  if (entries.error) throw entries.error;
  if (linked.error) throw linked.error;

  const items: FeedItem[] = [
    ...notes.data.map((n) => ({
      key: n.id,
      kind: n.shift ? ("appointment" as const) : ("general" as const),
      noteId: n.id,
      title: n.title,
      body: n.body,
      author: n.author_name || "Unknown",
      at: n.created_at,
      shift: n.shift,
      editable: true,
    })),
    ...entries.data.map((e) => {
      const other = subject.kind === "client" ? e.staff : e.contact;
      return {
        key: `timesheet-${e.id}`,
        kind: "appointment" as const,
        noteId: null,
        title: subject.kind === "staff" && other ? `Shift with ${other.first_name} ${other.last_name}`.trim() : "Shift note",
        body: e.notes,
        author: e.staff ? `${e.staff.first_name} ${e.staff.last_name}`.trim() : "Worker",
        at: e.created_at,
        shift: { id: e.id, starts_at: e.starts_at, ends_at: e.ends_at },
        editable: false,
      };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const shifts = linked.data
    .flatMap((l) => (l.shift ? [l.shift] : []))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .slice(0, 60);
  return { items, shifts };
});

function NoteFields({ note, shifts, tz }: { note?: FeedItem; shifts: Shift[]; tz: string }) {
  return (
    <>
      <Field label="Title">
        <Input name="title" required maxLength={160} defaultValue={note?.title} />
      </Field>
      {shifts.length ? (
        <Field label="Linked appointment" note="optional">
          <Select name="shift" defaultValue={note?.shift?.id ?? ""}>
            <option value="">Not linked</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {shiftLabel(s, tz)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="Note">
        <Textarea name="body" rows={6} maxLength={20000} defaultValue={note?.body} />
      </Field>
    </>
  );
}

/** Opens the add-note dialog; used in the profile header and the Notes tab. */
export async function NewNoteButton({
  ctx,
  subject,
  variant = "primary",
}: {
  ctx: WorkspaceContext;
  subject: NoteSubject;
  variant?: "primary" | "secondary";
}) {
  const { shifts } = await loadFeed(ctx, subject);
  return (
    <FormDialog
      trigger={
        <>
          <Plus /> Note
        </>
      }
      triggerVariant={variant}
      title="Add note"
      action={saveNote.bind(null, subject, null)}
      submitLabel="Add note"
    >
      <NoteFields shifts={shifts} tz={ctx.workspace.timezone} />
    </FormDialog>
  );
}

function NoteCard({ item, subject, shifts, tz }: { item: FeedItem; subject: NoteSubject; shifts: Shift[]; tz: string }) {
  return (
    <li className="group rounded-card border border-line bg-canvas px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[13px] font-medium">{item.title}</h3>
            <Chip tone={item.kind === "appointment" ? "blue" : "grey"}>{NOTE_TYPES[item.kind]}</Chip>
          </div>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {item.author} · {formatDate(item.at)}
            {item.shift ? ` · ${shiftLabel(item.shift, tz)}` : ""}
          </p>
        </div>
        {item.editable && item.noteId ? (
          <div className="flex shrink-0 items-center gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
            <FormDialog
              trigger={<Pencil aria-label="Edit note" />}
              triggerVariant="ghost"
              title="Edit note"
              action={saveNote.bind(null, subject, item.noteId)}
              submitLabel="Save"
            >
              <NoteFields note={item} shifts={shifts} tz={tz} />
            </FormDialog>
            <form action={deleteNote.bind(null, subject, item.noteId)}>
              <ConfirmSubmit confirm={`Delete "${item.title}"?`} label="Delete note" className={buttonClass("ghost", "w-7 px-0 text-ink-3")}>
                <Trash2 size={14} />
              </ConfirmSubmit>
            </form>
          </div>
        ) : null}
      </div>
      {item.body ? <p className="mt-2 line-clamp-6 text-[13px] whitespace-pre-wrap text-ink-2">{item.body}</p> : null}
    </li>
  );
}

/**
 * Every note about a client or worker: notes written on the profile and notes workers left on
 * their timesheets, newest first. `limit` shows a short preview without the toolbar.
 */
export async function RecordNotes({
  ctx,
  subject,
  query = "",
  type = null,
  keep,
  limit,
}: {
  ctx: WorkspaceContext;
  subject: NoteSubject;
  query?: string;
  type?: NoteType | null;
  keep?: Record<string, string>;
  limit?: number;
}) {
  const tz = ctx.workspace.timezone;
  const { items, shifts } = await loadFeed(ctx, subject);
  const needle = query.trim().toLowerCase();
  const shown = items
    .filter((i) => !type || i.kind === type)
    .filter((i) => !needle || `${i.title}\n${i.body}\n${i.author}`.toLowerCase().includes(needle))
    .slice(0, limit);

  if (limit !== undefined)
    return shown.length ? (
      <ul className="space-y-2">
        {shown.map((item) => (
          <NoteCard key={item.key} item={item} subject={subject} shifts={shifts} tz={tz} />
        ))}
      </ul>
    ) : (
      <p className="text-[13px] text-ink-3">No recent notes</p>
    );

  return (
    <>
      <TabBar
        title={
          <form className="flex flex-wrap items-center gap-2" role="search">
            {Object.entries(keep ?? {}).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <label className="relative">
              <span className="sr-only">Search notes</span>
              <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" />
              <input
                name="nq"
                defaultValue={query}
                placeholder="Search notes"
                className="h-7 w-52 rounded-control border border-line-strong bg-canvas pr-2 pl-7 text-[13px] font-normal outline-none focus:border-ink-3"
              />
            </label>
            <label>
              <span className="sr-only">Note type</span>
              <select
                name="ntype"
                defaultValue={type ?? ""}
                className="h-7 rounded-control border border-line-strong bg-canvas px-2 text-[13px] font-normal outline-none focus:border-ink-3"
              >
                <option value="">All types</option>
                {Object.entries(NOTE_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={buttonClass("secondary")}>
              Apply
            </button>
          </form>
        }
      >
        <span className="text-ink-3 tabular-nums">
          {shown.length} of {items.length}
        </span>
        <NewNoteButton ctx={ctx} subject={subject} />
      </TabBar>
      {shown.length ? (
        <ul className="space-y-2 px-9 py-5">
          {shown.map((item) => (
            <NoteCard key={item.key} item={item} subject={subject} shifts={shifts} tz={tz} />
          ))}
        </ul>
      ) : (
        <TabEmpty>{items.length ? "No notes match." : "No notes yet. Notes from shifts appear here too."}</TabEmpty>
      )}
    </>
  );
}
