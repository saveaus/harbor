import Link from "next/link";
import { Bot, CreditCard, Globe, Mail, type LucideIcon } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { emailConfigured } from "@/lib/email";
import { getWorkspace } from "@/lib/workspace";
import { SettingsTitle } from "../settings-page";

type Connector = {
  name: string;
  icon: LucideIcon;
  description: string;
  connected: boolean;
  status: string;
  manage?: { href: string; label: string };
};

export default async function ConnectorsPage() {
  const { supabase, workspace } = await getWorkspace();
  const { data: payout, error } = await supabase
    .from("payout_accounts")
    .select("charges_enabled")
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (error) throw error;

  const connectors: Connector[] = [
    {
      name: "Stripe",
      icon: CreditCard,
      description: "Card payments for invoices, payment links and your store, paid out to your bank.",
      connected: Boolean(payout?.charges_enabled),
      status: payout ? (payout.charges_enabled ? "Accepting payments" : "Setup incomplete") : "Not connected",
      manage: { href: "/settings/payout-account", label: "Manage" },
    },
    {
      name: "Email",
      icon: Mail,
      description: "Sends notifications to your staff and clients, branded with your workspace name and color.",
      connected: emailConfigured(),
      status: emailConfigured() ? "Sending" : "Not configured for this deployment",
      manage: { href: "/settings/client-notifications", label: "Choose emails" },
    },
    {
      name: "AI",
      icon: Bot,
      description: "Powers the assistant and the app builder.",
      connected: Boolean(process.env.AI_GATEWAY_API_KEY),
      status: process.env.AI_GATEWAY_API_KEY ? "Connected" : "Not configured for this deployment",
      manage: { href: "/settings/assistant", label: "Assistant settings" },
    },
    {
      name: "Custom domain",
      icon: Globe,
      description: "Serves your client portal from your own domain.",
      connected: Boolean(workspace.custom_domain),
      status: workspace.custom_domain ?? "Not set",
      manage: { href: "/settings/custom-domains", label: "Manage" },
    },
  ];

  return (
    <>
      <SettingsTitle title="Connectors">Services Harbor uses to take payments, send email and run AI features.</SettingsTitle>
      <div className="space-y-3">
        {connectors.map(({ name, icon: Icon, description, connected, status, manage }) => (
          <Card key={name} className="flex items-start gap-4 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-surface">
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-ink">{name}</span>
                <Badge tone={connected ? "success" : "neutral"}>{status}</Badge>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>
            </div>
            {manage ? (
              <Link href={manage.href} className="shrink-0 text-[13px] font-medium text-link hover:text-ink">
                {manage.label}
              </Link>
            ) : null}
          </Card>
        ))}
      </div>
    </>
  );
}
