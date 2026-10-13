"use server";

import { redirect } from "next/navigation";
import { startProductCheckout, type CheckoutResult } from "@/lib/checkout";
import { loadPaymentLink, loadStorefront } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";

function follow(result: CheckoutResult, path: string): never {
  switch (result.kind) {
    case "redirect":
      redirect(result.url);
    case "unavailable":
      redirect(`${path}?error=${encodeURIComponent(result.reason)}`);
    default: {
      const unhandled: never = result;
      throw new Error(`Unhandled checkout result ${JSON.stringify(unhandled)}`);
    }
  }
}

export async function buyFromLink(linkId: string) {
  const path = `/pay/${linkId}`;
  const link = await loadPaymentLink(await createClient(), linkId);
  if (!link) redirect(path);
  follow(
    await startProductCheckout({ workspaceId: link.workspace_id, productId: link.product.id, paymentLinkId: link.id, source: "link", returnPath: path }),
    path,
  );
}

export async function buyFromStore(slug: string, productId: string) {
  const path = `/store/${slug}`;
  const store = await loadStorefront(await createClient(), slug);
  if (!store?.products.some((p) => p.id === productId)) redirect(path);
  follow(
    await startProductCheckout({ workspaceId: store.workspace_id, productId, paymentLinkId: null, source: "store", returnPath: path }),
    path,
  );
}
