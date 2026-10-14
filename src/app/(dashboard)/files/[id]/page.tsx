import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, File, FolderClosed, Link2, MoreHorizontal } from "lucide-react";
import { DownloadLink } from "@/components/download-link";
import { Menu } from "@/components/menu";
import { RecordRail } from "@/components/record-rail";
import { SearchToggle } from "@/components/search-toggle";
import { ActionCell, Cell, EmptyState, Row, Table, buttonClass } from "@/components/ui";
import { channelClientHref, getChannel } from "@/lib/channels";
import { formatBytes, formatDate } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { addLink, createFolder, deleteItem, downloadUrl, recordUpload } from "../actions";
import { NewItemMenu } from "./new-menu";

export default async function FileSpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ folder?: string; q?: string }>;
}) {
  const [{ id }, { folder, q: rawQuery }] = await Promise.all([params, searchParams]);
  const q = rawQuery?.trim() ?? "";
  const ctx = await requireApp("files");
  const channel = await getChannel(ctx, "files", id);

  const { data: items, error } = await ctx.supabase
    .from("file_items")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("channel_id", id)
    .order("name");
  if (error) throw error;
  const kindOrder: Record<string, number> = { folder: 0, file: 1, link: 2 };
  items.sort((a, b) => (kindOrder[a.kind] ?? 3) - (kindOrder[b.kind] ?? 3));

  const byId = new Map(items.map((item) => [item.id, item]));
  const currentFolder = folder ? byId.get(folder) : undefined;
  const parentId = currentFolder?.kind === "folder" ? currentFolder.id : null;
  const visible = q
    ? items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase()))
    : items.filter((item) => item.parent_id === parentId);

  const trail: { id: string; name: string }[] = [];
  for (let node = currentFolder; node; node = node.parent_id ? byId.get(node.parent_id) : undefined)
    trail.unshift({ id: node.id, name: node.name });

  const base = `/files/${id}`;
  const recordHref = channelClientHref(channel);
  const crumbs = [{ href: base, name: `${channel.title}'s files` }, ...trail.map((c) => ({ href: `${base}?folder=${c.id}`, name: c.name }))];
  const newMenu = (
    <NewItemMenu
      workspaceId={ctx.workspace.id}
      channelId={id}
      parentId={parentId}
      createFolder={createFolder.bind(null, id)}
      addLink={addLink.bind(null, id)}
      recordUpload={recordUpload.bind(null, id, parentId)}
    />
  );

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[61px] shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <span className="truncate text-[13px] font-medium text-black">{channel.title}</span>
          <div className="flex items-center gap-2">
            <SearchToggle base={base} q={q} />
            {recordHref ? (
              <Menu
                label="File channel options"
                triggerClassName={buttonClass("secondary", "w-7 px-0")}
                trigger={<MoreHorizontal size={14} />}
                items={[{ label: "Open client", href: recordHref }]}
              />
            ) : null}
          </div>
        </header>

        <nav aria-label="Folders" className="flex shrink-0 items-center gap-1 px-4 pt-3">
          {crumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight size={14} className="text-ink-3" /> : null}
              <Link
                href={crumb.href}
                className={clsx(
                  "inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium",
                  index === crumbs.length - 1 ? "bg-hover text-ink" : "text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                {crumb.name}
              </Link>
            </span>
          ))}
        </nav>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {visible.length === 0 ? (
            <EmptyState
              icon={<File size={18} />}
              title={q ? "No files match your search" : "No files have been added yet"}
              body={q ? "Try a different name." : "Files show up here when you or your client add them."}
              action={q ? undefined : newMenu}
            />
          ) : (
            <>
              <div className="flex justify-end px-9 pt-3">{q ? null : newMenu}</div>
              <Table columns={["Name", "Added by", "Size", "Added", ""]}>
                {visible.map((item) => (
                  <Row key={item.id} href={item.kind === "folder" ? `${base}?folder=${item.id}` : undefined}>
                    <Cell>
                      <span className="flex items-center gap-2">
                        {item.kind === "folder" ? (
                          <FolderClosed size={15} className="text-ink-3" />
                        ) : item.kind === "link" ? (
                          <Link2 size={15} className="text-ink-3" />
                        ) : (
                          <File size={15} className="text-ink-3" />
                        )}
                        {item.kind === "link" && item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative z-10 hover:underline">
                            {item.name}
                          </a>
                        ) : item.kind === "file" && item.storage_path ? (
                          <DownloadLink storagePath={item.storage_path} name={item.name} getUrl={downloadUrl} />
                        ) : (
                          <span>{item.name}</span>
                        )}
                      </span>
                    </Cell>
                    <Cell className="text-ink-3">{item.created_by_name || "—"}</Cell>
                    <Cell className="text-ink-3">{item.kind === "file" ? formatBytes(item.size_bytes) : "—"}</Cell>
                    <Cell>{formatDate(item.created_at)}</Cell>
                    <ActionCell>
                      <Menu
                        label={`Actions for ${item.name}`}
                        triggerClassName="inline-flex size-7 items-center justify-center rounded-control hover:bg-hover"
                        trigger={<MoreHorizontal size={16} />}
                        items={[
                          ...(item.kind === "folder" ? [{ label: "Open", href: `${base}?folder=${item.id}` }] : []),
                          { label: "Delete", action: deleteItem.bind(null, id, item.id), danger: true },
                        ]}
                      />
                    </ActionCell>
                  </Row>
                ))}
              </Table>
            </>
          )}
        </div>
      </div>
      {recordHref ? (
        <RecordRail name={channel.title} detailsLabel="Client details" detailsHref={`${recordHref}?panel=details`} notesHref={`${recordHref}?panel=notes`} />
      ) : null}
    </>
  );
}
