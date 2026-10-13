import type { PortalHomeContent, PortalTask } from "@/components/portal-view";
import type { AppKey } from "@/lib/apps";
import { brandAssetUrl } from "@/lib/brand";
import { formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceTotal } from "@/lib/payments";
import type { Tables } from "@/lib/supabase/database.types";
import type { ServerSupabase } from "@/lib/supabase/server";

export type PortalViewer = { contactId: string; companyId: string | null };

type HomeColumns = Pick<
  Tables<"workspaces">,
  "portal_banner_path" | "portal_home_title" | "portal_home_body" | "portal_home_show_tasks" | "portal_home_show_apps"
>;

export function portalHomeContent(workspace: HomeColumns): PortalHomeContent {
  return {
    bannerUrl: brandAssetUrl(workspace.portal_banner_path),
    title: workspace.portal_home_title,
    body: workspace.portal_home_body,
    showTasks: workspace.portal_home_show_tasks,
    showApps: workspace.portal_home_show_apps,
  };
}

/** Open invoices, unsigned contracts and pending forms addressed to the viewer or their company. */
export async function loadPortalTasks(
  supabase: ServerSupabase,
  workspaceId: string,
  installedApps: ReadonlySet<AppKey>,
  viewer: PortalViewer,
): Promise<PortalTask[]> {
  const billedTo = viewer.companyId
    ? `contact_id.eq.${viewer.contactId},company_id.eq.${viewer.companyId}`
    : `contact_id.eq.${viewer.contactId}`;
  const [invoices, contracts, forms] = await Promise.all([
    installedApps.has("payments")
      ? supabase
          .from("invoices")
          .select("id, number, currency, invoice_items(quantity, unit_amount_cents)")
          .eq("workspace_id", workspaceId)
          .eq("status", "open")
          .or(billedTo)
          .order("number")
      : null,
    installedApps.has("contracts")
      ? supabase
          .from("contracts")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .eq("contact_id", viewer.contactId)
          .eq("status", "awaiting_signature")
          .order("sent_at")
      : null,
    installedApps.has("forms")
      ? supabase
          .from("form_requests")
          .select("id, form:forms(name)")
          .eq("workspace_id", workspaceId)
          .eq("contact_id", viewer.contactId)
          .eq("status", "pending")
          .order("sent_at")
      : null,
  ]);
  for (const result of [invoices, contracts, forms]) if (result?.error) throw result.error;

  return [
    ...(invoices?.data ?? []).map((i) => ({
      href: `/portal/invoices/${i.id}`,
      label: `Pay ${invoiceNumber(i.number)}`,
      detail: formatMoney(invoiceTotal(i.invoice_items), i.currency),
    })),
    ...(contracts?.data ?? []).map((c) => ({ href: `/portal/contracts/${c.id}`, label: `Sign ${c.name}`, detail: "Contract" })),
    ...(forms?.data ?? []).map((f) => ({ href: `/portal/forms/${f.id}`, label: `Complete ${f.form?.name ?? "form"}`, detail: "Form" })),
  ];
}

/** Example to-dos for previews when there's no specific client to show. */
export function sampleTasks(currency: string): PortalTask[] {
  return [
    { href: "/portal/invoices", label: "Pay INV-0001", detail: formatMoney(125000, currency) },
    { href: "/portal/contracts", label: "Sign Service agreement", detail: "Contract" },
    { href: "/portal/forms", label: "Complete Onboarding questionnaire", detail: "Form" },
  ];
}
