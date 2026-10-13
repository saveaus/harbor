import type Stripe from "stripe";
import { settleCheckoutSession, syncPayoutAccount } from "@/lib/checkout";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("Stripe isn't configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
      if (event.account) await settleCheckoutSession(event.account, event.data.object.id);
      break;
    case "account.updated":
      await syncPayoutAccount(event.data.object.id);
      break;
    default:
      break;
  }
  return Response.json({ received: true });
}
