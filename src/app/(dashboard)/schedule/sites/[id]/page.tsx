import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Alert, Button, Card, Field } from "@/components/ui";
import { personName } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { saveSite, setSitePeople } from "../../actions";
import { SiteFields } from "../page";

export default async function SitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, paramsQ, { supabase, workspace, member }] = await Promise.all([params, searchParams, requireApp("scheduling")]);
  const admin = member.role !== "member";
  const [site, clients, staff] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, name, address, capacity, status, notes, inspection_due, latitude, longitude, site_clients(contact_id), site_staff(staff_id, role)",
      )
      .eq("workspace_id", workspace.id)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("contacts").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).order("first_name"),
    supabase.from("staff").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).neq("status", "inactive").order("first_name"),
  ]);
  if (site.error) throw site.error;
  if (!site.data) notFound();
  if (clients.error) throw clients.error;
  if (staff.error) throw staff.error;

  const assignedClients = new Set(site.data.site_clients.map((c) => c.contact_id));
  const support = new Set(site.data.site_staff.filter((s) => s.role === "support").map((s) => s.staff_id));
  const admins = new Set(site.data.site_staff.filter((s) => s.role === "admin").map((s) => s.staff_id));

  return (
    <div className="w-full max-w-[760px] space-y-5 px-9 py-6">
      <Link href="/schedule/sites" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft size={13} /> Sites
      </Link>
      {paramsQ.error ? <Alert>{paramsQ.error}</Alert> : null}
      <h1 className="text-[20px] font-medium">{site.data.name}</h1>

      <Card className="p-5">
        <form action={saveSite.bind(null, site.data.id)} className="space-y-4">
          <SiteFields
            defaults={{
              name: site.data.name,
              address: site.data.address,
              capacity: site.data.capacity,
              status: site.data.status,
              notes: site.data.notes,
              inspection_due: site.data.inspection_due,
            }}
          />
          {admin ? (
            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Save site
              </Button>
            </div>
          ) : null}
        </form>
      </Card>

      {admin ? (
        <Card className="p-5">
          <h2 className="text-[14px] font-medium">People</h2>
          <p className="mt-1 text-[13px] text-ink-3">Clients who live here and staff who work here. Used when grouping the roster by site.</p>
          <form action={setSitePeople.bind(null, site.data.id)} className="mt-4 space-y-4">
            <People name="client" label="Clients" people={clients.data} selected={assignedClients} />
            <People name="support" label="Support staff" people={staff.data} selected={support} />
            <People name="admin" label="Site admins" people={staff.data} selected={admins} />
            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Save people
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function People({
  name,
  label,
  people,
  selected,
}: {
  name: string;
  label: string;
  people: { id: string; first_name: string; last_name: string; email: string }[];
  selected: Set<string>;
}) {
  return (
    <Field label={label}>
      <div className="max-h-40 overflow-y-auto rounded-control border border-line">
        {people.map((p) => (
          <label key={p.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[13px] last:border-0 hover:bg-hover">
            <input type="checkbox" name={name} value={p.id} defaultChecked={selected.has(p.id)} className="size-4 accent-[var(--color-accent)]" />
            {personName(p)}
          </label>
        ))}
      </div>
    </Field>
  );
}
