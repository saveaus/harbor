import { MapPin, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Alert, Badge, Cell, EmptyState, Field, Input, Row, Select, Table, Textarea } from "@/components/ui";
import { requireApp } from "@/lib/workspace";
import { saveSite } from "../actions";

export default async function SitesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, { supabase, workspace, member }] = await Promise.all([searchParams, requireApp("scheduling")]);
  const admin = member.role !== "member";
  const sites = await supabase
    .from("sites")
    .select("id, name, address, capacity, status, inspection_due, site_clients(count), site_staff(count)")
    .eq("workspace_id", workspace.id)
    .order("name");
  if (sites.error) throw sites.error;

  const create = admin ? (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> New site
        </>
      }
      title="New site"
      description="A house or location staff and clients share. Shifts can use its address and check-in pin."
      action={saveSite.bind(null, null)}
      submitLabel="Create site"
    >
      <SiteFields />
    </FormDialog>
  ) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-9 pt-5 pb-3">
        <p className="text-[13px] text-ink-3">Houses and other locations. Assign people here, then pick the site on a shift.</p>
        {create}
      </div>
      {params.error ? (
        <div className="px-9 pb-3">
          <Alert>{params.error}</Alert>
        </div>
      ) : null}
      {sites.data.length === 0 ? (
        <EmptyState icon={<MapPin size={18} />} title="No sites yet" body="Add a house or location to reuse its address and check-in pin on shifts." action={create ?? undefined} />
      ) : (
        <Table columns={["Site", "Address", "People", "Inspection", "Status"]}>
          {sites.data.map((s) => (
            <Row key={s.id} href={`/schedule/sites/${s.id}`}>
              <Cell className="font-medium">{s.name}</Cell>
              <Cell>
                <span className="block max-w-80 truncate text-ink-3">{s.address || "—"}</span>
              </Cell>
              <Cell className="tabular-nums">
                {s.site_clients[0]?.count ?? 0} clients · {s.site_staff[0]?.count ?? 0} staff
                {s.capacity !== null ? ` / ${s.capacity}` : ""}
              </Cell>
              <Cell className="text-ink-3">{s.inspection_due ?? "—"}</Cell>
              <Cell>
                <Badge tone={s.status === "active" ? "success" : "neutral"}>{s.status === "active" ? "Active" : "Inactive"}</Badge>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}

export function SiteFields({
  defaults,
}: {
  defaults?: { name: string; address: string; capacity: number | null; status: "active" | "inactive"; notes: string; inspection_due: string | null };
}) {
  return (
    <>
      <Field label="Name">
        <Input name="name" required maxLength={120} defaultValue={defaults?.name} />
      </Field>
      <Field label="Address">
        <Input name="address" maxLength={200} defaultValue={defaults?.address} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Capacity">
          <Input name="capacity" type="number" min={0} max={100} defaultValue={defaults?.capacity ?? ""} />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={defaults?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field label="Inspection due">
        <Input name="inspection_due" type="date" defaultValue={defaults?.inspection_due ?? ""} />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" rows={3} maxLength={4000} defaultValue={defaults?.notes} />
      </Field>
    </>
  );
}
