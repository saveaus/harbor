import type { Enums } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";

export const invoiceStatus: Record<
  Enums<"invoice_status">,
  { label: string; tone: "neutral" | "accent" | "success" | "danger" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open", tone: "accent" },
  paid: { label: "Paid", tone: "success" },
  void: { label: "Void", tone: "danger" },
};

export function invoiceTotal(items: { quantity: number; unit_amount_cents: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_amount_cents, 0);
}

export function invoiceNumber(n: number): string {
  return `INV-${String(n).padStart(4, "0")}`;
}

export type Recipient = { value: string; label: string };

export async function listRecipients({ supabase, workspace }: WorkspaceContext): Promise<Recipient[]> {
  const [companies, contacts] = await Promise.all([
    supabase.from("companies").select("id, name").eq("workspace_id", workspace.id).order("name"),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .eq("workspace_id", workspace.id)
      .is("company_id", null)
      .order("first_name"),
  ]);
  if (companies.error) throw companies.error;
  if (contacts.error) throw contacts.error;
  return [
    ...companies.data.map((c) => ({ value: `company:${c.id}`, label: c.name })),
    ...contacts.data.map((c) => ({
      value: `contact:${c.id}`,
      label: `${c.first_name} ${c.last_name}`.trim() || c.email,
    })),
  ];
}

export function parseRecipient(value: string): { company_id: string | null; contact_id: string | null } {
  const [kind, id] = value.split(":");
  if (!id) throw new Error("Choose a recipient");
  if (kind === "company") return { company_id: id, contact_id: null };
  if (kind === "contact") return { company_id: null, contact_id: id };
  throw new Error("Unknown recipient type");
}

export function recipientName(row: {
  company: { name: string } | null;
  contact: { first_name: string; last_name: string; email: string } | null;
}): string {
  if (row.company) return row.company.name;
  if (row.contact) return `${row.contact.first_name} ${row.contact.last_name}`.trim() || row.contact.email;
  return "—";
}
