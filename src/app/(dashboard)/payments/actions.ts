"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cents, text } from "@/lib/form-data";
import { notify } from "@/lib/notify";
import { invoiceNumber, parseRecipient } from "@/lib/payments";
import { requireApp } from "@/lib/workspace";

const INTERVALS = new Set(["one_time", "month", "year"]);

export async function createService(form: FormData) {
  const { supabase, workspace } = await requireApp("payments");
  const interval = text(form, "billing_interval");
  if (!INTERVALS.has(interval)) throw new Error("Unknown billing interval");
  const { error } = await supabase.from("products").insert({
    workspace_id: workspace.id,
    name: text(form, "name"),
    description: text(form, "description"),
    amount_cents: cents(form, "amount"),
    currency: workspace.currency,
    billing_interval: interval,
  });
  if (error) throw error;
  revalidatePath("/payments", "layout");
}

export async function archiveService(productId: string) {
  const { supabase, workspace } = await requireApp("payments");
  const { error } = await supabase
    .from("products")
    .update({ archived: true })
    .eq("workspace_id", workspace.id)
    .eq("id", productId);
  if (error) throw error;
  revalidatePath("/payments", "layout");
}

export type InvoiceDraft = {
  recipient: string;
  dueDate: string;
  memo: string;
  collection: "send_invoice" | "charge_automatically";
  items: { description: string; quantity: number; unitAmountCents: number; productId: string | null }[];
};

/** Redirects to the new invoice on success; returns only expected validation failures. */
export async function createInvoice(draft: InvoiceDraft): Promise<{ error: string }> {
  const { supabase, workspace } = await requireApp("payments");
  const items = draft.items.filter((item) => item.description.trim() && item.quantity > 0);
  if (items.length === 0) return { error: "Add at least one line item." };
  for (const item of items)
    if (!Number.isInteger(item.quantity) || !Number.isInteger(item.unitAmountCents) || item.unitAmountCents < 0)
      return { error: "Each line item needs a quantity and a price." };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      workspace_id: workspace.id,
      ...parseRecipient(draft.recipient),
      currency: workspace.currency,
      due_date: draft.dueDate || null,
      memo: draft.memo.trim(),
      collection: draft.collection,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: itemError } = await supabase.from("invoice_items").insert(
    items.map((item) => ({
      workspace_id: workspace.id,
      invoice_id: invoice.id,
      product_id: item.productId,
      description: item.description.trim(),
      quantity: item.quantity,
      unit_amount_cents: item.unitAmountCents,
    })),
  );
  if (itemError) {
    await supabase.from("invoices").delete().eq("id", invoice.id);
    throw itemError;
  }
  revalidatePath("/payments", "layout");
  redirect(`/payments/invoices/${invoice.id}`);
}

export async function setInvoiceStatus(invoiceId: string, status: "paid" | "void") {
  const ctx = await requireApp("payments");
  const { data, error } = await ctx.supabase
    .from("invoices")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", invoiceId)
    .eq("status", "open")
    .select("number")
    .maybeSingle();
  if (error) throw error;
  if (data && status === "paid")
    await notify(ctx, {
      title: `${invoiceNumber(data.number)} was paid`,
      body: "Payment was recorded manually.",
      href: `/payments/invoices/${invoiceId}`,
    });
  revalidatePath("/", "layout");
}

export async function createSubscription(form: FormData) {
  const { supabase, workspace } = await requireApp("payments");
  const { error } = await supabase.from("subscriptions").insert({
    workspace_id: workspace.id,
    product_id: text(form, "product_id"),
    ...parseRecipient(text(form, "recipient")),
  });
  if (error) throw error;
  revalidatePath("/payments", "layout");
}

export async function cancelSubscription(subscriptionId: string) {
  const { supabase, workspace } = await requireApp("payments");
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", subscriptionId);
  if (error) throw error;
  revalidatePath("/payments", "layout");
}

export async function createPaymentLink(form: FormData) {
  const { supabase, workspace } = await requireApp("payments");
  const { error } = await supabase.from("payment_links").insert({
    workspace_id: workspace.id,
    product_id: text(form, "product_id"),
    name: text(form, "name"),
  });
  if (error) throw error;
  revalidatePath("/payments", "layout");
}

export async function togglePaymentLink(linkId: string, active: boolean) {
  const { supabase, workspace } = await requireApp("payments");
  const { error } = await supabase
    .from("payment_links")
    .update({ active })
    .eq("workspace_id", workspace.id)
    .eq("id", linkId);
  if (error) throw error;
  revalidatePath("/payments", "layout");
}

export async function setServiceInStore(productId: string, inStore: boolean) {
  const { supabase, workspace } = await requireApp("payments");
  const { error } = await supabase
    .from("products")
    .update({ in_store: inStore })
    .eq("workspace_id", workspace.id)
    .eq("id", productId);
  if (error) throw error;
  revalidatePath("/payments", "layout");
}

export async function updateStore(form: FormData) {
  const { supabase, workspace } = await requireApp("payments");
  const { error } = await supabase
    .from("workspaces")
    .update({
      store_enabled: form.get("store_enabled") === "on",
      store_title: text(form, "store_title").slice(0, 80),
      store_description: text(form, "store_description").slice(0, 500),
    })
    .eq("id", workspace.id);
  if (error) throw error;
  revalidatePath("/payments", "layout");
}
