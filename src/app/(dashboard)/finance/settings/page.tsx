import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { plainDollars } from "@/lib/finance";
import { requireAdmin } from "@/lib/workspace";
import { saveSettings } from "../actions";

const TIME_ZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Darwin",
  "Australia/Perth",
  "Australia/Hobart",
  "Pacific/Auckland",
];

export default async function FinanceSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [params, { supabase, workspace }] = await Promise.all([searchParams, requireAdmin("/finance")]);
  const [settings, travelItems] = await Promise.all([
    supabase
      .from("finance_settings")
      .select(
        "abn, ndis_registration_number, travel_item_id, sleepover_free_minutes, max_daily_minutes, max_weekly_minutes, min_rest_minutes, break_after_minutes, min_break_minutes, check_in_radius_m, short_notice_hours, sleepover_cents, broken_one_cents, broken_two_cents",
      )
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase.from("price_book_items").select("id, name, support_number").eq("workspace_id", workspace.id).eq("unit", "km").eq("archived", false).order("name"),
  ]);
  if (settings.error) throw settings.error;
  if (travelItems.error) throw travelItems.error;
  const zones = TIME_ZONES.includes(workspace.timezone) ? TIME_ZONES : [workspace.timezone, ...TIME_ZONES];

  return (
    <div className="w-full max-w-[640px] space-y-4 px-9 py-6">
      <div>
        <h1 className="text-[16px] font-medium">Finance settings</h1>
        <p className="mt-1 text-[13px] text-ink-3">Your provider details go on every PRODA bulk claim. Exports are blocked until both are set.</p>
      </div>
      {params.error ? <Alert>{params.error}</Alert> : null}
      {params.saved ? <Alert tone="success">Settings saved.</Alert> : null}
      <Card className="p-5">
        <form action={saveSettings} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ABN">
              <Input name="abn" inputMode="numeric" maxLength={14} defaultValue={settings.data?.abn ?? ""} placeholder="11 digits" />
            </Field>
            <Field label="NDIS registration number">
              <Input name="registration" inputMode="numeric" maxLength={20} defaultValue={settings.data?.ndis_registration_number ?? ""} />
            </Field>
          </div>
          <Field label="Travel item" hint="Kilometres recorded on timesheets are billed at this per-km item, split by each client's share.">
            <Select name="travel_item" defaultValue={settings.data?.travel_item_id ?? ""}>
              <option value="">Don&apos;t bill travel</option>
              {travelItems.data.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {i.support_number ? ` · ${i.support_number}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sleepover free minutes" hint="Active hours beyond this on a sleepover are billed.">
            <Input name="sleepover_free" type="number" min={0} max={720} defaultValue={settings.data?.sleepover_free_minutes ?? 0} />
          </Field>
          <Field label="Short-notice hours" hint="Cancelling inside this window before the shift starts raises a cancellation billable. The NDIA default is seven clear days (168 hours).">
            <Input name="short_notice" type="number" min={1} max={720} defaultValue={settings.data?.short_notice_hours ?? 168} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max daily minutes">
              <Input name="max_daily" type="number" min={0} max={1440} defaultValue={settings.data?.max_daily_minutes ?? 600} />
            </Field>
            <Field label="Max weekly minutes">
              <Input name="max_weekly" type="number" min={0} max={10080} defaultValue={settings.data?.max_weekly_minutes ?? 2280} />
            </Field>
            <Field label="Minimum rest (minutes)">
              <Input name="min_rest" type="number" min={0} max={1440} defaultValue={settings.data?.min_rest_minutes ?? 600} />
            </Field>
            <Field label="Break after (minutes)">
              <Input name="break_after" type="number" min={0} max={1440} defaultValue={settings.data?.break_after_minutes ?? 300} />
            </Field>
            <Field label="Minimum break">
              <Input name="min_break" type="number" min={0} max={240} defaultValue={settings.data?.min_break_minutes ?? 30} />
            </Field>
            <Field label="Check-in radius (m)">
              <Input name="check_in_radius" type="number" min={0} max={5000} defaultValue={settings.data?.check_in_radius_m ?? 100} />
            </Field>
            <Field label="Sleepover allowance">
              <Input name="sleepover_allowance" type="number" min={0} step="0.01" defaultValue={plainDollars(settings.data?.sleepover_cents ?? 0)} />
            </Field>
            <Field label="Broken shift (1 break)">
              <Input name="broken_one" type="number" min={0} step="0.01" defaultValue={plainDollars(settings.data?.broken_one_cents ?? 2082)} />
            </Field>
            <Field label="Broken shift (2 breaks)">
              <Input name="broken_two" type="number" min={0} step="0.01" defaultValue={plainDollars(settings.data?.broken_two_cents ?? 2756)} />
            </Field>
          </div>
          <Field label="Time zone" hint="Rosters, timesheet dates and the service date on claims use this zone.">
            <Select name="timezone" defaultValue={workspace.timezone}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              Save settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
