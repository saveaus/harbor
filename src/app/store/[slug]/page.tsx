import { Suspense } from "react";
import { notFound } from "next/navigation";
import { buyFromStore } from "@/app/checkout-actions";
import { PublicShell } from "@/components/public-shell";
import { Alert, Button, Card } from "@/components/ui";
import { priceLabel } from "@/lib/format";
import { loadStorefront } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export default function StorePage(props: Props) {
  return (
    <Suspense>
      <Store {...props} />
    </Suspense>
  );
}

async function Store({ params, searchParams }: Props) {
  const [{ slug }, { error }] = await Promise.all([params, searchParams]);
  const store = await loadStorefront(await createClient(), slug);
  if (!store) notFound();

  return (
    <PublicShell name={store.name} color={store.brand_color} logoPath={store.logo_path}>
      <h1 className="text-[24px] font-medium text-ink">{store.title || store.name}</h1>
      {store.description ? <p className="mt-2 max-w-[600px] text-[14px] whitespace-pre-wrap text-ink-3">{store.description}</p> : null}
      {error ? (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {store.products.length === 0 ? (
        <p className="mt-8 text-[14px] text-ink-3">Nothing is for sale right now. Check back soon.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {store.products.map((product) => (
            <li key={product.id}>
              <Card className="flex h-full flex-col p-5">
                <h2 className="text-[15px] font-medium text-ink">{product.name}</h2>
                {product.description ? <p className="mt-1 flex-1 text-[13px] whitespace-pre-wrap text-ink-3">{product.description}</p> : <div className="flex-1" />}
                <p className="mt-4 text-[16px] font-medium text-ink tabular-nums">
                  {priceLabel(product.amount_cents, product.currency, product.billing_interval)}
                </p>
                <form action={buyFromStore.bind(null, slug, product.id)} className="mt-4">
                  <Button type="submit" variant="primary" className="w-full justify-center">
                    {product.billing_interval === "one_time" ? "Buy" : "Subscribe"}
                  </Button>
                </form>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}
