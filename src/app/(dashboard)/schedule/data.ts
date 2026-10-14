import type { Enums } from "@/lib/supabase/database.types";
import { personName } from "@/lib/format";
import { budgetLineName, budgetUsage, type BillingUnit } from "@/lib/finance";
import { today } from "@/lib/roster";
import type { WorkspaceContext } from "@/lib/workspace";

export type StaffOption = { id: string; name: string; hourlyCents: number | null };
export type ClientOption = { id: string; name: string; address: string; funding: Enums<"funding_type"> | null };
export type ItemOption = { id: string; name: string; supportNumber: string; unit: BillingUnit; rateCents: number };
export type SiteOption = { id: string; name: string; address: string; latitude: number | null; longitude: number | null };
export type GroupOption = { id: string; name: string; clients: { contactId: string; itemId: string; share: number }[] };
/** Budget left on each of a client's current lines; `category` is empty for lines covering all supports. */
export type FundingLine = { name: string; category: string; remainingCents: number };
export type ShiftOptions = {
  staff: StaffOption[];
  clients: ClientOption[];
  items: ItemOption[];
  sites: SiteOption[];
  groups: GroupOption[];
  funding: Record<string, FundingLine[]>;
};

/** People, prices, places and funding a shift can use. Pay rates are only readable by admins, so members see none. */
export async function loadShiftOptions({ supabase, workspace }: WorkspaceContext): Promise<ShiftOptions> {
  const [staff, clients, items, rates, sites, groups, lines] = await Promise.all([
    supabase
      .from("staff")
      .select("id, first_name, last_name, email")
      .eq("workspace_id", workspace.id)
      .neq("status", "inactive")
      .order("first_name")
      .order("last_name"),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, profile:client_profiles(status, plan_start, plan_end, address, funding)")
      .eq("workspace_id", workspace.id)
      .order("first_name")
      .order("last_name"),
    supabase
      .from("price_book_items")
      .select("id, name, support_number, unit, rate_cents")
      .eq("workspace_id", workspace.id)
      .eq("archived", false)
      .order("name"),
    supabase.from("pay_rates").select("staff_id, hourly_cents").eq("workspace_id", workspace.id),
    supabase.from("sites").select("id, name, address, latitude, longitude").eq("workspace_id", workspace.id).eq("status", "active").order("name"),
    supabase
      .from("client_groups")
      .select("id, name, members:client_group_members(contact_id, item_id, share_percent)")
      .eq("workspace_id", workspace.id)
      .order("name"),
    supabase
      .from("budget_lines")
      .select("id, contact_id, category, label, amount_cents, starts_on, ends_on, temporary")
      .eq("workspace_id", workspace.id),
  ]);
  if (staff.error) throw staff.error;
  if (clients.error) throw clients.error;
  if (items.error) throw items.error;
  if (rates.error) throw rates.error;
  if (sites.error) throw sites.error;
  if (groups.error) throw groups.error;
  if (lines.error) throw lines.error;

  const now = today(workspace.timezone);
  const current = lines.data.filter((l) => (!l.starts_on || l.starts_on <= now) && (!l.ends_on || l.ends_on >= now));
  const funded = [...new Set(current.map((l) => l.contact_id))];
  const charges = funded.length
    ? await supabase
        .from("billables")
        .select("contact_id, support_number, service_date, amount_cents, status")
        .eq("workspace_id", workspace.id)
        .neq("status", "void")
        .in("contact_id", funded)
    : { data: [], error: null };
  if (charges.error) throw charges.error;
  const plans = new Map(clients.data.map((c) => [c.id, { plan_start: c.profile?.plan_start ?? null, plan_end: c.profile?.plan_end ?? null }]));
  const funding: Record<string, FundingLine[]> = {};
  for (const usage of budgetUsage(current, charges.data, plans)) {
    (funding[usage.contact_id] ??= []).push({ name: budgetLineName(usage), category: usage.category, remainingCents: usage.remainingCents });
  }

  const hourly = new Map(rates.data.map((r) => [r.staff_id, r.hourly_cents]));
  return {
    staff: staff.data.map((s) => ({ id: s.id, name: personName(s), hourlyCents: hourly.get(s.id) ?? null })),
    clients: clients.data
      .filter((c) => c.profile?.status !== "inactive")
      .map((c) => ({ id: c.id, name: personName(c), address: c.profile?.address ?? "", funding: c.profile?.funding ?? null })),
    items: items.data.map((i) => ({ id: i.id, name: i.name, supportNumber: i.support_number, unit: i.unit, rateCents: i.rate_cents })),
    sites: sites.data,
    groups: groups.data.map((g) => ({
      id: g.id,
      name: g.name,
      clients: g.members.map((m) => ({ contactId: m.contact_id, itemId: m.item_id ?? "", share: Number(m.share_percent) })),
    })),
    funding,
  };
}
