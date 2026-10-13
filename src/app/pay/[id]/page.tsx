import { Suspense } from "react";
import { notFound } from "next/navigation";
import { buyFromLink } from "@/app/checkout-actions";
import { PublicShell } from "@/components/public-shell";
import { Alert, Button, Card } from "@/components/ui";
import { formatMoney, priceLabel } from "@/lib/format";
import { loadPaymentLink } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default function PaymentLinkPage(props: Props) {
  return (
    <Suspense>
      <PaymentLink {...props} />
    </Suspense>
  );
}

async function PaymentLink({ params, searchParams }: Props) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const link = await loadPaymentLink(await createClient(), id);
  if (!link) notFound();
  const { product } = link;

  return (
    <PublicShell name={link.workspace_name} color={link.brand_color} logoPath={link.logo_path}>
      <Card className="mx-auto max-w-[440px] p-6">
        <p className="text-[13px] text-ink-3">{link.name}</p>
        <h1 className="mt-1 text-[20px] font-medium text-ink">{product.name}</h1>
        {product.description ? <p className="mt-2 text-[14px] whitespace-pre-wrap text-ink-3">{product.description}</p> : null}
        <p className="mt-5 text-[24px] font-medium text-ink tabular-nums">
          {priceLabel(product.amount_cents, product.currency, product.billing_interval)}
        </p>
        {error ? (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        <form action={buyFromLink.bind(null, link.id)} className="mt-6">
          <Button type="submit" variant="primary" className="h-9 w-full justify-center">
            {product.billing_interval === "one_time" ? `Pay ${formatMoney(product.amount_cents, product.currency)}` : "Subscribe"}
          </Button>
        </form>
      </Card>
    </PublicShell>
  );
}
