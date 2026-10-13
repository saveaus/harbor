export type CheckoutRequest = {
  invoiceId: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  returnUrl: string;
};

export type CheckoutResult = { kind: "redirect"; url: string } | { kind: "unavailable"; reason: string };

export type ProcessorStatus = { connected: false } | { connected: true; provider: "stripe"; accountName: string };

/** No processor is connected yet. Stripe Checkout plugs in here; callers already handle every result. */
export function processorStatus(): ProcessorStatus {
  return { connected: false };
}

export async function startCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
  return {
    kind: "unavailable",
    reason: `Online payment isn't available yet for ${request.invoiceNumber}. Send us a message and we'll arrange another way to pay.`,
  };
}
