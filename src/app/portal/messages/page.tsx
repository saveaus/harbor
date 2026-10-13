import { redirect } from "next/navigation";

import { Composer } from "@/components/composer";
import { MessageThread } from "@/components/message-thread";
import { PageHeader } from "@/components/ui";
import { getPortal } from "@/lib/portal";
import { sendPortalMessage } from "../actions";

export default async function PortalMessagesPage() {
  const { supabase, workspace, channels } = await getPortal();
  if (!channels.messages) redirect("/portal");

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, author_name, body, created_at")
    .eq("channel_id", channels.messages)
    .order("created_at");
  if (error) throw error;

  return (
    <>
      <PageHeader title={`Messages with ${workspace.name}`} />
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 && workspace.welcome_message ? (
          <p className="mb-4 rounded-card border border-line bg-surface px-4 py-3 text-[13px] whitespace-pre-wrap text-ink-2">
            {workspace.welcome_message}
          </p>
        ) : null}
        <MessageThread messages={messages} />
      </div>
      <Composer action={sendPortalMessage} />
    </>
  );
}
