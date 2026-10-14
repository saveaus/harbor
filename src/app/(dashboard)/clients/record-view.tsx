import Link from "next/link";
import { ChevronRight, File, Folder, Info, Link2, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Composer } from "@/components/composer";
import { Menu, type MenuItem } from "@/components/menu";
import { MessageThread } from "@/components/message-thread";
import { RecordAside } from "@/components/record-aside";
import { RecordRail } from "@/components/record-rail";
import { listHref } from "@/lib/list-params";
import { Badge, Button, ButtonLink, Cell, Row, Table, Tabs, buttonClass, textLinkClass } from "@/components/ui";
import { formatBytes, formatDate, formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceStatus, invoiceTotal } from "@/lib/payments";
import type { WorkspaceContext } from "@/lib/workspace";
import { sendMessage } from "../messages/actions";
import { saveNotes } from "./actions";

export type RecordTab = "messages" | "files" | "payments";
export type RecordPanel = "details" | "notes";

/** `panel` is null until a panel is chosen: wide screens then show details, narrow screens show none. */
export function parseRecordView(params: { tab?: string; panel?: string }): { tab: RecordTab; panel: RecordPanel | null } {
  const tab = params.tab === "files" || params.tab === "payments" ? params.tab : "messages";
  const panel = params.panel === "notes" || params.panel === "details" ? params.panel : null;
  return { tab, panel };
}

type Channel = { id: string; kind: string; title: string };

export async function RecordView({
  ctx,
  contactId,
  name,
  summary,
  view,
  menu,
  channels,
  welcomePending,
  details,
}: {
  ctx: WorkspaceContext;
  contactId: string;
  name: string;
  summary: ReactNode;
  view: { tab: RecordTab; panel: RecordPanel | null };
  menu: MenuItem[];
  channels: Channel[];
  welcomePending: boolean;
  details: ReactNode;
}) {
  const path = `/clients/${contactId}`;
  const panelTitle = "Client details";
  const panel = view.panel ?? "details";
  const href = (next: Partial<typeof view>) => {
    const merged = { ...view, ...next };
    return listHref(path, { tab: merged.tab === "messages" ? undefined : merged.tab, panel: merged.panel ?? undefined });
  };
  const tabs = [
    { href: href({ tab: "messages" }), label: "Messages" },
    ...(ctx.installedApps.has("files") ? [{ href: href({ tab: "files" }), label: "Files" }] : []),
    ...(ctx.installedApps.has("payments") ? [{ href: href({ tab: "payments" }), label: "Payments" }] : []),
  ];

  return (
    <div className="relative flex min-h-0 flex-1">
      <section className="flex min-w-0 flex-1 flex-col border-r border-line">
        <header className="flex h-[61px] shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <nav className="flex min-w-0 items-center gap-2 text-[13px]">
            <Link href="/clients" className="text-ink-3 hover:text-ink">
              Clients
            </Link>
            <ChevronRight size={14} className="shrink-0 text-ink-3" />
            <span className="truncate font-medium text-black">{name}</span>
          </nav>
          <Menu
            label={`Actions for ${name}`}
            triggerClassName={buttonClass("secondary", "w-7 px-0")}
            trigger={<MoreHorizontal size={14} />}
            items={menu}
          />
        </header>
        {summary}
        <Tabs items={tabs} active={href({ tab: view.tab })} />
        {view.tab === "messages" ? (
          <MessagesTab ctx={ctx} channel={channels.find((c) => c.kind === "messages")} welcomePending={welcomePending} />
        ) : view.tab === "files" ? (
          <FilesTab ctx={ctx} channel={channels.find((c) => c.kind === "files")} />
        ) : (
          <PaymentsTab ctx={ctx} contactId={contactId} />
        )}
      </section>

      <RecordAside
        label={panelTitle}
        tabs={[
          { href: href({ panel: "details" }), label: panelTitle, active: panel === "details" },
          { href: href({ panel: "notes" }), label: "Notes", active: panel === "notes" },
        ]}
        open={view.panel !== null}
        collapsed={false}
        closeHref={href({ panel: null })}
      >
        {panel === "details" ? details : <NotesPanel ctx={ctx} contactId={contactId} />}
      </RecordAside>

      <RecordRail
        name={name}
        detailsLabel={panelTitle}
        detailsHref={href({ panel: "details" })}
        notesHref={href({ panel: "notes" })}
        active={view.panel ?? undefined}
      />
    </div>
  );
}

async function MessagesTab({
  ctx,
  channel,
  welcomePending,
}: {
  ctx: WorkspaceContext;
  channel: Channel | undefined;
  welcomePending: boolean;
}) {
  if (!channel) return <p className="p-9 text-[13px] text-ink-3">This record has no conversation yet.</p>;
  const { data: messages, error } = await ctx.supabase
    .from("messages")
    .select("id, author_name, body, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .eq("channel_id", channel.id)
    .order("created_at");
  if (error) throw error;

  return (
    <>
      <div className="flex h-12 shrink-0 items-center border-b border-line px-5 text-[13px]">{channel.title}</div>
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="mx-auto max-w-[640px]">
          {welcomePending && messages.length === 0 && ctx.workspace.welcome_message ? (
            <div className="rounded-card border border-line-strong p-4">
              <div className="flex gap-2 rounded-control bg-info-soft px-4 py-3 text-[13px] text-ink">
                <Info size={14} className="mt-0.5 shrink-0 text-link" />
                <div>
                  This client hasn&apos;t signed in yet. When they do, they&apos;ll be greeted with the welcome message below, unless you
                  send something first.{" "}
                  <Link href="/settings/general" className={textLinkClass}>
                    Edit welcome message
                  </Link>
                </div>
              </div>
              <div className="mt-4">
                <MessageThread
                  messages={[
                    {
                      id: "welcome",
                      author_name: ctx.member.display_name || ctx.member.email,
                      body: ctx.workspace.welcome_message,
                      created_at: new Date().toISOString(),
                    },
                  ]}
                />
              </div>
            </div>
          ) : (
            <MessageThread messages={messages} />
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[680px]">
        <Composer action={sendMessage.bind(null, channel.id)} />
      </div>
    </>
  );
}

async function FilesTab({ ctx, channel }: { ctx: WorkspaceContext; channel: Channel | undefined }) {
  if (!channel) return <p className="p-9 text-[13px] text-ink-3">This record has no file space yet.</p>;
  const { data: items, error } = await ctx.supabase
    .from("file_items")
    .select("id, kind, name, size_bytes, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .eq("channel_id", channel.id)
    .is("parent_id", null)
    .order("kind")
    .order("name");
  if (error) throw error;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex h-12 items-center justify-between border-b border-line px-5 text-[13px]">
        {channel.title}
        <ButtonLink href={`/files/${channel.id}`}>Open in Files</ButtonLink>
      </div>
      {items.length === 0 ? (
        <p className="px-9 py-10 text-center text-[13px] text-ink-3">No files have been shared yet.</p>
      ) : (
        <Table columns={["Name", "Size", "Added"]}>
          {items.map((item) => (
            <Row key={item.id} href={item.kind === "folder" ? `/files/${channel.id}?folder=${item.id}` : `/files/${channel.id}`}>
              <Cell>
                <span className="flex items-center gap-2">
                  {item.kind === "folder" ? <Folder size={14} /> : item.kind === "link" ? <Link2 size={14} /> : <File size={14} />}
                  {item.name}
                </span>
              </Cell>
              <Cell className="text-ink-3">{item.kind === "file" ? formatBytes(item.size_bytes) : "—"}</Cell>
              <Cell>{formatDate(item.created_at)}</Cell>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}

async function PaymentsTab({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const { data: invoices, error } = await ctx.supabase
    .from("invoices")
    .select("id, number, status, currency, due_date, invoice_items(quantity, unit_amount_cents)")
    .eq("workspace_id", ctx.workspace.id)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex h-12 items-center justify-between border-b border-line px-5 text-[13px]">
        Invoices
        <ButtonLink href="/payments/invoices/new">Create invoice</ButtonLink>
      </div>
      {invoices.length === 0 ? (
        <p className="px-9 py-10 text-center text-[13px] text-ink-3">No invoices yet.</p>
      ) : (
        <Table columns={["Invoice", "Status", "Amount", "Due"]}>
          {invoices.map((invoice) => (
            <Row key={invoice.id} href={`/payments/invoices/${invoice.id}`}>
              <Cell>{invoiceNumber(invoice.number)}</Cell>
              <Cell>
                <Badge tone={invoiceStatus[invoice.status].tone}>{invoiceStatus[invoice.status].label}</Badge>
              </Cell>
              <Cell>{formatMoney(invoiceTotal(invoice.invoice_items), invoice.currency)}</Cell>
              <Cell>{formatDate(invoice.due_date)}</Cell>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}

async function NotesPanel({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const { data, error } = await ctx.supabase
    .from("record_details")
    .select("notes")
    .eq("workspace_id", ctx.workspace.id)
    .eq("contact_id", contactId)
    .maybeSingle();
  if (error) throw error;
  return (
    <form action={saveNotes.bind(null, contactId)} className="flex h-full flex-col gap-3 p-4">
      <p className="text-[13px] text-ink-3">Only staff can see these notes.</p>
      <textarea
        name="notes"
        defaultValue={data?.notes ?? ""}
        maxLength={20000}
        placeholder="Add a note…"
        className="min-h-60 flex-1 resize-none rounded-control border border-line-strong p-3 text-[13px] outline-none focus:border-ink-3"
      />
      <div>
        <Button type="submit" variant="primary">
          Save notes
        </Button>
      </div>
    </form>
  );
}
