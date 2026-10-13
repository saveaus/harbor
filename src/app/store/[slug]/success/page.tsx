import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckoutOutcome } from "@/components/checkout-outcome";
import { PublicShell } from "@/components/public-shell";
import { settleReturnedSession } from "@/lib/checkout";
import { loadStorefront } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ session_id?: string }> };

export default function StoreSuccessPage(props: Props) {
  return (
    <Suspense>
      <StoreSuccess {...props} />
    </Suspense>
  );
}

async function StoreSuccess({ params, searchParams }: Props) {
  const [{ slug }, { session_id: sessionId }] = await Promise.all([params, searchParams]);
  const store = await loadStorefront(await createClient(), slug);
  if (!store) notFound();
  const outcome = sessionId ? await settleReturnedSession(store.workspace_id, sessionId) : "unknown";
  return (
    <PublicShell name={store.name} color={store.brand_color} logoPath={store.logo_path}>
      <CheckoutOutcome outcome={outcome} business={store.name} item="your order" backHref={`/store/${slug}`} />
    </PublicShell>
  );
}
