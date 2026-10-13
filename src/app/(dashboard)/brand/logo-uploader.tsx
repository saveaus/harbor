"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { buttonClass } from "@/components/ui";
import { LOGO_MAX_BYTES, LOGO_TYPES } from "@/lib/brand";
import { createClient } from "@/lib/supabase/browser";

const extensions: Record<(typeof LOGO_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function isLogoType(type: string): type is (typeof LOGO_TYPES)[number] {
  return (LOGO_TYPES as readonly string[]).includes(type);
}

export function LogoUploader({
  workspaceId,
  name,
  color,
  logoUrl,
  setLogo,
  removeLogo,
}: {
  workspaceId: string;
  name: string;
  color: string;
  logoUrl: string | null;
  setLogo: (path: string) => Promise<void>;
  removeLogo: () => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function upload(file: File) {
    if (!isLogoType(file.type)) return setStatus("Use a PNG, JPEG or WebP image.");
    if (file.size > LOGO_MAX_BYTES) return setStatus("Logos can be up to 2 MB.");
    setStatus("Uploading…");
    const path = `${workspaceId}/logo-${Date.now()}.${extensions[file.type]}`;
    const { error } = await createClient().storage.from("brand-assets").upload(path, file, { contentType: file.type });
    if (error) return setStatus(`Couldn't upload: ${error.message}`);
    await setLogo(path);
    setStatus(null);
  }

  return (
    <div className="flex items-center gap-3">
      <BrandMark name={name} color={color} logoUrl={logoUrl} size="lg" />
      <button type="button" className={buttonClass("secondary")} onClick={() => input.current?.click()}>
        <ImageUp size={14} /> {logoUrl ? "Replace" : "Upload logo"}
      </button>
      {logoUrl ? (
        <button type="button" className={buttonClass("ghost")} onClick={() => void removeLogo()}>
          <Trash2 size={14} /> Remove
        </button>
      ) : null}
      {status ? <span className="text-[12px] text-ink-3">{status}</span> : null}
      <input
        ref={input}
        type="file"
        accept={LOGO_TYPES.join(",")}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
