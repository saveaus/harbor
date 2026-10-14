import { Alert, Button, Card, Input, Person } from "@/components/ui";
import { plainDollars } from "@/lib/finance";
import { personName } from "@/lib/format";
import { requireAdmin } from "@/lib/workspace";
import { savePayRate } from "../../actions";

export default async function PayRatesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error: notice }, { supabase, workspace }] = await Promise.all([searchParams, requireAdmin("/schedule/timesheets")]);
  const [staff, rates] = await Promise.all([
    supabase
      .from("staff")
      .select("id, first_name, last_name, email, position")
      .eq("workspace_id", workspace.id)
      .neq("status", "inactive")
      .order("first_name"),
    supabase.from("pay_rates").select("staff_id, hourly_cents, km_cents").eq("workspace_id", workspace.id),
  ]);
  if (staff.error) throw staff.error;
  if (rates.error) throw rates.error;
  const rateFor = new Map(rates.data.map((r) => [r.staff_id, r]));

  return (
    <div className="w-full max-w-[760px] space-y-4 px-9 py-6">
      <div>
        <h1 className="text-[16px] font-medium">Pay rates</h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Used for shift costs on the roster and pay totals in payroll exports. Only owners and admins can see them. Award penalty rates aren&apos;t
          applied.
        </p>
      </div>
      {notice ? <Alert>{notice}</Alert> : null}
      <Card>
        <div className="grid grid-cols-[1fr_120px_120px_72px] gap-3 border-b border-line px-4 py-2 text-[12px] font-medium text-ink-3">
          <span>Staff</span>
          <span>Per hour ({workspace.currency.toUpperCase()})</span>
          <span>Per km</span>
          <span />
        </div>
        {staff.data.map((s) => {
          const rate = rateFor.get(s.id);
          return (
            <form
              key={s.id}
              action={savePayRate.bind(null, s.id)}
              className="grid grid-cols-[1fr_120px_120px_72px] items-center gap-3 border-b border-line px-4 py-2 last:border-0"
            >
              <input type="hidden" name="return" value="/schedule/timesheets/pay-rates" />
              <Person name={personName(s)} detail={s.position || null} />
              <Input name="hourly" type="number" min={0} step="0.01" defaultValue={rate ? plainDollars(rate.hourly_cents) : ""} placeholder="0.00" aria-label="Hourly rate" />
              <Input name="km" type="number" min={0} step="0.01" defaultValue={rate ? plainDollars(rate.km_cents) : ""} placeholder="0.00" aria-label="Rate per km" />
              <Button type="submit">Save</Button>
            </form>
          );
        })}
        {staff.data.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-3">No active staff yet.</p> : null}
      </Card>
    </div>
  );
}
