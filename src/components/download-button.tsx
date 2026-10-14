"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "./ui";

function filename(disposition: string | null): string {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? "download.csv";
}

/** POSTs to a route that records the download, saves the file, then refreshes the page. */
export function DownloadButton({
  href,
  label,
  disabled,
  variant = "secondary",
}: {
  href: string;
  label: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const download = () =>
    startTransition(async () => {
      setError(null);
      const response = await fetch(href, { method: "POST" });
      if (!response.ok) {
        setError((await response.text()) || "The download failed.");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename(response.headers.get("Content-Disposition"));
      link.click();
      URL.revokeObjectURL(url);
      router.refresh();
    });

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" className={buttonClass(variant)} disabled={disabled || pending} onClick={download}>
        <Download size={14} /> {pending ? "Preparing…" : label}
      </button>
      {error ? <span className="max-w-72 text-right text-[12px] whitespace-pre-line text-danger">{error}</span> : null}
    </span>
  );
}
