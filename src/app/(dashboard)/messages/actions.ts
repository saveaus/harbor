"use server";

import { revalidatePath } from "next/cache";
import { getChannel, touchChannel } from "@/lib/channels";
import { text } from "@/lib/form-data";
import { getWorkspace } from "@/lib/workspace";

export async function sendMessage(channelId: string, form: FormData) {
  const body = text(form, "body");
  if (!body) return;
  const ctx = await getWorkspace();
  await getChannel(ctx, "messages", channelId);
  const { error } = await ctx.supabase.from("messages").insert({
    workspace_id: ctx.workspace.id,
    channel_id: channelId,
    author_user_id: ctx.userId,
    author_name: ctx.member.display_name || ctx.member.email,
    body,
  });
  if (error) throw error;
  await touchChannel(ctx, channelId, body);
  revalidatePath("/messages", "layout");
  revalidatePath("/crm", "layout");
}
