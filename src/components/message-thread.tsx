import { RichText } from "@/components/rich-text";
import { Avatar } from "@/components/ui";

const timeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export type ThreadMessage = { id: string; author_name: string; body: string; created_at: string };

export function MessageThread({ messages }: { messages: ThreadMessage[] }) {
  return (
    <ol className="space-y-5">
      {messages.map((m) => (
        <li key={m.id} className="flex gap-3">
          <Avatar name={m.author_name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium">{m.author_name}</span>
              <span className="text-[12px] text-ink-3">{timeFormat.format(new Date(m.created_at))}</span>
            </div>
            <div className="text-[13px] text-ink">
              <RichText source={m.body} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
