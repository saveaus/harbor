import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckoutOutcome } from "@/components/checkout-outcome";
import { PublicShell } from "@/components/public-shell";
import { settleReturnedSession } from "@/lib/checkout";
import { loadPaymentLink } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ session_id?: string }> };

export default function PaymentLinkSuccessPage(props: Props) {
  return (
    <Suspense>
      <PaymentLinkSuccess {...props} />
    </Suspense>
  );
}

async function PaymentLinkSuccess({ params, searchParams }: Props) {
  const [{ id }, { session_id: sessionId }] = await Promise.all([params, searchParams]);
  const link = await loadPaymentLink(await createClient(), id);
  if (!link) notFound();
  const outcome = sessionId ? await settleReturnedSession(link.workspace_id, sessionId) : "unknown";
  return (
    <PublicShell name={link.workspace_name} color={link.brand_color} logoPath={link.logo_path}>
      <CheckoutOutcome outcome={outcome} business={link.workspace_name} item={link.product.name} backHref={`/pay/${link.id}`} />
    </PublicShell>
  );
}
