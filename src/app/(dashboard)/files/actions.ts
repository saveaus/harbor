"use server";

import { revalidatePath } from "next/cache";
import { getChannel, touchChannel } from "@/lib/channels";
import { optionalId, text } from "@/lib/form-data";
import { requireApp } from "@/lib/workspace";

async function addItem(
  channelId: string,
  item: { kind: "folder" | "file" | "link"; name: string; parent_id: string | null; url?: string; storage_path?: string; size_bytes?: number; content_type?: string },
) {
  const ctx = await requireApp("files");
  await getChannel(ctx, "files", channelId);
  const { error } = await ctx.supabase.from("file_items").insert({
    workspace_id: ctx.workspace.id,
    channel_id: channelId,
    created_by_name: ctx.member.display_name || ctx.member.email,
    ...item,
  });
  if (error) throw error;
  const verb = item.kind === "folder" ? "Created folder" : item.kind === "link" ? "Added link" : "Uploaded";
  await touchChannel(ctx, channelId, `${verb} ${item.name}`);
  revalidatePath("/files", "layout");
}

export async function createFolder(channelId: string, form: FormData) {
  await addItem(channelId, { kind: "folder", name: text(form, "name"), parent_id: optionalId(form, "parent_id") });
}

export async function addLink(channelId: string, form: FormData) {
  const url = new URL(text(form, "url"));
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Links must use http or https");
  await addItem(channelId, {
    kind: "link",
    name: text(form, "name") || url.hostname,
    url: url.toString(),
    parent_id: optionalId(form, "parent_id"),
  });
}

export async function recordUpload(
  channelId: string,
  parentId: string | null,
  upload: { name: string; storage_path: string; size_bytes: number; content_type: string },
) {
  const ctx = await requireApp("files");
  if (!upload.storage_path.startsWith(`${ctx.workspace.id}/${channelId}/`)) throw new Error("Upload path is outside this space");
  await addItem(channelId, { kind: "file", parent_id: parentId, ...upload });
}

export async function deleteItem(channelId: string, itemId: string) {
  const ctx = await requireApp("files");
  const { data, error } = await ctx.supabase
    .from("file_items")
    .delete()
    .eq("workspace_id", ctx.workspace.id)
    .eq("channel_id", channelId)
    .eq("id", itemId)
    .select("storage_path")
    .maybeSingle();
  if (error) throw error;
  if (data?.storage_path) {
    const removal = await ctx.supabase.storage.from("workspace-files").remove([data.storage_path]);
    if (removal.error) throw removal.error;
  }
  revalidatePath("/files", "layout");
}

export async function downloadUrl(storagePath: string): Promise<string> {
  const ctx = await requireApp("files");
  const { data, error } = await ctx.supabase.storage.from("workspace-files").createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
