"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SHIFT_KINDS } from "@/lib/award";
import { enumValue } from "@/lib/care";
import { emailConfigured } from "@/lib/email";
import { CANCELLATION_REASONS, SHORT_NOTICE_HOURS, insideShortNotice } from "@/lib/finance";
import { cents, optionalId, text } from "@/lib/form-data";
import { REPEATS, addDays, daysBetween, isClock, isDay, localParts, weekStart, zonedInstant } from "@/lib/roster";
import { refusal, sqlNull } from "@/lib/rpc";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { requireAdmin, requireApp, type WorkspaceContext } from "@/lib/workspace";
import { emailClientRoster, emailWorkers, offerToPool } from "./notify";

const SITE_STATUS = { active: "Active", inactive: "Inactive" } as const;

function back(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

/** Only paths inside Scheduling are accepted as return targets. */
function returnPath(form: FormData, fallback: string): string {
  const value = text(form, "return");
  return value.startsWith("/schedule") && !value.startsWith("//") ? value : fallback;
}

function refreshAll() {
  revalidatePath("/schedule", "layout");
  revalidatePath("/finance", "layout");
  revalidatePath("/clients", "layout");
}

/** A wall-clock span in the workspace time zone; an end at or before the start finishes the next day. */
function span(day: string, start: string, end: string, timeZone: string) {
  const starts = zonedInstant(day, start, timeZone);
  const ends = zonedInstant(end <= start ? addDays(day, 1) : day, end, timeZone);
  return { starts: starts.toISOString(), ends: ends.toISOString() };
}

function breakMinutes(form: FormData, path: string): number {
  const raw = text(form, "break");
  const value = raw === "" ? 0 : Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 600) back(path, "Enter a break between 0 and 600 minutes.");
  return value;
}

export async function saveShift(shiftId: string | null, form: FormData) {
  const ctx = await requireApp("scheduling");
  const { supabase, workspace } = ctx;
  const day = text(form, "day");
  const start = text(form, "start");
  const end = text(form, "end");
  const fallback = shiftId ? `/schedule/shifts/${shiftId}` : `/schedule?week=${isDay(day) ? weekStart(day) : ""}`;
  if (!isDay(day) || !isClock(start) || !isClock(end)) back(fallback, "Choose a date, start time and end time.");
  const { starts, ends } = span(day, start, end, workspace.timezone);
  const breakMins = breakMinutes(form, fallback);

  const staffIds = [...new Set(form.getAll("staff_id").filter((v): v is string => typeof v === "string" && v !== ""))];
  const contactIds = form.getAll("client_id");
  const itemIds = form.getAll("item_id");
  const shares = form.getAll("share");
  const clients: { contact_id: string; item_id: string | null; share_percent: number }[] = [];
  for (const [i, contact] of contactIds.entries()) {
    if (typeof contact !== "string" || contact === "") continue;
    if (clients.some((c) => c.contact_id === contact)) back(fallback, "Add each client to a shift once.");
    const share = Number(shares[i] ?? 100);
    if (!Number.isFinite(share) || share <= 0 || share > 100) back(fallback, "Each client's share must be between 1 and 100%.");
    const item = itemIds[i];
    clients.push({ contact_id: contact, item_id: typeof item === "string" && item !== "" ? item : null, share_percent: share });
  }
  if (clients.length === 0) back(fallback, "Add at least one client to the shift.");

  const repeat = shiftId ? null : enumValue(REPEATS, text(form, "repeat"));
  const until = text(form, "repeat_until");
  if (repeat && (!isDay(until) || until < day)) back(fallback, "Choose when the repeats end, on or after the first shift.");
  const award = enumValue(SHIFT_KINDS, text(form, "award")) ?? "standard";
  const pin = location(form);

  const { data, error } = await supabase.rpc("save_shift", {
    ws: workspace.id,
    target: sqlNull(shiftId),
    starts,
    ends,
    break_mins: breakMins,
    shift_address: text(form, "address").slice(0, 200),
    shift_notes: text(form, "notes").slice(0, 2000),
    staff_ids: staffIds,
    clients,
    ...(repeat ? { repeat_every: repeat, repeat_until: until } : {}),
    shift_site: sqlNull(optionalId(form, "site_id")),
    is_sleepover: award === "sleepover",
    is_broken: award === "broken",
    lat: sqlNull(pin?.latitude ?? null),
    lng: sqlNull(pin?.longitude ?? null),
  });
  const message = refusal(error);
  if (message) back(fallback, message);

  const savedId = shiftId ?? data;
  if (!savedId) back(fallback, "The shift wasn't saved.");
  const travelBetween = form.get("travel_between") === "on";
  const kmRaw = text(form, "travel_km");
  const km = kmRaw === "" ? 0 : Number(kmRaw);
  if (travelBetween && (!Number.isFinite(km) || km <= 0 || km > 2000)) back(fallback, "Enter travel between 0.1 and 2000 km.");
  const extras = await supabase
    .from("shifts")
    .update({
      title: text(form, "title").slice(0, 160),
      travel_between: travelBetween,
      travel_km: travelBetween ? Math.round(km * 10) / 10 : 0,
    })
    .eq("id", savedId);
  if (extras.error) throw extras.error;
  if (travelBetween && km > 0) {
    const travel = await supabase
      .from("timesheet_entries")
      .update({ km: Math.round(km * 10) / 10 })
      .eq("shift_id", savedId)
      .eq("synced", true)
      .eq("status", "draft");
    if (travel.error) throw travel.error;
  }
  if (form.get("publish") === "1") {
    const published = await supabase.rpc("set_shift_published", { target: savedId, publish: true });
    const publishMessage = refusal(published.error);
    if (publishMessage) back(`/schedule/shifts/${savedId}`, `The shift was saved, but it wasn't published: ${publishMessage}`);
    await announcePublished(ctx, [{ id: savedId, shift_staff: staffIds.map((staff_id) => ({ staff_id })) }]);
  }

  const groupName = text(form, "group_name").slice(0, 80);
  if (groupName) {
    const saved = await supabase.rpc("save_client_group", { ws: workspace.id, group_name: groupName, clients });
    const groupMessage = refusal(saved.error);
    if (groupMessage) back(`/schedule/shifts/${data}`, `The shift was saved, but the group wasn't: ${groupMessage}`);
  }
  if (shiftId) {
    const { data: saved, error: statusError } = await supabase.from("shifts").select("status").eq("id", shiftId).single();
    if (statusError) throw statusError;
    if (saved.status === "published") await emailWorkers(ctx, [shiftId], "changed");
  }
  refreshAll();
  if (!shiftId) redirect(`/schedule/shifts/${data}`);
}

function location(form: FormData): { latitude: number; longitude: number } | null {
  const latitude = Number(text(form, "latitude"));
  const longitude = Number(text(form, "longitude"));
  if (!text(form, "latitude") || !text(form, "longitude")) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/** Drag and drop on the roster: keeps the local start time, changes the day and optionally the worker. */
export async function moveShift(shiftId: string, day: string, staffId: string | null, reassign: boolean, week: string) {
  const ctx = await requireApp("scheduling");
  const { supabase, workspace } = ctx;
  const path = `/schedule?week=${week}`;
  if (!isDay(day)) back(path, "That day isn't valid.");
  const { data: shift, error } = await supabase
    .from("shifts")
    .select("starts_at, status")
    .eq("workspace_id", workspace.id)
    .eq("id", shiftId)
    .maybeSingle();
  if (error) throw error;
  if (!shift) back(path, "That shift no longer exists.");
  const { clock } = localParts(shift.starts_at, workspace.timezone);
  const moved = await supabase.rpc("move_shift", {
    target: shiftId,
    starts: zonedInstant(day, clock, workspace.timezone).toISOString(),
    worker: sqlNull(staffId),
    reassign,
  });
  const message = refusal(moved.error);
  if (message) back(path, message);
  if (shift.status === "published") await emailWorkers(ctx, [shiftId], "changed");
  refreshAll();
}

export async function publishWeek(week: string) {
  const ctx = await requireApp("scheduling");
  const { supabase, workspace } = ctx;
  const path = `/schedule?week=${week}`;
  if (!isDay(week)) back("/schedule", "That week isn't valid.");
  const range = {
    range_start: zonedInstant(week, "00:00", workspace.timezone).toISOString(),
    range_end: zonedInstant(addDays(week, 7), "00:00", workspace.timezone).toISOString(),
  };
  const drafts = await supabase
    .from("shifts")
    .select("id, shift_staff(staff_id)")
    .eq("workspace_id", workspace.id)
    .eq("status", "unpublished")
    .gte("starts_at", range.range_start)
    .lt("starts_at", range.range_end);
  if (drafts.error) throw drafts.error;
  const { data, error } = await supabase.rpc("publish_shifts", { ws: workspace.id, ...range });
  const message = refusal(error);
  if (message) back(path, message);
  if (data === 0 && drafts.data.length === 0) back(path, "There are no draft shifts to publish this week.");
  if (data === 0) back(path, "None of this week's drafts could be published. Open each shift for the reason.");
  const published = await supabase
    .from("shifts")
    .select("id, shift_staff(staff_id)")
    .eq("workspace_id", workspace.id)
    .eq("status", "published")
    .in(
      "id",
      drafts.data.map((d) => d.id),
    );
  if (published.error) throw published.error;
  await announcePublished(ctx, published.data);
  refreshAll();
  const skipped = drafts.data.length - (data ?? 0);
  if (skipped > 0) {
    redirect(
      `${path}${path.includes("?") ? "&" : "?"}notice=${encodeURIComponent(
        `Published ${data}. ${skipped} stayed unpublished because of credentials, an ended plan, or budget.`,
      )}`,
    );
  }
}

/** Rostered workers hear about their new shifts; open ones are offered to the pool. */
async function announcePublished(ctx: WorkspaceContext, shifts: { id: string; shift_staff: { staff_id: string }[] }[]) {
  await emailWorkers(
    ctx,
    shifts.filter((s) => s.shift_staff.length).map((s) => s.id),
    "published",
  );
  for (const s of shifts) if (!s.shift_staff.length) await offerToPool(ctx, s.id);
}

type ShiftStep = "publish" | "unpublish" | "complete" | "reopen" | "restore" | "take";

export async function shiftStep(shiftId: string, step: ShiftStep) {
  const ctx = await requireApp("scheduling");
  const { supabase } = ctx;
  const path = step === "take" ? "/schedule/pool" : `/schedule/shifts/${shiftId}`;
  const before = step === "unpublish" ? await rosteredIds(ctx, shiftId) : [];
  const result = await (() => {
    switch (step) {
      case "publish":
      case "unpublish":
        return supabase.rpc("set_shift_published", { target: shiftId, publish: step === "publish" });
      case "complete":
        return supabase.rpc("complete_shift", { target: shiftId });
      case "reopen":
        return supabase.rpc("reopen_shift", { target: shiftId });
      case "restore":
        return supabase.rpc("restore_shift", { target: shiftId });
      case "take":
        return supabase.rpc("take_shift", { target: shiftId });
      default: {
        const unknown: never = step;
        throw new Error(`Unknown shift step ${String(unknown)}`);
      }
    }
  })();
  const message = refusal(result.error);
  if (message) back(path, message);
  if (step === "publish") await announcePublished(ctx, [{ id: shiftId, shift_staff: (await rosteredIds(ctx, shiftId)).map((staff_id) => ({ staff_id })) }]);
  if (step === "unpublish" && before.length) await emailWorkers(ctx, [shiftId], "cancelled");
  refreshAll();
}

async function rosteredIds({ supabase }: WorkspaceContext, shiftId: string): Promise<string[]> {
  const { data, error } = await supabase.from("shift_staff").select("staff_id").eq("shift_id", shiftId);
  if (error) throw error;
  return data.map((r) => r.staff_id);
}

export async function cancelShift(shiftId: string, form: FormData) {
  const ctx = await requireApp("scheduling");
  const { supabase } = ctx;
  const path = `/schedule/shifts/${shiftId}`;
  const reason = enumValue(CANCELLATION_REASONS, text(form, "reason"));
  const shift = await supabase.from("shifts").select("starts_at").eq("id", shiftId).maybeSingle();
  if (shift.error) throw shift.error;
  if (!shift.data) back(path, "Shift not found.");
  const settings = await supabase.from("finance_settings").select("short_notice_hours").eq("workspace_id", ctx.workspace.id).maybeSingle();
  if (settings.error) throw settings.error;
  const charge = insideShortNotice(shift.data.starts_at, settings.data?.short_notice_hours ?? SHORT_NOTICE_HOURS);
  if (charge && !reason) back(path, "Choose a cancellation reason. This cancellation is inside the NDIA short-notice window.");
  const { error } = await supabase.rpc("cancel_shift", {
    target: shiftId,
    charge_client: charge,
    pay_staff: form.get("pay") === "on",
    reason: sqlNull(charge ? reason : null),
  });
  const message = refusal(error);
  if (message) back(path, message);
  await emailWorkers(ctx, [shiftId], "cancelled");
  refreshAll();
}

export async function saveSupportNote(shiftId: string, form: FormData) {
  const { supabase } = await requireApp("scheduling");
  const path = `/schedule/shifts/${shiftId}`;
  const note = text(form, "note").slice(0, 20000);
  if (!note) back(path, "Write a note about the support before completing this shift.");
  const { error } = await supabase.rpc("save_shift_support_note", { target: shiftId, note });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
}

export async function extendShift(shiftId: string, form: FormData) {
  const ctx = await requireApp("scheduling");
  const { supabase, workspace } = ctx;
  const path = `/schedule/shifts/${shiftId}`;
  const day = text(form, "day");
  const end = text(form, "end");
  if (!isDay(day) || !isClock(end)) back(path, "Choose the new finish date and time.");
  const { error } = await supabase.rpc("extend_shift", { target: shiftId, ends: zonedInstant(day, end, workspace.timezone).toISOString() });
  const message = refusal(error);
  if (message) back(path, message);
  await emailWorkers(ctx, [shiftId], "changed");
  refreshAll();
}

/** Fills an open shift from the best-match list. */
export async function assignStaff(shiftId: string, staffId: string) {
  const ctx = await requireApp("scheduling");
  const path = `/schedule/shifts/${shiftId}`;
  const { data: shift, error: readError } = await ctx.supabase.from("shifts").select("status").eq("id", shiftId).single();
  if (readError) throw readError;
  const { error } = await ctx.supabase.rpc("assign_shift_staff", { target: shiftId, worker: staffId });
  const message = refusal(error);
  if (message) back(path, message);
  if (shift.status === "published") await emailWorkers(ctx, [shiftId], "published");
  refreshAll();
}

export async function offerShift(shiftId: string) {
  const ctx = await requireApp("scheduling");
  const path = `/schedule/shifts/${shiftId}`;
  const offered = await offerToPool(ctx, shiftId);
  if (offered === 0) back(path, "Nobody is free to take this shift. Check leave, client exclusions and other shifts.");
  redirect(`${path}?notice=${encodeURIComponent(`Offered to ${offered} eligible worker${offered === 1 ? "" : "s"}.`)}`);
}

export async function emailRoster(form: FormData) {
  const ctx = await requireApp("scheduling");
  const path = returnPath(form, "/schedule");
  const from = text(form, "from");
  const to = text(form, "to");
  if (!isDay(from) || !isDay(to) || to < from || daysBetween(from, to) > 62) back(path, "Choose a period of up to two months.");
  const contactIds = [...new Set(form.getAll("client").filter((v): v is string => typeof v === "string" && v !== ""))];
  if (contactIds.length === 0) back(path, "Choose at least one client.");
  if (!emailConfigured()) back(path, "Email isn't set up for this workspace yet, so rosters can't be sent.");
  const outcomes = await Promise.all(contactIds.map((id) => emailClientRoster(ctx, id, from, to)));
  const sent = outcomes.filter((o) => o === "sent").length;
  const empty = outcomes.filter((o) => o === "nothing").length;
  const failed = outcomes.length - sent - empty;
  const parts = [
    `Sent ${sent} roster${sent === 1 ? "" : "s"}`,
    empty ? `${empty} client${empty === 1 ? " has" : "s have"} no shifts in that period` : "",
    failed ? `${failed} couldn't be sent` : "",
  ].filter(Boolean);
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}notice=${encodeURIComponent(`${parts.join("; ")}.`)}`);
}

function coordinates(form: FormData): { lat: number | null; lng: number | null; accuracy: number | null } {
  const lat = Number(text(form, "latitude"));
  const lng = Number(text(form, "longitude"));
  const accuracy = Number(text(form, "accuracy"));
  const valid = text(form, "latitude") !== "" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return { lat: valid ? lat : null, lng: valid ? lng : null, accuracy: valid && Number.isFinite(accuracy) ? accuracy : null };
}

export async function checkIn(entryId: string, form: FormData) {
  const { supabase } = await requireApp("scheduling");
  const { lat, lng, accuracy } = coordinates(form);
  const { error } = await supabase.rpc("check_in_shift", {
    entry: entryId,
    lat: sqlNull(lat),
    lng: sqlNull(lng),
    accuracy: sqlNull(accuracy),
    reason: text(form, "reason").slice(0, 300),
  });
  const message = refusal(error);
  if (message) back(`/schedule/my-shifts?entry=${entryId}`, message);
  refreshAll();
}

export async function checkOut(entryId: string, form: FormData) {
  const { supabase } = await requireApp("scheduling");
  const { lat, lng } = coordinates(form);
  const note = text(form, "note").slice(0, 20000);
  if (!note) back("/schedule/my-shifts", "Write a note about the support before checking out.");
  const kmRaw = text(form, "km");
  const km = kmRaw === "" ? 0 : Number(kmRaw);
  if (!Number.isFinite(km) || km < 0 || km > 2000) back("/schedule/my-shifts", "Enter kilometres between 0 and 2000.");
  const travel = await supabase.from("timesheet_entries").update({ km: Math.round(km * 10) / 10 }).eq("id", entryId);
  if (travel.error) throw travel.error;
  const { error } = await supabase.rpc("check_out_shift", { entry: entryId, lat: sqlNull(lat), lng: sqlNull(lng), note });
  const message = refusal(error);
  if (message) back("/schedule/my-shifts", message);
  refreshAll();
}

export async function saveSite(siteId: string | null, form: FormData) {
  const path = siteId ? `/schedule/sites/${siteId}` : "/schedule/sites";
  const { supabase, workspace } = await requireAdmin(path);
  const name = text(form, "name").slice(0, 120);
  if (!name) back(path, "Give the site a name.");
  const capacity = text(form, "capacity");
  const inspection = text(form, "inspection_due");
  const pin = location(form);
  const row = {
    workspace_id: workspace.id,
    name,
    address: text(form, "address").slice(0, 200),
    capacity: capacity === "" ? null : Math.min(100, Math.max(0, Math.round(Number(capacity)) || 0)),
    status: enumValue(SITE_STATUS, text(form, "status")) ?? "active",
    notes: text(form, "notes").slice(0, 4000),
    inspection_due: isDay(inspection) ? inspection : null,
    latitude: pin?.latitude ?? null,
    longitude: pin?.longitude ?? null,
  };
  const { data, error } = siteId
    ? await supabase.from("sites").update(row).eq("workspace_id", workspace.id).eq("id", siteId).select("id").single()
    : await supabase.from("sites").insert(row).select("id").single();
  if (error?.code === "23505") back(path, "Another site already has that name.");
  if (error) throw error;
  revalidatePath("/schedule", "layout");
  if (!siteId) redirect(`/schedule/sites/${data.id}`);
}

export async function setSitePeople(siteId: string, form: FormData) {
  const path = `/schedule/sites/${siteId}`;
  const { supabase, workspace } = await requireAdmin(path);
  const ids = (name: string) => [...new Set(form.getAll(name).filter((v): v is string => typeof v === "string" && v !== ""))];
  const clients = ids("client");
  const support = ids("support");
  const admins = ids("admin").filter((id) => !support.includes(id));
  const [{ error: clearClients }, { error: clearStaff }] = await Promise.all([
    supabase.from("site_clients").delete().eq("site_id", siteId),
    supabase.from("site_staff").delete().eq("site_id", siteId),
  ]);
  if (clearClients) throw clearClients;
  if (clearStaff) throw clearStaff;
  const [{ error: addClients }, { error: addStaff }] = await Promise.all([
    clients.length ? supabase.from("site_clients").insert(clients.map((contact_id) => ({ site_id: siteId, contact_id, workspace_id: workspace.id }))) : { error: null },
    support.length || admins.length
      ? supabase.from("site_staff").insert([
          ...support.map((staff_id) => ({ site_id: siteId, staff_id, workspace_id: workspace.id, role: "support" as const })),
          ...admins.map((staff_id) => ({ site_id: siteId, staff_id, workspace_id: workspace.id, role: "admin" as const })),
        ])
      : { error: null },
  ]);
  if (addClients) throw addClients;
  if (addStaff) throw addStaff;
  revalidatePath(path);
}

export async function deleteClientGroup(groupId: string) {
  const { supabase, workspace } = await requireApp("scheduling");
  const { error } = await supabase.from("client_groups").delete().eq("workspace_id", workspace.id).eq("id", groupId);
  if (error) throw error;
  revalidatePath("/schedule", "layout");
}

export async function deleteShift(shiftId: string, week: string) {
  const { supabase } = await requireApp("scheduling");
  const { error } = await supabase.rpc("delete_shift", { target: shiftId });
  const message = refusal(error);
  if (message) back(`/schedule/shifts/${shiftId}`, message);
  refreshAll();
  redirect(`/schedule?week=${week}`);
}

export async function updateTimesheet(entryId: string, form: FormData) {
  const { supabase, workspace } = await requireApp("scheduling");
  const path = returnPath(form, "/schedule/timesheets");
  const day = text(form, "day");
  const start = text(form, "start");
  const end = text(form, "end");
  if (!isDay(day) || !isClock(start) || !isClock(end)) back(path, "Choose a date, start time and end time.");
  const km = text(form, "km") === "" ? 0 : Number(text(form, "km"));
  if (!Number.isFinite(km) || km < 0 || km > 2000) back(path, "Enter travel between 0 and 2000 km.");
  const { starts, ends } = span(day, start, end, workspace.timezone);
  const { error } = await supabase.rpc("update_timesheet_entry", {
    target: entryId,
    starts,
    ends,
    break_mins: breakMinutes(form, path),
    travel_km: Math.round(km * 10) / 10,
    entry_notes: text(form, "notes").slice(0, 1000),
  });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
}

export async function setTimesheetsApproved(approve: boolean, form: FormData) {
  const path = returnPath(form, "/schedule/timesheets");
  const { supabase, workspace, userId } = await requireAdmin(path);
  const ids = form.getAll("entry").filter((v): v is string => typeof v === "string");
  if (ids.length === 0) back(path, "Select at least one timesheet entry.");
  const { error } = await supabase
    .from("timesheet_entries")
    .update(approve ? { status: "approved", approved_at: new Date().toISOString(), approved_by: userId } : { status: "draft", approved_at: null, approved_by: null })
    .eq("workspace_id", workspace.id)
    .eq("status", approve ? "draft" : "approved")
    .in("id", ids);
  if (error) throw error;
  revalidatePath("/schedule/timesheets");
}

export async function lockTimesheets(form: FormData) {
  const path = returnPath(form, "/schedule/timesheets");
  const { supabase, workspace } = await requireAdmin(path);
  const from = text(form, "from");
  const to = text(form, "to");
  if (!isDay(from) || !isDay(to) || to < from) back(path, "Choose a valid pay period.");
  const { error } = await supabase.rpc("lock_timesheets", {
    ws: workspace.id,
    period_from: from,
    period_to: to,
    worker: sqlNull(optionalId(form, "staff")),
  });
  const message = refusal(error);
  if (message) back(path, message);
  revalidatePath("/schedule/timesheets");
}

/** Unlocking reopens paid hours, so the admin re-enters their password and gives a reason. */
export async function unlockTimesheets(exportId: string, form: FormData) {
  const path = returnPath(form, "/schedule/timesheets");
  const { supabase } = await requireAdmin(path);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) back(path, "Your account has no email to confirm with.");

  const verifier = createStatelessClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const check = await verifier.auth.signInWithPassword({ email: user.email, password: String(form.get("password") ?? "") });
  if (check.error || check.data.user?.id !== user.id) back(path, "That password isn't right.");
  await verifier.auth.signOut({ scope: "local" });

  const { error } = await supabase.rpc("unlock_timesheets", {
    export_id: exportId,
    worker: sqlNull(optionalId(form, "staff")),
    unlock_reason: text(form, "reason"),
  });
  const message = refusal(error);
  if (message) back(path, message);
  revalidatePath("/schedule/timesheets");
}

export async function duplicateShift(shiftId: string) {
  const { supabase } = await requireApp("scheduling");
  const { data, error } = await supabase.rpc("duplicate_shift", { target: shiftId });
  const message = refusal(error);
  if (message) back(`/schedule/shifts/${shiftId}`, message);
  refreshAll();
  redirect(`/schedule/shifts/${data}`);
}

export async function saveSleepoverHours(shiftId: string, form: FormData) {
  const { supabase, workspace } = await requireApp("scheduling");
  const path = `/schedule/shifts/${shiftId}`;
  const day = text(form, "day");
  const start = text(form, "start");
  const end = text(form, "end");
  if (!isDay(day) || !isClock(start) || !isClock(end)) back(path, "Choose when the active hours started and ended.");
  const { starts, ends } = span(day, start, end, workspace.timezone);
  const { error } = await supabase.rpc("save_sleepover_hours", {
    target: shiftId,
    starts,
    ends,
    notes: text(form, "notes").slice(0, 200),
  });
  const message = refusal(error);
  if (message) back(path, message);
  refreshAll();
}

export async function saveTask(form: FormData) {
  const path = returnPath(form, "/schedule/tasks");
  const { supabase, workspace } = await requireAdmin(path);
  const title = text(form, "title").slice(0, 200);
  const contactId = optionalId(form, "client");
  const minutes = text(form, "minutes") === "" ? 0 : Number(text(form, "minutes"));
  const due = text(form, "due");
  if (!title) back(path, "Give the task a title.");
  if (!contactId) back(path, "Choose a client.");
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 10080) back(path, "Enter minutes between 0 and 10,080.");
  const { error } = await supabase.from("billable_tasks").insert({
    workspace_id: workspace.id,
    contact_id: contactId,
    assignee_id: optionalId(form, "staff"),
    title,
    notes: text(form, "notes").slice(0, 4000),
    due_on: isDay(due) ? due : null,
    item_id: optionalId(form, "item"),
    minutes,
  });
  if (error) throw error;
  refreshAll();
}

export async function completeTask(taskId: string, billable: boolean) {
  const { supabase } = await requireApp("scheduling");
  const { error } = await supabase.rpc("complete_billable_task", { target: taskId, billable });
  const message = refusal(error);
  if (message) back("/schedule/tasks", message);
  refreshAll();
}

export async function reopenTask(taskId: string) {
  const { supabase } = await requireApp("scheduling");
  const { error } = await supabase.rpc("reopen_billable_task", { target: taskId });
  const message = refusal(error);
  if (message) back("/schedule/tasks", message);
  refreshAll();
}

export async function savePayRate(staffId: string, form: FormData) {
  const path = returnPath(form, "/schedule/timesheets/pay-rates");
  const { supabase, workspace } = await requireAdmin(path);
  const { error } = await supabase.from("pay_rates").upsert({
    staff_id: staffId,
    workspace_id: workspace.id,
    hourly_cents: text(form, "hourly") ? cents(form, "hourly") : 0,
    km_cents: text(form, "km") ? cents(form, "km") : 0,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  revalidatePath("/schedule", "layout");
}
