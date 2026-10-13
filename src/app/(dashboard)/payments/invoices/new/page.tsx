import { listRecipients } from "@/lib/payments";
import { requireApp } from "@/lib/workspace";
import { InvoiceEditor } from "./invoice-editor";

export default async function NewInvoicePage() {
  const ctx = await requireApp("payments");
  const [recipients, products] = await Promise.all([
    listRecipients(ctx),
    ctx.supabase
      .from("products")
      .select("id, name, amount_cents")
      .eq("workspace_id", ctx.workspace.id)
      .eq("archived", false)
      .order("name"),
  ]);
  if (products.error) throw products.error;
  return <InvoiceEditor recipients={recipients} products={products.data} businessName={ctx.workspace.legal_name || ctx.workspace.name} />;
}
