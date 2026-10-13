"use server";

import { revalidatePath } from "next/cache";
import { text } from "@/lib/form-data";
import { getWorkspace } from "@/lib/workspace";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export type BrandAsset = "logo" | "banner";
const ASSET_COLUMN = { logo: "logo_path", banner: "portal_banner_path" } as const satisfies Record<BrandAsset, string>;
const assetPath = (kind: BrandAsset) => new RegExp(`^[0-9a-f-]{36}/${kind}-\\d+\\.(png|jpe?g|webp)$`);

export type SaveState = { saved?: boolean; error?: string };

export async function updateBrand(_state: SaveState, form: FormData): Promise<SaveState> {
  const { supabase, workspace, member } = await getWorkspace();
  if (member.role === "member") return { error: "Only workspace owners and admins can change the brand." };
  const name = text(form, "name");
  const accent = text(form, "brand_color");
  const sidebar = text(form, "portal_sidebar_color");
  if (!name || name.length > 30) return { error: "Use a brand name of 1 to 30 characters." };
  if (!HEX_COLOR.test(accent) || !HEX_COLOR.test(sidebar)) return { error: "Colors must be hex values like #2f6fed." };
  const { error } = await supabase
    .from("workspaces")
    .update({ name, brand_color: accent, portal_sidebar_color: sidebar })
    .eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/", "layout");
  return { saved: true };
}

function assetUpdate(kind: BrandAsset, path: string | null) {
  switch (kind) {
    case "logo":
      return { logo_path: path };
    case "banner":
      return { portal_banner_path: path };
    default: {
      const unhandled: never = kind;
      throw new Error(`Unknown brand asset ${String(unhandled)}`);
    }
  }
}

async function replaceAsset(kind: BrandAsset, newPath: string | null) {
  const { supabase, workspace } = await getWorkspace();
  const column = ASSET_COLUMN[kind];
  const previous = workspace[column];
  const { error } = await supabase.from("workspaces").update(assetUpdate(kind, newPath)).eq("id", workspace.id);
  if (error) throw error;
  if (previous && previous !== newPath) {
    const removal = await supabase.storage.from("brand-assets").remove([previous]);
    if (removal.error) throw removal.error;
  }
  revalidatePath("/", "layout");
}

/** The browser uploads the image directly; this records it and removes the previous one. */
export async function setBrandAsset(kind: BrandAsset, path: string) {
  const { workspace } = await getWorkspace();
  if (!assetPath(kind).test(path) || !path.startsWith(`${workspace.id}/`)) throw new Error("Image path is outside this workspace");
  await replaceAsset(kind, path);
}

export async function removeBrandAsset(kind: BrandAsset) {
  await replaceAsset(kind, null);
}
