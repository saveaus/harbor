import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, File, FolderClosed, FolderPlus, Link2 } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { DownloadLink } from "@/components/download-link";
import { Cell, EmptyState, Field, Input, Row, Table } from "@/components/ui";
import { UploadButton } from "@/components/upload-button";
import { formatBytes, formatDate } from "@/lib/format";
import { requirePortalApp } from "@/lib/portal";
import { createPortalFolder, portalDownloadUrl, recordPortalUpload } from "../actions";

export default async function PortalFilesPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  const [{ folder }, { supabase, workspace, channels }] = await Promise.all([searchParams, requirePortalApp("files")]);
  const channelId = channels.files;
  if (!channelId) redirect("/portal");

  const { data: items, error } = await supabase
    .from("file_items")
    .select("*")
    .eq("channel_id", channelId)
    .order("kind")
    .order("name");
  if (error) throw error;

  const byId = new Map(items.map((item) => [item.id, item]));
  const currentFolder = folder ? byId.get(folder) : undefined;
  const parentId = currentFolder?.kind === "folder" ? currentFolder.id : null;
  const visible = items.filter((item) => item.parent_id === parentId);

  const trail: { id: string; name: string }[] = [];
  for (let node = currentFolder; node; node = node.parent_id ? byId.get(node.parent_id) : undefined)
    trail.unshift({ id: node.id, name: node.name });

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-5">
        <nav className="flex min-w-0 items-center gap-1 text-[14px] font-semibold">
          <Link href="/portal/files" className={trail.length ? "font-normal text-ink-3 hover:text-ink" : ""}>
            Files
          </Link>
          {trail.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-ink-4" />
              <Link
                href={`/portal/files?folder=${crumb.id}`}
                className={index < trail.length - 1 ? "font-normal text-ink-3 hover:text-ink" : ""}
              >
                {crumb.name}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <FormDialog
            trigger={<FolderPlus size={14} />}
            triggerVariant="secondary"
            title="New folder"
            action={createPortalFolder.bind(null, parentId)}
            submitLabel="Create folder"
          >
            <Field label="Folder name">
              <Input name="name" required maxLength={255} />
            </Field>
          </FormDialog>
          <UploadButton workspaceId={workspace.id} channelId={channelId} record={recordPortalUpload.bind(null, parentId)} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <EmptyState
            icon={<File size={18} />}
            title="Nothing here yet"
            body={`Upload documents for ${workspace.name}. Anything they share with you appears here too.`}
          />
        ) : (
          <Table columns={["Name", "Added by", "Size", "Added"]}>
            {visible.map((item) => (
              <Row key={item.id} href={item.kind === "folder" ? `/portal/files?folder=${item.id}` : undefined}>
                <Cell className="text-ink">
                  <span className="flex items-center gap-2">
                    {item.kind === "folder" ? (
                      <FolderClosed size={15} className="text-ink-3" />
                    ) : item.kind === "link" ? (
                      <Link2 size={15} className="text-ink-3" />
                    ) : (
                      <File size={15} className="text-ink-3" />
                    )}
                    {item.kind === "link" && item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative z-10 font-medium hover:underline">
                        {item.name}
                      </a>
                    ) : item.kind === "file" && item.storage_path ? (
                      <DownloadLink storagePath={item.storage_path} name={item.name} getUrl={portalDownloadUrl} />
                    ) : (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </span>
                </Cell>
                <Cell>{item.created_by_name || "—"}</Cell>
                <Cell>{item.kind === "file" ? formatBytes(item.size_bytes) : "—"}</Cell>
                <Cell>{formatDate(item.created_at)}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
