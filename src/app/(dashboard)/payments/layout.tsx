import { ChevronDown } from "lucide-react";
import { Menu } from "@/components/menu";
import { PageHeader } from "@/components/ui";
import { listRecipients } from "@/lib/payments";
import { requireApp } from "@/lib/workspace";
import { PaymentsCreateProvider, PaymentsHeaderActions } from "./create-context";
import { PaymentsNav } from "./payments-nav";

export default async function PaymentsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireApp("payments");
  const [products, recipients] = await Promise.all([
    ctx.supabase
      .from("products")
      .select("id, name, amount_cents, currency, billing_interval")
      .eq("workspace_id", ctx.workspace.id)
      .eq("archived", false)
      .order("name"),
    listRecipients(ctx),
  ]);
  if (products.error) throw products.error;

  return (
    <PaymentsCreateProvider products={products.data} recipients={recipients} currency={ctx.workspace.currency}>
      <PageHeader
        title={
          <Menu
            label="Payments options"
            align="start"
            triggerClassName="-ml-2 inline-flex h-7 items-center gap-1.5 rounded-control px-2 text-[13px] font-medium text-black hover:bg-hover"
            trigger={
              <>
                Payments <ChevronDown size={14} />
              </>
            }
            items={[
              { label: "Payout account", href: "/settings/payout-account" },
              { label: "Store settings", href: "/payments/store#settings" },
              { label: "App settings", href: "/apps/manage" },
            ]}
          />
        }
        actions={<PaymentsHeaderActions />}
      />
      <PaymentsNav />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </PaymentsCreateProvider>
  );
}
