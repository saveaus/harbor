"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { buttonClass } from "./ui";

/**
 * A dialog that uploads one file into `<workspace>/<folder>/` and then records it. The record
 * action receives the form's fields plus `storage_path`, `file_name` and `size_bytes`.
 */
export function UploadDialog({
  trigger,
  triggerVariant = "primary",
  title,
  description,
  workspaceId,
  folder,
  accept,
  fileRequired = true,
  action,
  submitLabel = "Upload",
  children,
}: {
  trigger: ReactNode;
  triggerVariant?: "primary" | "secondary" | "ghost";
  title: string;
  description?: string;
  workspaceId: string;
  folder: string;
  accept?: string;
  fileRequired?: boolean;
  action: (form: FormData) => Promise<void>;
  submitLabel?: string;
  children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button type="button" className={buttonClass(triggerVariant)} onClick={() => dialog.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-card border border-line bg-canvas p-0 text-ink shadow-pop"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            const file = form.get("file");
            form.delete("file");
            setError(null);
            startTransition(async () => {
              if (file instanceof File && file.size > 0) {
                const path = `${workspaceId}/${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\- ]+/g, "_")}`;
                const { error: uploadError } = await createClient()
                  .storage.from("workspace-files")
                  .upload(path, file, { contentType: file.type || "application/octet-stream" });
                if (uploadError) {
                  setError(`Couldn't upload ${file.name}: ${uploadError.message}`);
                  return;
                }
                form.set("storage_path", path);
                form.set("file_name", file.name.slice(0, 200));
                form.set("size_bytes", String(file.size));
              } else if (fileRequired) {
                setError("Choose a file to upload.");
                return;
              }
              await action(form);
              formElement.reset();
              dialog.current?.close();
            });
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[14px] font-medium">{title}</h2>
              {description ? <p className="mt-0.5 text-[13px] text-ink-3">{description}</p> : null}
            </div>
            <button type="button" aria-label="Close" className="rounded-control p-1 text-ink-3 hover:bg-hover hover:text-ink" onClick={() => dialog.current?.close()}>
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4 px-5 py-5">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">
                File{fileRequired ? "" : <span className="font-normal text-ink-3"> - optional</span>}
              </span>
              <input
                name="file"
                type="file"
                accept={accept}
                required={fileRequired}
                className="block w-full text-[13px] file:mr-3 file:h-7 file:rounded-control file:border file:border-line-strong file:bg-canvas file:px-2 file:text-[13px]"
              />
            </label>
            {children}
            {error ? (
              <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
            <button type="button" className={buttonClass("secondary")} onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={buttonClass("primary")}>
              {pending ? "Uploading…" : submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
