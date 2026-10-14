"use client";

import { useTransition, type ReactNode } from "react";
import { signedFileUrl } from "@/app/(dashboard)/document-actions";

/** Opens a stored file through a short-lived signed URL, in a new tab or as a download. */
export function FileLink({
  path,
  download,
  className,
  label,
  children,
}: {
  path: string;
  download?: boolean;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      className={className}
      onClick={() => {
        const opened = download ? null : window.open("", "_blank");
        startTransition(async () => {
          const url = await signedFileUrl(path, download ?? false);
          if (opened) opened.location.href = url;
          else window.location.assign(url);
        });
      }}
    >
      {children}
    </button>
  );
}
