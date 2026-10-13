import { ChannelList } from "@/components/channel-list";
import { listChannels } from "@/lib/channels";
import { getWorkspace } from "@/lib/workspace";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const channels = await listChannels(await getWorkspace(), "messages");
  return (
    <div className="flex min-h-0 flex-1">
      <ChannelList base="/messages" title="Message channels" channels={channels} />
      <section className="flex min-w-0 flex-1">{children}</section>
    </div>
  );
}
