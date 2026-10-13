"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cents, text } from "@/lib/form-data";
import { formatMoney } from "@/lib/format";
import { parseRecipient } from "@/lib/payments";
import { entryAmountCents, formatDuration, parseDuration } from "@/lib/time";
import { requireApp } from "@/lib/workspace";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function back(message: string): never {
  redirect(`/time?error=${encodeURIComponent(message)}`);
}

export async function logTime(form: FormData) {
  const { supabase, workspace, member } = await requireApp("timetracker");
  const minutes = parseDuration(text(form, "duration"));
  if (!minutes) back("Enter a duration between 1 minute and 24 hours, like 1:30 or 1.5.");
  const date = text(form, "entry_date");
  if (!ISO_DATE.test(date)) back("Choose a date.");
  const recipient = text(form, "recipient");

  const { error } = await supabase.from("time_entries").insert({
    workspace_id: workspace.id,
    member_name: member.display_name || member.email,
    ...(recipient ? parseRecipient(recipient) : { company_id: null, contact_id: null }),
    description: text(form, "description"),
    entry_date: date,
    minutes,
    billable: form.get("billable") === "on",
    hourly_rate_cents: text(form, "rate") ? cents(form, "rate") : 0,
  });
  if (error) throw error;
  revalidatePath("/time");
}

export async function deleteTimeEntry(id: string) {
  const { supabase, workspace } = await requireApp("timetracker");
  const { error } = await supabase.from("time_entries").delete().eq("workspace_id", workspace.id).eq("id", id).is("invoice_id", null);
  if (error) throw error;
  revalidatePath("/time");
}

/** Bills every unbilled, billable entry for one client as a single open invoice. */
export async function invoiceUnbilledTime(recipient: string) {
  const ctx = await requireApp("timetracker");
  if (!ctx.installedApps.has("payments")) back("Add the Payments app to create invoices.");
  const { supabase, workspace } = ctx;
  const owner = parseRecipient(recipient);

  let query = supabase
    .from("time_entries")
    .select("id, description, entry_date, minutes, hourly_rate_cents")
    .eq("workspace_id", workspace.id)
    .eq("billable", true)
    .is("invoice_id", null)
    .gt("hourly_rate_cents", 0)
    .order("entry_date");
  if (owner.company_id) query = query.eq("company_id", owner.company_id);
  else if (owner.contact_id) query = query.eq("contact_id", owner.contact_id);
  else back("Choose a client.");
  const { data: entries, error } = await query;
  if (error) throw error;
  if (entries.length === 0) back("There's no unbilled time with a rate for this client.");

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({ workspace_id: workspace.id, ...owner, memo: "Time tracked" })
    .select("id")
    .single();
  if (invoiceError) throw invoiceError;

  const items = await supabase.from("invoice_items").insert(
    entries.map((entry) => ({
      workspace_id: workspace.id,
      invoice_id: invoice.id,
      description: `${entry.entry_date} · ${entry.description} (${formatDuration(entry.minutes)} at ${formatMoney(entry.hourly_rate_cents)}/h)`,
      quantity: 1,
      unit_amount_cents: entryAmountCents(entry),
    })),
  );
  const linked = items.error
    ? items
    : await supabase
        .from("time_entries")
        .update({ invoice_id: invoice.id })
        .in(
          "id",
          entries.map((e) => e.id),
        );
  if (linked.error) {
    await supabase.from("invoices").delete().eq("id", invoice.id);
    throw linked.error;
  }
  revalidatePath("/time");
  revalidatePath("/payments", "layout");
  redirect(`/payments/invoices/${invoice.id}`);
}
