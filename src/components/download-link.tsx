"use client";

export function DownloadLink({
  storagePath,
  name,
  getUrl,
}: {
  storagePath: string;
  name: string;
  getUrl: (storagePath: string) => Promise<string>;
}) {
  return (
    <button
      type="button"
      className="relative z-10 truncate text-left font-medium text-ink hover:underline"
      onClick={async () => window.open(await getUrl(storagePath), "_blank", "noopener")}
    >
      {name}
    </button>
  );
}
