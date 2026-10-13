"use client";

import { formatRelative } from "@/lib/format";

export function RelativeTime({ value, className }: { value: string; className?: string }) {
  return (
    <time dateTime={value} className={className} suppressHydrationWarning>
      {formatRelative(value)}
    </time>
  );
}
