import { ChannelList } from "@/components/channel-list";
import { listChannels } from "@/lib/channels";
import { requireApp } from "@/lib/workspace";

export default async function FilesLayout({ children }: { children: React.ReactNode }) {
  const channels = await listChannels(await requireApp("files"), "files");
  return (
    <div className="flex min-h-0 flex-1">
      <ChannelList base="/files" title="File channels" channels={channels} />
      <section className="flex min-w-0 flex-1">{children}</section>
    </div>
  );
}
