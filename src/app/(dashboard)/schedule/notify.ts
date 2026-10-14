import { after } from "next/server";
import { sendEmail, type SendOutcome } from "@/lib/email";
import { personName } from "@/lib/format";
import { formatLongDay, formatShiftTime, localParts } from "@/lib/roster";
import { appUrl } from "@/lib/stripe";
import type { WorkspaceContext } from "@/lib/workspace";

export type RosterChange = "published" | "changed" | "cancelled";

const CHANGE_SUBJECT: Record<RosterChange, string> = {
  published: "New shifts on your roster",
  changed: "A shift on your roster changed",
  cancelled: "A shift on your roster was cancelled",
};

const brand = (ctx: WorkspaceContext) => ({ name: ctx.workspace.name, color: ctx.workspace.brand_color });

const shiftLine = (s: { starts_at: string; ends_at: string }, tz: string, detail: string) =>
  `${formatLongDay(localParts(s.starts_at, tz).day)}, ${formatShiftTime(s.starts_at, s.ends_at, tz)}${detail ? ` · ${detail}` : ""}`;

/** Emails each rostered worker the shifts that affect them, after the response is sent. */
export async function emailWorkers(ctx: WorkspaceContext, shiftIds: readonly string[], change: RosterChange) {
  if (!shiftIds.length) return;
  const { data, error } = await ctx.supabase
    .from("shifts")
    .select("id, starts_at, ends_at, address, shift_staff(staff:staff(email)), shift_clients(contact:contacts(first_name, last_name, email))")
    .eq("workspace_id", ctx.workspace.id)
    .in("id", [...shiftIds])
    .order("starts_at");
  if (error) throw error;
  const tz = ctx.workspace.timezone;
  const byEmail = new Map<string, string[]>();
  for (const s of data) {
    const clients = s.shift_clients.flatMap((c) => (c.contact ? [personName(c.contact)] : [])).join(", ");
    const line = shiftLine(s, tz, [clients, s.address].filter(Boolean).join(" · "));
    for (const { staff } of s.shift_staff) if (staff?.email) byEmail.set(staff.email, [...(byEmail.get(staff.email) ?? []), line]);
  }
  after(() =>
    Promise.all(
      [...byEmail].map(([to, lines]) =>
        sendEmail({
          to,
          subject: CHANGE_SUBJECT[change],
          heading: CHANGE_SUBJECT[change],
          lines,
          action: { label: "View my shifts", href: `${appUrl()}/schedule/my-shifts` },
          brand: brand(ctx),
        }),
      ),
    ),
  );
}

/**
 * Offers an open shift to every worker who could take it: active, not on
 * leave that day, not excluded by any of its clients, and not already rostered
 * at the time. Returns how many were emailed.
 */
export async function offerToPool(ctx: WorkspaceContext, shiftId: string): Promise<number> {
  const { supabase, workspace } = ctx;
  const { data: shift, error } = await supabase
    .from("shifts")
    .select("id, starts_at, ends_at, status, shift_staff(staff_id), shift_clients(contact_id)")
    .eq("workspace_id", workspace.id)
    .eq("id", shiftId)
    .single();
  if (error) throw error;
  if (shift.status !== "published" || shift.shift_staff.length) return 0;
  const day = localParts(shift.starts_at, workspace.timezone).day;
  const clientIds = shift.shift_clients.map((c) => c.contact_id);

  const [staff, leave, excluded, busy] = await Promise.all([
    supabase.from("staff").select("id, email").eq("workspace_id", workspace.id).eq("status", "active"),
    supabase.from("staff_leave").select("staff_id").eq("workspace_id", workspace.id).eq("status", "accepted").lte("starts_on", day).gte("ends_on", day),
    clientIds.length
      ? supabase.from("client_staff_preferences").select("staff_id").eq("preference", "excluded").in("contact_id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("shift_staff")
      .select("staff_id, shift:shifts!inner(starts_at, ends_at, status)")
      .eq("workspace_id", workspace.id)
      .lt("shift.starts_at", shift.ends_at)
      .gt("shift.ends_at", shift.starts_at)
      .neq("shift.status", "cancelled"),
  ]);
  for (const result of [staff, leave, excluded, busy]) if (result.error) throw result.error;
  const blocked = new Set([...(leave.data ?? []), ...(excluded.data ?? []), ...(busy.data ?? [])].map((r) => r.staff_id));
  const eligible = (staff.data ?? []).filter((s) => !blocked.has(s.id));

  const line = shiftLine(shift, workspace.timezone, "");
  after(() =>
    Promise.all(
      eligible.map((s) =>
        sendEmail({
          to: s.email,
          subject: "A shift is available",
          heading: "A shift is available in the shift pool",
          lines: [line],
          action: { label: "Take the shift", href: `${appUrl()}/schedule/pool` },
          brand: brand(ctx),
        }),
      ),
    ),
  );
  return eligible.length;
}

/**
 * Emails a client, and the people listed as their roster recipients, the
 * supports booked between two days with times and staff names.
 */
export async function emailClientRoster(ctx: WorkspaceContext, contactId: string, from: string, to: string): Promise<SendOutcome | "nothing"> {
  const { supabase, workspace } = ctx;
  const tz = workspace.timezone;
  const [contact, recipients, shifts] = await Promise.all([
    supabase.from("contacts").select("first_name, last_name, email").eq("workspace_id", workspace.id).eq("id", contactId).single(),
    supabase.from("client_contacts").select("email").eq("workspace_id", workspace.id).eq("contact_id", contactId).eq("kind", "roster_recipient"),
    supabase
      .from("shift_clients")
      .select(
        "shift:shifts!inner(starts_at, ends_at, status, shift_staff(staff:staff(first_name, last_name, email))), item:price_book_items(name)",
      )
      .eq("workspace_id", workspace.id)
      .eq("contact_id", contactId)
      .in("shift.status", ["published", "completed"])
      .gte("shift.starts_at", new Date(`${from}T00:00:00Z`).toISOString())
      .lt("shift.starts_at", new Date(Date.parse(`${to}T00:00:00Z`) + 2 * 86_400_000).toISOString()),
  ]);
  if (contact.error) throw contact.error;
  if (recipients.error) throw recipients.error;
  if (shifts.error) throw shifts.error;

  const lines = shifts.data
    .filter(({ shift }) => {
      const day = localParts(shift.starts_at, tz).day;
      return day >= from && day <= to;
    })
    .sort((a, b) => a.shift.starts_at.localeCompare(b.shift.starts_at))
    .map(({ shift, item }) => {
      const staff = shift.shift_staff.flatMap((s) => (s.staff ? [personName(s.staff)] : [])).join(", ") || "Staff to be confirmed";
      return shiftLine(shift, tz, [item?.name, staff].filter(Boolean).join(" · "));
    });
  if (!lines.length) return "nothing";

  const addresses = [...new Set([contact.data.email, ...recipients.data.map((r) => r.email)].filter(Boolean))];
  const heading = `${personName(contact.data)}'s roster, ${formatLongDay(from)} to ${formatLongDay(to)}`;
  const base = workspace.custom_domain ? `https://${workspace.custom_domain}` : appUrl();
  const outcomes = await Promise.all(
    addresses.map((address) =>
      sendEmail({ to: address, subject: heading, heading, lines, action: { label: "Open your portal", href: `${base}/portal` }, brand: brand(ctx) }),
    ),
  );
  return outcomes.includes("sent") ? "sent" : (outcomes[0] ?? "failed");
}
