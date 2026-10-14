"use server";

import { getWorkspace } from "@/lib/workspace";

/** A one-minute link to a file in this workspace's storage. Storage policies decide who may read it. */
export async function signedFileUrl(storagePath: string, download: boolean): Promise<string> {
  const { supabase, workspace } = await getWorkspace();
  if (!storagePath.startsWith(`${workspace.id}/`)) throw new Error("That file belongs to another workspace.");
  const { data, error } = await supabase.storage.from("workspace-files").createSignedUrl(storagePath, 60, { download });
  if (error) throw error;
  return data.signedUrl;
}
