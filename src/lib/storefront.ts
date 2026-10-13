import { z } from "zod";
import type { ServerSupabase } from "./supabase/server";

const product = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  amount_cents: z.number().int(),
  currency: z.string(),
  billing_interval: z.string(),
});

const storefront = z.object({
  workspace_id: z.string(),
  name: z.string(),
  brand_color: z.string(),
  logo_path: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  products: z.array(product),
});

const paymentLink = z.object({
  id: z.string(),
  workspace_id: z.string(),
  workspace_name: z.string(),
  brand_color: z.string(),
  logo_path: z.string().nullable(),
  name: z.string(),
  product,
});

export type PublicProduct = z.infer<typeof product>;
export type Storefront = z.infer<typeof storefront>;
export type PublicPaymentLink = z.infer<typeof paymentLink>;

/** Published store for a slug, or null when it doesn't exist or isn't enabled. */
export async function loadStorefront(supabase: ServerSupabase, slug: string): Promise<Storefront | null> {
  const { data, error } = await supabase.rpc("storefront", { store_slug: slug });
  if (error) throw error;
  return data === null ? null : storefront.parse(data);
}

/** Active payment link, or null when it doesn't exist, is inactive, or its service is archived. */
export async function loadPaymentLink(supabase: ServerSupabase, id: string): Promise<PublicPaymentLink | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = await supabase.rpc("payment_link", { link_id: id });
  if (error) throw error;
  return data === null ? null : paymentLink.parse(data);
}
