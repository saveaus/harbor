"use client";

import { useRef } from "react";
import { FolderPlus, Link2, Plus, Upload } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Menu } from "@/components/menu";
import { Field, Input, buttonClass } from "@/components/ui";
import { useFileUpload, type UploadedFile } from "@/components/upload-button";

export function NewItemMenu({
  workspaceId,
  channelId,
  parentId,
  createFolder,
  addLink,
  recordUpload,
}: {
  workspaceId: string;
  channelId: string;
  parentId: string | null;
  createFolder: (form: FormData) => Promise<void>;
  addLink: (form: FormData) => Promise<void>;
  recordUpload: (upload: UploadedFile) => Promise<void>;
}) {
  const folderDialog = useRef<HTMLDialogElement>(null);
  const linkDialog = useRef<HTMLDialogElement>(null);
  const upload = useFileUpload({ workspaceId, channelId, record: recordUpload });
  const parentField = parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null;

  return (
    <div className="flex items-center gap-2">
      {upload.status ? <span className="text-[12px] text-ink-3">{upload.status}</span> : null}
      <Menu
        label="New"
        align="start"
        triggerClassName={buttonClass("primary")}
        trigger={
          <>
            <Plus /> New
          </>
        }
        items={[
          {
            label: (
              <>
                <Upload /> Upload files
              </>
            ),
            onSelect: upload.open,
          },
          {
            label: (
              <>
                <FolderPlus /> New folder
              </>
            ),
            onSelect: () => folderDialog.current?.showModal(),
          },
          {
            label: (
              <>
                <Link2 /> Add link
              </>
            ),
            onSelect: () => linkDialog.current?.showModal(),
          },
        ]}
      />
      {upload.input}
      <FormDialog dialogRef={folderDialog} title="New folder" action={createFolder} submitLabel="Create folder">
        {parentField}
        <Field label="Folder name">
          <Input name="name" required maxLength={255} />
        </Field>
      </FormDialog>
      <FormDialog
        dialogRef={linkDialog}
        title="Add a link"
        description="Share a document or page that lives somewhere else."
        action={addLink}
        submitLabel="Add link"
      >
        {parentField}
        <Field label="URL">
          <Input name="url" type="url" required placeholder="https://" />
        </Field>
        <Field label="Label" hint="Defaults to the site's address.">
          <Input name="name" maxLength={255} />
        </Field>
      </FormDialog>
    </div>
  );
}
