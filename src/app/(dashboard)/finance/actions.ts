"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enumValue } from "@/lib/care";
import { ABN, GST, NDIS_CATEGORIES, SUPPORT_NUMBER, TRAVEL_CLAIM_KIND, UNITS } from "@/lib/finance";
import { bundledPriceGuide, catalogueFromUpload } from "@/lib/ndis-catalogue";
import { cents, optionalId, text } from "@/lib/form-data";
import { emailClients } from "@/lib/notify";
import { isDay, isTimeZone } from "@/lib/roster";
import { refusal, sqlNull } from "@/lib/rpc";
import { requireAdmin } from "@/lib/workspace";

function back(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

/** Only paths inside Finance are accepted as return targets. */
function returnPath(form: FormData, fallback: string): string {
  const value = text(form, "return");
  return value.startsWith("/finance") && !value.startsWith("//") ? value : fallback;
}

function refreshAll() {
  revalidatePath("/finance", "layout");
  revalidatePath("/schedule", "layout");
}

function ids(form: FormData, name: string): string[] {
  return [...new Set(form.getAll(name).filter((v): v is string => typeof v === "string" && v !== ""))];
}

export async function saveSettings(form: FormData) {
  const path = "/finance/settings";
  const { supabase, workspace } = await requireAdmin(path);
  const abn = text(form, "abn").replace(/\s/g, "");
  const registration = text(form, "registration").replace(/\s/g, "");
  const timezone = text(form, "timezone");
  if (abn && !ABN.test(abn)) back(path, "An ABN is 11 digits.");
  if (!/^\d{0,20}$/.test(registration)) back(path, "The NDIS registration number is digits only.");
  if (!isTimeZone(timezone)) back(path, "Choose a valid time zone.");

  const integer = (name: string, max: number, label: string) => {
    const value = Number(text(form, name));
    if (!Number.isInteger(value) || value < 0 || value > max) back(path, `${label} must be between 0 and ${max}.`);
    return value;
  };
  const settings = await supabase.from("finance_settings").upsert({
    workspace_id: workspace.id,
    abn,
    ndis_registration_number: registration,
    travel_item_id: optionalId(form, "travel_item"),
    sleepover_free_minutes: integer("sleepover_free", 720, "Sleepover free minutes"),
    max_daily_minutes: integer("max_daily", 1440, "Daily minutes"),
    max_weekly_minutes: integer("max_weekly", 10080, "Weekly minutes"),
    min_rest_minutes: integer("min_rest", 1440, "Rest minutes"),
    break_after_minutes: integer("break_after", 1440, "Break after minutes"),
    min_break_minutes: integer("min_break", 240, "Minimum break"),
    check_in_radius_m: integer("check_in_radius", 5000, "Check-in radius"),
    short_notice_hours: (() => {
      const hours = integer("short_notice", 720, "Short-notice hours");
      if (hours < 1) back(path, "Short-notice hours must be between 1 and 720.");
      return hours;
    })(),
    sleepover_cents: text(form, "sleepover_allowance") ? cents(form, "sleepover_allowance") : 0,
    broken_one_cents: text(form, "broken_one") ? cents(form, "broken_one") : 0,
    broken_two_cents: text(form, "broken_two") ? cents(form, "broken_two") : 0,
    updated_at: new Date().toISOString(),
  });
  if (settings.error) throw settings.error;
  if (timezone !== workspace.timezone) {
    const zone = await supabase.from("workspaces").update({ timezone }).eq("id", workspace.id);
    if (zone.error) throw zone.error;
  }
  refreshAll();
  redirect(`${path}?saved=1`);
}

export async function savePriceItem(itemId: string | null, form: FormData) {
  const path = "/finance/price-book";
  const { supabase, workspace } = await requireAdmin(path);
  const supportNumber = text(form, "support_number").toUpperCase();
  const name = text(form, "name");
  const unit = enumValue(UNITS, text(form, "unit"));
  const gst = enumValue(GST, text(form, "gst"));
  if (!SUPPORT_NUMBER.test(supportNumber)) back(path, "Support item numbers use digits, capital letters and underscores, like 01_011_0107_1_1.");
  if (!name || name.length > 160) back(path, "Give the item a name.");
  if (!unit || !gst) back(path, "Choose a unit and GST code.");
  const row = { support_number: supportNumber, name, unit, gst_code: gst, rate_cents: cents(form, "rate") };

  const { error } = itemId
    ? await supabase.from("price_book_items").update(row).eq("workspace_id", workspace.id).eq("id", itemId)
    : await supabase.from("price_book_items").insert({ ...row, workspace_id: workspace.id });
  if (error?.code === "23505") back(path, "That support item number is already in your price book.");
  if (error) throw error;
  refreshAll();
}

export async function importPriceGuide(form: FormData) {
  const path = "/finance/price-book";
  const { supabase, workspace } = await requireAdmin(path);
  const uploaded = form.get("catalogue");
  const items = uploaded instanceof File && uploaded.size > 0 ? await catalogueFromUpload(uploaded).catch((error: unknown) => back(path, error instanceof Error ? error.message : "That file isn't an NDIS support catalogue.")) : bundledPriceGuide();
  const { data, error } = await supabase.rpc("import_price_guide", { ws: workspace.id, items });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
  redirect(`${path}?notice=${encodeURIComponent(`Imported ${data} support ${data === 1 ? "item" : "items"}. Published shifts keep the rate they were priced at.`)}`);
}

export async function savePlanManager(contactId: string, form: FormData) {
  const path = returnPath(form, "/finance/budgets");
  const { supabase, workspace } = await requireAdmin(path);
  const manager = optionalId(form, "plan_manager");
  if (manager === contactId) back(path, "The plan manager has to be a different contact than the participant.");
  const { error } = await supabase.from("client_finance").upsert({
    contact_id: contactId,
    workspace_id: workspace.id,
    plan_manager_id: manager,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  refreshAll();
}

export async function setPriceItemArchived(itemId: string, archived: boolean) {
  const { supabase, workspace } = await requireAdmin("/finance/price-book");
  const { error } = await supabase.from("price_book_items").update({ archived }).eq("workspace_id", workspace.id).eq("id", itemId);
  if (error?.code === "23505") back("/finance/price-book", "Another active item already uses that support item number.");
  if (error) throw error;
  refreshAll();
}

export async function addBillable(form: FormData) {
  const path = returnPath(form, "/finance/billables");
  const { supabase, workspace } = await requireAdmin(path);
  const contactId = optionalId(form, "client");
  const kind = text(form, "kind") === "expense" ? "expense" : "manual";
  const date = text(form, "date");
  const description = text(form, "description");
  const unit = enumValue(UNITS, text(form, "unit"));
  const gst = enumValue(GST, text(form, "gst"));
  const supportNumber = text(form, "support_number").toUpperCase();
  const quantity = Number(text(form, "quantity"));
  if (!contactId) back(path, "Choose a client.");
  if (!isDay(date)) back(path, "Choose the date the support was delivered.");
  if (!description || description.length > 300) back(path, "Describe the charge.");
  if (!unit || !gst) back(path, "Choose a unit and GST code.");
  if (!SUPPORT_NUMBER.test(supportNumber)) back(path, "Support item numbers use digits, capital letters and underscores.");
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9_999_999) back(path, "Enter a quantity above zero.");

  const { error } = await supabase.from("billables").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    kind,
    description,
    service_date: date,
    unit,
    quantity: Math.round(quantity * 100) / 100,
    unit_price_cents: cents(form, "price"),
    gst_code: gst,
    support_number: supportNumber,
  });
  if (error) throw error;
  refreshAll();
}

export async function voidBillable(billableId: string, form: FormData) {
  const path = returnPath(form, "/finance/billables");
  const { supabase, workspace } = await requireAdmin(path);
  const reason = text(form, "reason").slice(0, 200);
  if (!reason) back(path, "Give a reason for voiding the charge.");
  const { data, error } = await supabase
    .from("billables")
    .update({ status: "void", void_reason: reason })
    .eq("workspace_id", workspace.id)
    .eq("id", billableId)
    .eq("status", "unbilled")
    .select("id");
  const message = refusal(error);
  if (message) back(path, message);
  if (!data?.length) back(path, "Only ready charges can be voided. Pending charges follow their shift; cancel the shift instead.");
  refreshAll();
}

export async function generateInvoices(form: FormData) {
  const path = returnPath(form, "/finance/invoicing");
  const { supabase, workspace, installedApps } = await requireAdmin(path);
  if (!installedApps.has("payments")) back(path, "Add the Payments app to send invoices.");
  const from = text(form, "from");
  const to = text(form, "to");
  const due = text(form, "due");
  const clients = ids(form, "client");
  if (!isDay(from) || !isDay(to) || to < from) back(path, "Choose a valid date range.");
  if (!isDay(due)) back(path, "Choose a due date.");
  if (clients.length === 0) back(path, "Select at least one client to invoice.");

  const { data, error } = await supabase.rpc("invoice_billables", { ws: workspace.id, contact_ids: clients, range_from: from, range_to: to, due });
  const message = refusal(error);
  if (message) back(path, message);
  if (!data?.length) back(path, "Nothing was ready to invoice for those clients.");
  for (const row of data) {
    emailClients(
      workspace.id,
      { contact_id: row.invoiced_contact, company_id: null },
      { topic: "invoices", subject: `New invoice from ${workspace.name}`, path: `/portal/invoices/${row.created_invoice}` },
    );
  }
  refreshAll();
  revalidatePath("/payments", "layout");
  redirect(data.length === 1 ? `/payments/invoices/${data[0].created_invoice}` : "/payments/invoices");
}

export async function createClaim(form: FormData) {
  const path = "/finance/claims";
  const { supabase, workspace } = await requireAdmin(path);
  const from = text(form, "from");
  const to = text(form, "to");
  if (!isDay(from) || !isDay(to) || to < from) back(path, "Choose a valid claim period.");
  const { data, error } = await supabase.rpc("create_claim", { ws: workspace.id, period_from: from, period_to: to });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
  redirect(`/finance/claims/${data}`);
}

type ClaimStep = "sync" | "paid" | "unpaid" | "delete";

export async function claimStep(claimId: string, step: ClaimStep) {
  const path = `/finance/claims/${claimId}`;
  const { supabase, workspace } = await requireAdmin(path);
  const result = await (() => {
    switch (step) {
      case "sync":
        return supabase.rpc("sync_claim", { target: claimId });
      case "paid":
      case "unpaid":
        return supabase
          .from("claims")
          .update({ payment_status: step, updated_at: new Date().toISOString() })
          .eq("workspace_id", workspace.id)
          .eq("id", claimId);
      case "delete":
        return supabase.from("claims").delete().eq("workspace_id", workspace.id).eq("id", claimId);
      default: {
        const unknown: never = step;
        throw new Error(`Unknown claim step ${String(unknown)}`);
      }
    }
  })();
  const message = refusal(result.error);
  if (message) back(path, message);
  refreshAll();
  if (step === "delete") redirect("/finance/claims");
}

export async function setClaimEntries(claimId: string, include: boolean, form: FormData) {
  const path = `/finance/claims/${claimId}`;
  const { supabase } = await requireAdmin(path);
  const selected = ids(form, "billable");
  if (selected.length === 0) back(path, "Select at least one entry.");
  const { error } = await supabase.rpc("set_claim_entries", { target: claimId, billable_ids: selected, include });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
}

export async function convertPending(form: FormData) {
  const path = returnPath(form, "/finance/billables");
  const { supabase } = await requireAdmin(path);
  const selected = ids(form, "billable");
  const { data, error } = await supabase.rpc("convert_pending_billables", { ids: selected });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}notice=${encodeURIComponent(`Converted ${data} pending ${data === 1 ? "charge" : "charges"} to ready.`)}`);
}

export async function reconcileBillables() {
  const path = "/finance/billables";
  const { supabase, workspace } = await requireAdmin(path);
  const { data, error } = await supabase.rpc("reconcile_shift_billables", { ws: workspace.id });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
  redirect(`${path}?notice=${encodeURIComponent(data ? `Rebilled ${data} completed ${data === 1 ? "shift" : "shifts"} that were missing charges.` : "Every completed shift already has charges.")}`);
}

export async function saveTravelClaim(form: FormData) {
  const path = returnPath(form, "/finance/travel-claims");
  const { supabase, workspace } = await requireAdmin(path);
  const worker = optionalId(form, "staff");
  const date = text(form, "date");
  const dest = text(form, "destination").slice(0, 200);
  const km = Number(text(form, "km"));
  const kind = enumValue(TRAVEL_CLAIM_KIND, text(form, "kind")) ?? "between";
  if (!worker) back(path, "Choose the staff member who travelled.");
  if (!isDay(date)) back(path, "Choose the travel date.");
  if (!dest) back(path, "Say where they travelled.");
  if (!Number.isFinite(km) || km <= 0 || km > 2000) back(path, "Enter distance between 0.1 and 2000 km.");
  const charge = form.get("charge") === "on";
  const { error } = await supabase.rpc("save_travel_claim", {
    ws: workspace.id,
    worker,
    client: sqlNull(optionalId(form, "client")),
    shift: sqlNull(optionalId(form, "shift")),
    travel_on: date,
    dest,
    notes: text(form, "description").slice(0, 400),
    km: Math.round(km * 10) / 10,
    claim_kind: kind,
    charge,
  });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
}

export async function saveBudgetLine(lineId: string | null, form: FormData) {
  const path = "/finance/budgets";
  const { supabase, workspace } = await requireAdmin(path);
  const contactId = optionalId(form, "client");
  const label = text(form, "label").slice(0, 120);
  const category = text(form, "category");
  const amount = cents(form, "amount");
  const starts = text(form, "starts");
  const ends = text(form, "ends");
  if (!contactId) back(path, "Choose a client.");
  if (category && !(category in NDIS_CATEGORIES)) back(path, "Choose a support category, or leave it blank to cover all supports.");
  if (ends && !isDay(ends)) back(path, "Choose a valid end date.");
  if (starts && !isDay(starts)) back(path, "Choose a valid start date.");
  const temporary = form.get("temporary") === "on";
  if (temporary && !ends) back(path, "Top-up lines need an end date.");
  const row = {
    contact_id: contactId,
    workspace_id: workspace.id,
    category,
    label,
    amount_cents: amount,
    starts_on: isDay(starts) ? starts : null,
    ends_on: isDay(ends) ? ends : null,
    temporary,
  };
  const { error } = lineId
    ? await supabase.from("budget_lines").update(row).eq("workspace_id", workspace.id).eq("id", lineId)
    : await supabase.from("budget_lines").insert(row);
  if (error) throw error;
  revalidatePath(path);
}

export async function deleteBudgetLine(lineId: string) {
  const path = "/finance/budgets";
  const { supabase, workspace } = await requireAdmin(path);
  const { error } = await supabase.from("budget_lines").delete().eq("workspace_id", workspace.id).eq("id", lineId);
  if (error) throw error;
  revalidatePath(path);
}
