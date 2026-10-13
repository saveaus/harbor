import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceTotal } from "@/lib/payments";
import { getPortal } from "@/lib/portal";

type Todo = { href: string; label: string; detail: string };

export default async function PortalHomePage() {
  const { supabase, contact, workspace, installedApps } = await getPortal();

  const [invoices, contracts, forms] = await Promise.all([
    installedApps.has("payments")
      ? supabase.from("invoices").select("id, number, currency, invoice_items(quantity, unit_amount_cents)").eq("workspace_id", workspace.id).eq("status", "open").order("number")
      : null,
    installedApps.has("contracts")
      ? supabase.from("contracts").select("id, name").eq("workspace_id", workspace.id).eq("status", "awaiting_signature").order("sent_at")
      : null,
    installedApps.has("forms")
      ? supabase.from("form_requests").select("id, form:forms(name)").eq("workspace_id", workspace.id).eq("status", "pending").order("sent_at")
      : null,
  ]);
  for (const result of [invoices, contracts, forms]) if (result?.error) throw result.error;

  const todos: Todo[] = [
    ...(invoices?.data ?? []).map((i) => ({
      href: `/portal/invoices/${i.id}`,
      label: `Pay ${invoiceNumber(i.number)}`,
      detail: formatMoney(invoiceTotal(i.invoice_items), i.currency),
    })),
    ...(contracts?.data ?? []).map((c) => ({ href: `/portal/contracts/${c.id}`, label: `Sign ${c.name}`, detail: "Contract" })),
    ...(forms?.data ?? []).map((f) => ({
      href: `/portal/forms/${f.id}`,
      label: `Complete ${f.form?.name ?? "form"}`,
      detail: "Form",
    })),
  ];

  return (
    <>
      <PageHeader title="Home" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-[22px] font-semibold tracking-tight">Welcome, {contact.first_name || "there"}</h1>
          {workspace.welcome_message ? (
            <p className="mt-1 text-[13px] whitespace-pre-wrap text-ink-3">{workspace.welcome_message}</p>
          ) : (
            <p className="mt-1 text-[13px] text-ink-3">Everything you share with {workspace.name} lives here.</p>
          )}

          <Card className="mt-6">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-semibold">To do</h2>
            </div>
            <ul>
              {todos.map((todo) => (
                <li key={todo.href} className="border-b border-line last:border-0">
                  <Link href={todo.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
                    <span className="flex-1 truncate text-[13px] font-medium">{todo.label}</span>
                    <span className="text-[13px] text-ink-3">{todo.detail}</span>
                    <ChevronRight size={14} className="text-ink-4" />
                  </Link>
                </li>
              ))}
              {todos.length === 0 ? <li className="px-4 py-6 text-center text-[13px] text-ink-3">You&apos;re all caught up.</li> : null}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
