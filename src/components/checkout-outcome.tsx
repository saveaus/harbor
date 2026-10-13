import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Card } from "./ui";
import type { SettleOutcome } from "@/lib/checkout";

export function CheckoutOutcome({
  outcome,
  business,
  item,
  backHref,
}: {
  outcome: SettleOutcome;
  business: string;
  item: string;
  backHref: string;
}) {
  const paid = outcome === "paid";
  return (
    <Card className="mx-auto max-w-[440px] p-6 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-hover">
        {paid ? <CheckCircle2 size={18} className="text-success" /> : <Clock size={18} className="text-ink-3" />}
      </span>
      <h1 className="mt-4 text-[20px] font-medium text-ink">{paid ? "Payment received" : "We're confirming your payment"}</h1>
      <p className="mt-2 text-[14px] text-ink-3">
        {paid
          ? `Thanks for purchasing ${item}. ${business} has been notified and Stripe has emailed your receipt.`
          : `This can take a moment. ${business} will be notified as soon as Stripe confirms it.`}
      </p>
      <Link href={backHref} className="mt-5 inline-block text-[13px] text-link hover:underline">
        Back
      </Link>
    </Card>
  );
}
