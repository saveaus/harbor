import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { formatMoney, intervalLabel } from "@/lib/format";
import { appUrl } from "@/lib/stripe";
import { requireApp } from "@/lib/workspace";
import { setServiceInStore, updateStore } from "../actions";
import { CreateButton } from "../create-context";
import { CardsPreview, PaymentsHero } from "../hero";

export default async function StorePage() {
  const { supabase, workspace } = await requireApp("payments");
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, amount_cents, currency, billing_interval, in_store")
    .eq("workspace_id", workspace.id)
    .eq("archived", false)
    .order("name");
  if (error) throw error;

  if (products.length === 0)
    return (
      <PaymentsHero
        title="Open a storefront for your services"
        body="Let clients, or anyone from your website, buy a service and get access to your portal."
        action={<CreateButton kind="service">Create a service to sell</CreateButton>}
        preview={<CardsPreview />}
      />
    );

  const storeUrl = `${appUrl()}/store/${workspace.slug}`;

  return (
    <div className="w-full max-w-[920px] space-y-6 px-11 py-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-[14px] font-medium">
              Your store <Badge tone={workspace.store_enabled ? "success" : "neutral"}>{workspace.store_enabled ? "Live" : "Off"}</Badge>
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">
              {workspace.store_enabled ? (
                <Link href={`/store/${workspace.slug}`} className="text-link hover:underline">
                  {storeUrl}
                </Link>
              ) : (
                "Turn the store on to publish it at its own link."
              )}
            </p>
          </div>
          {workspace.store_enabled ? <CopyButton value={storeUrl} /> : null}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[14px] font-medium">Services in your store</h2>
        <p className="mt-1 text-[13px] text-ink-3">Buyers can only purchase the services you list here.</p>
        <ul className="mt-4 divide-y divide-line rounded-card border border-line-strong">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
              <span className="flex-1">{p.name}</span>
              <span className="text-ink-3 tabular-nums">
                {formatMoney(p.amount_cents, p.currency)} · {intervalLabel(p.billing_interval)}
              </span>
              <form action={setServiceInStore.bind(null, p.id, !p.in_store)}>
                <Button type="submit" variant={p.in_store ? "secondary" : "primary"}>
                  {p.in_store ? "Remove" : "List"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <form id="settings" action={updateStore} className="space-y-4">
          <h2 className="text-[14px] font-medium">Store settings</h2>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="store_enabled" defaultChecked={workspace.store_enabled} className="size-4 accent-ink" />
            Publish my store
          </label>
          <Field label="Title">
            <Input name="store_title" maxLength={80} defaultValue={workspace.store_title} placeholder={workspace.name} />
          </Field>
          <Field label="Description">
            <Textarea name="store_description" maxLength={500} rows={3} defaultValue={workspace.store_description} />
          </Field>
          <Button type="submit" variant="primary">
            Save store
          </Button>
        </form>
      </Card>
    </div>
  );
}
