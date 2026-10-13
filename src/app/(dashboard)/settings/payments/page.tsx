import { CreditCard } from "lucide-react";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { processorStatus } from "@/lib/payment-processor";

export default function PaymentSettingsPage() {
  const status = processorStatus();
  return (
    <section>
      <SectionTitle title="Payment processor" description="Lets clients pay invoices from the portal." />
      <Card className="flex items-center gap-3 p-4">
        <span className="flex size-8 items-center justify-center rounded-control border border-line text-ink-3">
          <CreditCard size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium">Stripe</div>
          <div className="text-[12px] text-ink-3">
            {status.connected ? `Connected to ${status.accountName}` : "Not connected. Clients see a message asking them to arrange payment with you."}
          </div>
        </div>
        <Badge tone={status.connected ? "success" : "neutral"}>{status.connected ? "Connected" : "Not connected"}</Badge>
      </Card>
      <p className="mt-3 text-[12px] text-ink-3">
        You can still record payments you receive another way from each invoice.
      </p>
    </section>
  );
}
