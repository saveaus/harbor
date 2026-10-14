import { Car, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Alert, Badge, Cell, EmptyState, Field, Input, Row, Select, Table, Textarea } from "@/components/ui";
import { TRAVEL_CLAIM_KIND, TRAVEL_CLAIM_STATUS } from "@/lib/finance";
import { formatDay, formatMoney, personName } from "@/lib/format";
import { today } from "@/lib/roster";
import { requireApp } from "@/lib/workspace";
import { saveTravelClaim } from "../actions";

export default async function TravelClaimsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, { supabase, workspace, member }] = await Promise.all([searchParams, requireApp("finance")]);
  const admin = member.role !== "member";
  const [claims, staff, clients] = await Promise.all([
    supabase
      .from("travel_claims")
      .select(
        "id, travel_date, destination, description, distance_km, kind, charge_client, status, staff:staff(first_name, last_name, email), contact:contacts(first_name, last_name, email), billable:billables(amount_cents, status)",
      )
      .eq("workspace_id", workspace.id)
      .order("travel_date", { ascending: false })
      .limit(200),
    supabase.from("staff").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).neq("status", "inactive").order("first_name"),
    supabase.from("contacts").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).order("first_name"),
  ]);
  if (claims.error) throw claims.error;
  if (staff.error) throw staff.error;
  if (clients.error) throw clients.error;

  const add = admin ? (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> Add claim
        </>
      }
      title="Travel claim"
      description="Record kilometres a worker drove. Charging the client creates a travel billable at the Finance settings rate."
      action={saveTravelClaim}
      submitLabel="Add claim"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Staff">
          <Select name="staff" required>
            <option value="">Choose staff</option>
            {staff.data.map((s) => (
              <option key={s.id} value={s.id}>
                {personName(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Travel date">
          <Input name="date" type="date" required defaultValue={today(workspace.timezone)} />
        </Field>
      </div>
      <Field label="Destination">
        <Input name="destination" required maxLength={200} />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} maxLength={400} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Distance" hint="km">
          <Input name="km" type="number" min={0.1} max={2000} step="0.1" required />
        </Field>
        <Field label="Type">
          <Select name="kind" defaultValue="between">
            {Object.entries(TRAVEL_CLAIM_KIND).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Client" hint="Required when charging the client">
        <Select name="client">
          <option value="">Don&apos;t charge a client</option>
          {clients.data.map((c) => (
            <option key={c.id} value={c.id}>
              {personName(c)}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" name="charge" defaultChecked className="size-4 accent-[var(--color-accent)]" /> Charge the client
      </label>
    </FormDialog>
  ) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-9 pt-5 pb-3">
        <div>
          <h1 className="text-[16px] font-medium">Travel claims</h1>
          <p className="mt-1 text-[13px] text-ink-3">Staff travel. Charged claims become billables; they invoice or claim with the rest of Finance.</p>
        </div>
        {add}
      </div>
      {params.error ? (
        <div className="px-9 pb-3">
          <Alert>{params.error}</Alert>
        </div>
      ) : null}
      {claims.data.length === 0 ? (
        <EmptyState
          icon={<Car size={18} />}
          title="No travel claims"
          body="Add a claim when a worker drives between supports, to a client, or in the community."
          action={add ?? undefined}
        />
      ) : (
        <Table columns={["Staff", "Date", "Destination", "Type", "Distance", "Client", "Charge", "Status"]}>
          {claims.data.map((c) => {
            const status = TRAVEL_CLAIM_STATUS[c.status];
            return (
              <Row key={c.id} href={c.billable ? "/finance/billables" : undefined}>
                <Cell>{c.staff ? personName(c.staff) : "Staff"}</Cell>
                <Cell>{formatDay(c.travel_date)}</Cell>
                <Cell>
                  <span className="block max-w-56 truncate">{c.destination}</span>
                  {c.description ? <span className="block truncate text-[12px] text-ink-3">{c.description}</span> : null}
                </Cell>
                <Cell>{TRAVEL_CLAIM_KIND[c.kind]}</Cell>
                <Cell className="tabular-nums">{Number(c.distance_km)} km</Cell>
                <Cell className="text-ink-3">{c.contact ? personName(c.contact) : "—"}</Cell>
                <Cell className="tabular-nums">
                  {c.charge_client ? (c.billable ? formatMoney(c.billable.amount_cents ?? 0, workspace.currency) : "Charged") : "Not charged"}
                </Cell>
                <Cell>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </Cell>
              </Row>
            );
          })}
        </Table>
      )}
    </>
  );
}
