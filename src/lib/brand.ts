import type { CSSProperties } from "react";
import { supabaseUrl } from "@/lib/supabase/env";

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Re-points the theme's accent tokens at a workspace brand color for everything inside the element. */
export function brandAccentStyle(color: string): CSSProperties {
  return {
    "--color-accent": color,
    "--color-accent-hover": `color-mix(in srgb, ${color} 88%, black)`,
    "--color-accent-soft": `color-mix(in srgb, ${color} 10%, white)`,
  } as CSSProperties;
}

/** Public URL of a logo or banner in the brand-assets bucket. */
export function brandAssetUrl(path: string | null): string | null {
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/brand-assets/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Dark or light text, whichever reads better on the given hex background. */
export function readableTextColor(background: string): string {
  const hex = background.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminance > 0.45 ? "#18181b" : "#ffffff";
}
