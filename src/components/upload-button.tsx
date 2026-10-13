"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";

export type UploadedFile = { name: string; storage_path: string; size_bytes: number; content_type: string };

type UploadTarget = {
  workspaceId: string;
  channelId: string;
  record: (upload: UploadedFile) => Promise<void>;
};

/** Uploads picked files into the channel's storage folder, recording each one after it lands. */
export function useFileUpload({ workspaceId, channelId, record }: UploadTarget) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function upload(files: FileList) {
    const supabase = createClient();
    for (const file of Array.from(files)) {
      setStatus(`Uploading ${file.name}…`);
      const path = `${workspaceId}/${channelId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("workspace-files").upload(path, file, { contentType: file.type });
      if (error) {
        setStatus(`Couldn't upload ${file.name}: ${error.message}`);
        return;
      }
      await record({
        name: file.name,
        storage_path: path,
        size_bytes: file.size,
        content_type: file.type || "application/octet-stream",
      });
    }
    setStatus(null);
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      multiple
      hidden
      onChange={(event) => {
        if (event.target.files?.length) void upload(event.target.files);
        event.target.value = "";
      }}
    />
  );

  return { open: () => inputRef.current?.click(), input, status };
}

export function UploadButton(target: UploadTarget) {
  const { open, input, status } = useFileUpload(target);
  return (
    <>
      {status ? <span className="text-[12px] text-ink-3">{status}</span> : null}
      <button type="button" className={buttonClass("primary")} onClick={open}>
        <Upload size={14} /> Upload
      </button>
      {input}
    </>
  );
}
