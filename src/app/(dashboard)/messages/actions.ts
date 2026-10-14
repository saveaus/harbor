"use server";

import { revalidatePath } from "next/cache";
import { getChannel, touchChannel } from "@/lib/channels";
import { emailClients } from "@/lib/notify";
import { text } from "@/lib/form-data";
import { getWorkspace } from "@/lib/workspace";

export async function sendMessage(channelId: string, form: FormData) {
  const body = text(form, "body");
  if (!body) return;
  const ctx = await getWorkspace();
  const channel = await getChannel(ctx, "messages", channelId);
  const { error } = await ctx.supabase.from("messages").insert({
    workspace_id: ctx.workspace.id,
    channel_id: channelId,
    author_user_id: ctx.userId,
    author_name: ctx.member.display_name || ctx.member.email,
    body,
  });
  if (error) throw error;
  await touchChannel(ctx, channelId, body);
  emailClients(ctx.workspace.id, channel, {
    topic: "messages",
    subject: `New message from ${ctx.workspace.name}`,
    body: body.length > 280 ? `${body.slice(0, 277)}...` : body,
    path: "/portal/messages",
  });
  revalidatePath("/messages", "layout");
  revalidatePath("/clients", "layout");
}
