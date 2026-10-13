import { MoreHorizontal } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Menu } from "@/components/menu";
import { ActionCell, Badge, Cell, Row, Table } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { appUrl } from "@/lib/stripe";
import { requireApp } from "@/lib/workspace";
import { togglePaymentLink } from "../actions";
import { CreateButton } from "../create-context";
import { DocumentPreview, PaymentsHero } from "../hero";

export default async function PaymentLinksPage() {
  const { supabase, workspace } = await requireApp("payments");
  const { data, error } = await supabase
    .from("payment_links")
    .select("id, name, active, created_at, product:products(name, amount_cents, currency)")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  if (data.length === 0)
    return (
      <PaymentsHero
        title="Share a link, get paid"
        body="Create a secure checkout link for any service. Buyers pay in a couple of clicks on any device."
        action={<CreateButton kind="link">Create payment link</CreateButton>}
        preview={<DocumentPreview heading="Checkout" />}
      />
    );

  return (
    <div className="pt-2">
      <Table columns={["Link", "Service", "Price", "Status", "Created", "", ""]}>
        {data.map((link) => (
          <Row key={link.id}>
            <Cell>{link.name}</Cell>
            <Cell>{link.product?.name ?? "—"}</Cell>
            <Cell className="tabular-nums">{link.product ? formatMoney(link.product.amount_cents, link.product.currency) : "—"}</Cell>
            <Cell>
              <Badge tone={link.active ? "success" : "neutral"}>{link.active ? "Active" : "Inactive"}</Badge>
            </Cell>
            <Cell>{formatDate(link.created_at)}</Cell>
            <Cell className="w-28 text-right">{link.active ? <CopyButton value={`${appUrl()}/pay/${link.id}`} /> : null}</Cell>
            <ActionCell>
              <Menu
                label={`Actions for ${link.name}`}
                triggerClassName="inline-flex size-7 items-center justify-center rounded-control hover:bg-hover"
                trigger={<MoreHorizontal size={16} />}
                items={[
                  ...(link.active ? [{ label: "Open checkout page", href: `/pay/${link.id}` }] : []),
                  { label: link.active ? "Deactivate" : "Activate", action: togglePaymentLink.bind(null, link.id, !link.active) },
                ]}
              />
            </ActionCell>
          </Row>
        ))}
      </Table>
    </div>
  );
}
