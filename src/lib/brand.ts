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

export function logoUrl(path: string | null): string | null {
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/brand-assets/${path.split("/").map(encodeURIComponent).join("/")}`;
}
