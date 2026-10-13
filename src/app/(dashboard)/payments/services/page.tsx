import { MoreHorizontal } from "lucide-react";
import { Menu } from "@/components/menu";
import { ActionCell, Badge, Cell, Row, Table } from "@/components/ui";
import { formatMoney, intervalLabel } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { archiveService, setServiceInStore } from "../actions";
import { CreateButton } from "../create-context";
import { CardsPreview, PaymentsHero } from "../hero";

export default async function ServicesPage() {
  const { supabase, workspace } = await requireApp("payments");
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("archived", false)
    .order("name");
  if (error) throw error;

  if (data.length === 0)
    return (
      <PaymentsHero
        title="Build your service catalogue"
        body="Define what you sell once, then reuse it on invoices, subscriptions, payment links and your store."
        action={<CreateButton kind="service">Create service</CreateButton>}
        preview={<CardsPreview />}
      />
    );

  return (
    <div className="pt-2">
      <Table columns={["Service", "Price", "Billing", "Store", ""]}>
        {data.map((product) => (
          <Row key={product.id}>
            <Cell>
              <div>{product.name}</div>
              {product.description ? <div className="max-w-80 truncate text-[12px] text-ink-3">{product.description}</div> : null}
            </Cell>
            <Cell className="tabular-nums">{formatMoney(product.amount_cents, product.currency)}</Cell>
            <Cell>{intervalLabel(product.billing_interval)}</Cell>
            <Cell>{product.in_store ? <Badge tone="success">Listed</Badge> : <span className="text-ink-3">—</span>}</Cell>
            <ActionCell>
              <Menu
                label={`Actions for ${product.name}`}
                triggerClassName="inline-flex size-7 items-center justify-center rounded-control hover:bg-hover"
                trigger={<MoreHorizontal size={16} />}
                items={[
                  {
                    label: product.in_store ? "Remove from store" : "List in store",
                    action: setServiceInStore.bind(null, product.id, !product.in_store),
                  },
                  { label: "Archive service", action: archiveService.bind(null, product.id), danger: true },
                ]}
              />
            </ActionCell>
          </Row>
        ))}
      </Table>
    </div>
  );
}
