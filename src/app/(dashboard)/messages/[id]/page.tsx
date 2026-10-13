import Link from "next/link";
import { Info, MoreHorizontal } from "lucide-react";
import { Composer } from "@/components/composer";
import { Menu } from "@/components/menu";
import { MessageThread } from "@/components/message-thread";
import { RecordRail } from "@/components/record-rail";
import { buttonClass } from "@/components/ui";
import { getChannel } from "@/lib/channels";
import { getWorkspace } from "@/lib/workspace";
import { sendMessage } from "../actions";

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getWorkspace();
  const channel = await getChannel(ctx, "messages", id);
  const { data: messages, error } = await ctx.supabase
    .from("messages")
    .select("id, author_name, body, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .eq("channel_id", id)
    .order("created_at");
  if (error) throw error;

  const recordHref = channel.company_id ? `/crm/companies/${channel.company_id}` : `/crm/contacts/${channel.contact_id}`;

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[61px] shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <span className="truncate text-[13px] font-medium text-black">{channel.title}</span>
          <Menu
            label="Channel options"
            triggerClassName={buttonClass("secondary", "w-7 px-0")}
            trigger={<MoreHorizontal size={14} />}
            items={[{ label: channel.company_id ? "Open company" : "Open contact", href: recordHref }]}
          />
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mx-auto max-w-[640px]">
            {messages.length === 0 && ctx.workspace.welcome_message ? (
              <div className="mb-5 flex gap-2 rounded-control bg-info-soft px-4 py-3 text-[13px] text-ink">
                <Info size={14} className="mt-0.5 shrink-0 text-link" />
                <div>
                  New conversations greet clients with your welcome message: &ldquo;{ctx.workspace.welcome_message}&rdquo;{" "}
                  <Link href="/settings/general" className="text-link hover:underline">
                    Update settings
                  </Link>
                </div>
              </div>
            ) : null}
            <MessageThread messages={messages} />
          </div>
        </div>
        <div className="mx-auto w-full max-w-[680px]">
          <Composer action={sendMessage.bind(null, id)} placeholder="Message your contact" />
        </div>
      </div>
      <RecordRail
        name={channel.title}
        detailsLabel={channel.company_id ? "Company details" : "Contact details"}
        detailsHref={recordHref}
        notesHref={`${recordHref}?panel=notes`}
      />
    </>
  );
}
