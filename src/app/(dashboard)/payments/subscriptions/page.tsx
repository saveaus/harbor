import { MoreHorizontal } from "lucide-react";
import { Menu } from "@/components/menu";
import { ActionCell, Badge, Cell, Row, Table } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { recipientName } from "@/lib/payments";
import { requireApp } from "@/lib/workspace";
import { cancelSubscription } from "../actions";
import { CreateButton } from "../create-context";
import { DocumentPreview, PaymentsHero } from "../hero";

export default async function SubscriptionsPage() {
  const { supabase, workspace } = await requireApp("payments");
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, status, started_at, canceled_at, product:products(name, amount_cents, currency, billing_interval), company:companies(name), contact:contacts(first_name, last_name, email)",
    )
    .eq("workspace_id", workspace.id)
    .order("started_at", { ascending: false });
  if (error) throw error;

  if (data.length === 0)
    return (
      <PaymentsHero
        title="Turn ongoing work into recurring revenue"
        body="Bill clients automatically every month or year. Ideal for retainers and long-running engagements."
        action={<CreateButton kind="subscription">Create subscription</CreateButton>}
        preview={<DocumentPreview heading="New subscription" />}
      />
    );

  return (
    <div className="pt-2">
      <Table columns={["Client", "Service", "Price", "Status", "Started", ""]}>
        {data.map((s) => (
          <Row key={s.id}>
            <Cell>{recipientName(s)}</Cell>
            <Cell>{s.product?.name ?? "—"}</Cell>
            <Cell className="tabular-nums">
              {s.product ? `${formatMoney(s.product.amount_cents, s.product.currency)} / ${s.product.billing_interval}` : "—"}
            </Cell>
            <Cell>
              <Badge tone={s.status === "active" ? "success" : "neutral"}>
                {s.status === "active" ? "Active" : `Canceled ${formatDate(s.canceled_at)}`}
              </Badge>
            </Cell>
            <Cell>{formatDate(s.started_at)}</Cell>
            <ActionCell>
              {s.status === "active" ? (
                <Menu
                  label={`Actions for ${recipientName(s)}'s subscription`}
                  triggerClassName="inline-flex size-7 items-center justify-center rounded-control hover:bg-hover"
                  trigger={<MoreHorizontal size={16} />}
                  items={[{ label: "Cancel subscription", action: cancelSubscription.bind(null, s.id), danger: true }]}
                />
              ) : null}
            </ActionCell>
          </Row>
        ))}
      </Table>
    </div>
  );
}
