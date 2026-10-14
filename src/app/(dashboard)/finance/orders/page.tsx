import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { requireApp } from "@/lib/workspace";

export default async function OrdersPage() {
  await requireApp("finance");
  return (
    <div className="py-2">
      <div className="px-9 pt-5">
        <h1 className="text-[16px] font-medium">Orders</h1>
        <p className="mt-1 text-[13px] text-ink-3">Client purchases. Billing an order creates a billable entry.</p>
      </div>
      <EmptyState icon={<ShoppingBag size={18} />} title="No orders yet" body="Purchases for a participant show up here. Once an order is billed, it joins the other billable entries." />
    </div>
  );
}
