"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { optionalId, text } from "@/lib/form-data";
import { getWorkspace } from "@/lib/workspace";

export type NoteSubject = { kind: "client" | "staff"; id: string };

const subjectPath = (subject: NoteSubject) => (subject.kind === "client" ? `/clients/${subject.id}` : `/staff/${subject.id}`);

function subjectColumns(subject: NoteSubject) {
  return subject.kind === "client" ? { contact_id: subject.id, staff_id: null } : { contact_id: null, staff_id: subject.id };
}

/** Creates a note, or updates it when `noteId` is set. Only client notes can link to a shift. */
export async function saveNote(subject: NoteSubject, noteId: string | null, form: FormData) {
  const { supabase, workspace, member } = await getWorkspace();
  const path = subjectPath(subject);
  const title = text(form, "title").slice(0, 160);
  if (!title) redirect(`${path}?tab=notes&error=${encodeURIComponent("Give the note a title.")}`);
  const fields = {
    title,
    body: text(form, "body").slice(0, 20000),
    shift_id: subject.kind === "client" ? optionalId(form, "shift") : null,
  };
  const { error } = noteId
    ? await supabase
        .from("record_notes")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspace.id)
        .eq("id", noteId)
        .eq(subject.kind === "client" ? "contact_id" : "staff_id", subject.id)
    : await supabase.from("record_notes").insert({
        workspace_id: workspace.id,
        ...subjectColumns(subject),
        ...fields,
        author_name: member.display_name || member.email,
      });
  if (error) throw error;
  revalidatePath(path);
}

export async function deleteNote(subject: NoteSubject, noteId: string) {
  const { supabase, workspace } = await getWorkspace();
  const column = subject.kind === "client" ? "contact_id" : "staff_id";
  const { error } = await supabase.from("record_notes").delete().eq("workspace_id", workspace.id).eq("id", noteId).eq(column, subject.id);
  if (error) throw error;
  revalidatePath(subjectPath(subject));
}
