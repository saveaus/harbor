import type Stripe from "stripe";
import { invoiceNumber } from "./payments";
import { appUrl, getStripe } from "./stripe";
import { notifyAsSystem } from "./notify";
import { getAdminClient, type AdminSupabase } from "./supabase/admin";

export type CheckoutResult = { kind: "redirect"; url: string } | { kind: "unavailable"; reason: string };

type Ready = { stripe: Stripe; admin: AdminSupabase; accountId: string };

const NOT_READY = "Online payment isn't set up for this business yet. Contact them to arrange another way to pay.";

/** Stripe, the admin client and the workspace's connected account, when all are ready to take payments. */
async function readyToCharge(workspaceId: string): Promise<Ready | null> {
  const stripe = getStripe();
  const admin = getAdminClient();
  if (!stripe || !admin) return null;
  const { data, error } = await admin
    .from("payout_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data?.charges_enabled ? { stripe, admin, accountId: data.stripe_account_id } : null;
}

type SessionMetadata = { harbor_kind: "invoice" | "order"; harbor_id: string; workspace_id: string };

export async function startInvoiceCheckout(input: {
  workspaceId: string;
  invoiceId: string;
  number: number;
  currency: string;
  customerEmail: string | null;
  items: { description: string; quantity: number; unit_amount_cents: number }[];
  returnPath: string;
}): Promise<CheckoutResult> {
  const ready = await readyToCharge(input.workspaceId);
  if (!ready) return { kind: "unavailable", reason: NOT_READY };
  const metadata: SessionMetadata = { harbor_kind: "invoice", harbor_id: input.invoiceId, workspace_id: input.workspaceId };
  const session = await ready.stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: input.items.map((item) => ({
        quantity: item.quantity,
        price_data: { currency: input.currency, unit_amount: item.unit_amount_cents, product_data: { name: item.description } },
      })),
      customer_email: input.customerEmail ?? undefined,
      metadata,
      payment_intent_data: { description: invoiceNumber(input.number), metadata },
      success_url: `${appUrl()}${input.returnPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}${input.returnPath}`,
    },
    { stripeAccount: ready.accountId },
  );
  const { error } = await ready.admin
    .from("invoices")
    .update({ stripe_checkout_session_id: session.id })
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.invoiceId);
  if (error) throw error;
  return session.url ? { kind: "redirect", url: session.url } : { kind: "unavailable", reason: NOT_READY };
}

/** Starts a purchase of a service from the store or a payment link. Prices always come from the database. */
export async function startProductCheckout(input: {
  workspaceId: string;
  productId: string;
  paymentLinkId: string | null;
  source: "store" | "link";
  returnPath: string;
}): Promise<CheckoutResult> {
  const ready = await readyToCharge(input.workspaceId);
  if (!ready) return { kind: "unavailable", reason: NOT_READY };
  const { data: product, error } = await ready.admin
    .from("products")
    .select("id, name, description, amount_cents, currency, billing_interval, in_store, archived")
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.productId)
    .maybeSingle();
  if (error) throw error;
  if (!product || product.archived || (input.source === "store" && !product.in_store))
    return { kind: "unavailable", reason: "This service is no longer available." };

  const { data: order, error: orderError } = await ready.admin
    .from("orders")
    .insert({
      workspace_id: input.workspaceId,
      product_id: product.id,
      payment_link_id: input.paymentLinkId,
      source: input.source,
      product_name: product.name,
      amount_cents: product.amount_cents,
      currency: product.currency,
    })
    .select("id")
    .single();
  if (orderError) throw orderError;

  const metadata: SessionMetadata = { harbor_kind: "order", harbor_id: order.id, workspace_id: input.workspaceId };
  const recurring = product.billing_interval === "month" || product.billing_interval === "year" ? { interval: product.billing_interval } : undefined;
  const session = await ready.stripe.checkout.sessions.create(
    {
      mode: recurring ? "subscription" : "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.amount_cents,
            recurring,
            product_data: { name: product.name, description: product.description || undefined },
          },
        },
      ],
      metadata,
      ...(recurring ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
      success_url: `${appUrl()}${input.returnPath}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}${input.returnPath}`,
    },
    { stripeAccount: ready.accountId },
  );
  const { error: linkError } = await ready.admin.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
  if (linkError) throw linkError;
  return session.url ? { kind: "redirect", url: session.url } : { kind: "unavailable", reason: NOT_READY };
}

export type SettleOutcome = "paid" | "pending" | "expired" | "unknown";

function readMetadata(metadata: Stripe.Metadata | null): SessionMetadata | null {
  const kind = metadata?.harbor_kind;
  const id = metadata?.harbor_id;
  const workspaceId = metadata?.workspace_id;
  if ((kind !== "invoice" && kind !== "order") || !id || !workspaceId) return null;
  return { harbor_kind: kind, harbor_id: id, workspace_id: workspaceId };
}

/**
 * Records the result of a Checkout Session after re-reading it from Stripe. Safe to call repeatedly from the
 * webhook and the return page: rows only move out of open/pending once, and only for the workspace that owns
 * the connected account the session belongs to.
 */
export async function settleCheckoutSession(accountId: string, sessionId: string): Promise<SettleOutcome> {
  const stripe = getStripe();
  const admin = getAdminClient();
  if (!stripe || !admin) return "unknown";

  const { data: account, error: accountError } = await admin
    .from("payout_accounts")
    .select("workspace_id")
    .eq("stripe_account_id", accountId)
    .maybeSingle();
  if (accountError) throw accountError;
  if (!account) return "unknown";

  const session = await stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: accountId });
  const metadata = readMetadata(session.metadata);
  if (!metadata || metadata.workspace_id !== account.workspace_id) return "unknown";

  const paid = session.status === "complete" && session.payment_status !== "unpaid";
  const now = new Date().toISOString();

  if (metadata.harbor_kind === "invoice") {
    if (!paid) return session.status === "expired" ? "expired" : "pending";
    const { data, error } = await admin
      .from("invoices")
      .update({ status: "paid", paid_at: now })
      .eq("workspace_id", metadata.workspace_id)
      .eq("id", metadata.harbor_id)
      .eq("status", "open")
      .select("number")
      .maybeSingle();
    if (error) throw error;
    if (data)
      await notifyAsSystem(admin, metadata.workspace_id, {
        topic: "payments",
        title: `${invoiceNumber(data.number)} was paid`,
        body: "Paid online by card.",
        href: `/payments/invoices/${metadata.harbor_id}`,
      });
    return "paid";
  }

  if (!paid) {
    if (session.status !== "expired") return "pending";
    const { error } = await admin
      .from("orders")
      .update({ status: "expired" })
      .eq("workspace_id", metadata.workspace_id)
      .eq("id", metadata.harbor_id)
      .eq("status", "pending");
    if (error) throw error;
    return "expired";
  }

  const { data, error } = await admin
    .from("orders")
    .update({
      status: "paid",
      paid_at: now,
      customer_email: session.customer_details?.email ?? null,
      customer_name: session.customer_details?.name ?? null,
    })
    .eq("workspace_id", metadata.workspace_id)
    .eq("id", metadata.harbor_id)
    .eq("status", "pending")
    .select("product_name, source, customer_email")
    .maybeSingle();
  if (error) throw error;
  if (data)
    await notifyAsSystem(admin, metadata.workspace_id, {
      topic: "payments",
      title: `New ${data.source === "store" ? "store" : "payment link"} order: ${data.product_name}`,
      body: data.customer_email ? `Purchased by ${data.customer_email}.` : undefined,
      href: "/payments",
    });
  return "paid";
}

/** Settles a session a buyer returned from, without waiting for the webhook. */
export async function settleReturnedSession(workspaceId: string, sessionId: string): Promise<SettleOutcome> {
  const admin = getAdminClient();
  if (!admin || !sessionId.startsWith("cs_")) return "unknown";
  const { data, error } = await admin.from("payout_accounts").select("stripe_account_id").eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw error;
  return data ? settleCheckoutSession(data.stripe_account_id, sessionId) : "unknown";
}

/** Re-reads a connected account from Stripe and stores its onboarding state. */
export async function syncPayoutAccount(accountId: string): Promise<void> {
  const stripe = getStripe();
  const admin = getAdminClient();
  if (!stripe || !admin) return;
  const account = await stripe.accounts.retrieve(accountId);
  const { error } = await admin
    .from("payout_accounts")
    .update({
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", accountId);
  if (error) throw error;
}
