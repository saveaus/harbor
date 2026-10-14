import type { ReactNode } from "react";
import { BadgeCheck, Briefcase, CalendarDays, CircleDot, Hash, KeyRound, Phone, Users } from "lucide-react";
import { ListToolbar } from "@/components/list-toolbar";
import { Chip, GridCell, GridNameCell, GridRow, GridTable, ListTitle, type GridColumn } from "@/components/record-list";
import { BulkBar, RowCheckbox, SelectAllCheckbox, SelectionProvider } from "@/components/row-selection";
import { EmptyState, PageHeader } from "@/components/ui";
import { COMPLIANCE_LEVEL, EMPLOYMENT, GENDER, STAFF_STATUS, compliance, complianceLevel, complianceSummary } from "@/lib/care";
import { formatDate, formatDay, personName } from "@/lib/format";
import { applyState, attributeMeta, type Attribute } from "@/lib/list-query";
import { columnMenu, resolveView, sortedBy, type Preset } from "@/lib/list-view";
import { loadSavedViews } from "@/lib/saved-views";
import { getWorkspace } from "@/lib/workspace";
import { bulkSetStaffStatus } from "./actions";
import { AddStaffButton, StaffHeaderActions } from "./staff-header";
import { accessLabel, loadAccessDirectory, staffAccess } from "./staff-access";

const options = (entries: Record<string, string | { label: string }>) =>
  Object.entries(entries).map(([value, option]) => ({ value, label: typeof option === "string" ? option : option.label }));

const ACCESS = { member: "Signs in", invited: "Invited", none: "No access" } as const;

const PRESETS: Preset[] = [
  { key: "all", label: "All staff", filters: [] },
  {
    key: "compliance",
    label: "Needs attention",
    filters: [
      { attr: "status", op: "none", values: ["inactive"] },
      { attr: "compliance", op: "none", values: ["compliant"] },
    ],
  },
];

const DEFAULTS = { sorts: [{ attr: "name", dir: "asc" as const }], hidden: ["staff_number", "phone", "gender", "nationality", "created"] };

export default async function StaffPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await getWorkspace();
  const { supabase, workspace, member } = ctx;

  const [staff, directory, saved] = await Promise.all([
    supabase
      .from("staff")
      .select(
        "id, user_id, staff_number, first_name, last_name, email, phone, position, employment_type, status, start_date, gender, nationality, created_at, required_credentials, staff_credentials(kind, expires_on, review)",
      )
      .eq("workspace_id", workspace.id),
    loadAccessDirectory(ctx),
    loadSavedViews(ctx, "staff"),
  ]);
  if (staff.error) throw staff.error;

  const people = staff.data.map((s) => {
    const held = compliance(s.staff_credentials, s.required_credentials);
    return { ...s, compliance: held, level: complianceLevel(held), access: staffAccess(s, directory) };
  });
  type StaffRow = (typeof people)[number];
  const attrs: Attribute<StaffRow>[] = [
    { key: "name", label: "Name", type: "text", get: (s) => personName(s) },
    { key: "email", label: "Email", type: "text", get: (s) => s.email },
    { key: "staff_number", label: "Employee ID", type: "text", get: (s) => String(s.staff_number).padStart(6, "0") },
    { key: "status", label: "Status", type: "select", options: options(STAFF_STATUS), get: (s) => s.status },
    { key: "compliance", label: "Compliance", type: "select", options: options(COMPLIANCE_LEVEL), get: (s) => s.level },
    { key: "position", label: "Role", type: "text", get: (s) => s.position },
    { key: "access", label: "Workspace access", type: "select", options: options(ACCESS), get: (s) => s.access.kind },
    { key: "employment", label: "Type", type: "select", options: options(EMPLOYMENT), get: (s) => s.employment_type },
    { key: "phone", label: "Phone", type: "text", get: (s) => s.phone },
    { key: "start_date", label: "Start date", type: "date", get: (s) => s.start_date },
    { key: "gender", label: "Gender", type: "select", options: options(GENDER), get: (s) => s.gender },
    { key: "nationality", label: "Nationality", type: "text", get: (s) => s.nationality },
    { key: "created", label: "Created", type: "date", get: (s) => s.created_at },
  ];
  const meta = attributeMeta(attrs);
  const resolved = resolveView({ base: "/staff", params, attrs: meta, defaults: DEFAULTS, presets: PRESETS, saved });
  const { q, state } = resolved;

  const needle = q.toLowerCase();
  const searched = needle
    ? people.filter((s) => [personName(s), s.email, s.position, s.phone].some((v) => v.toLowerCase().includes(needle)))
    : people;
  const rows = applyState(searched, attrs, state);
  const counts = new Map(resolved.views.map((v) => [v.key, applyState(searched, attrs, { ...v.state, sorts: [] }).length]));
  const statusCounts = new Map<string, number>();
  for (const s of searched) statusCounts.set(s.status, (statusCounts.get(s.status) ?? 0) + 1);
  const canEdit = member.role !== "member";

  const byKey = new Map(meta.map((a) => [a.key, a]));
  const column = (key: string, icon?: GridColumn["icon"], extra: Partial<GridColumn> = {}): GridColumn => {
    const attr = byKey.get(key)!;
    return { label: attr.label, icon, sorted: sortedBy(state, key), menu: columnMenu(resolved, attr, key !== "name"), ...extra };
  };
  const columns: (GridColumn & { key: string })[] = [
    { key: "staff_number", ...column("staff_number", Hash) },
    { key: "status", ...column("status", CircleDot) },
    { key: "compliance", ...column("compliance", BadgeCheck) },
    { key: "position", ...column("position", Briefcase, { priority: "lg" }) },
    { key: "access", ...column("access", KeyRound, { priority: "xl" }) },
    { key: "employment", ...column("employment", undefined, { priority: "xl" }) },
    { key: "phone", ...column("phone", Phone) },
    { key: "start_date", ...column("start_date", CalendarDays, { priority: "2xl" }) },
    { key: "gender", ...column("gender") },
    { key: "nationality", ...column("nationality") },
    { key: "created", ...column("created", CalendarDays) },
  ].filter((c) => !state.hidden.includes(c.key));
  const filtered = state.filters.length > 0 || q !== "";

  const table = (
    <GridTable
      label="Staff"
      footer={rows.length === searched.length ? `${rows.length} staff` : `Showing ${rows.length} of ${searched.length} staff`}
      columns={[{ ...column("name"), leading: canEdit ? <SelectAllCheckbox label="Select all staff" /> : undefined }, ...columns]}
    >
      {rows.map((s) => {
        const name = personName(s);
        const access = accessLabel(s.access);
        const summary = complianceSummary(s.compliance);
        const cell = {
          staff_number: <span className="text-ink-3 tabular-nums">{String(s.staff_number).padStart(6, "0")}</span>,
          status: <Chip tone={STAFF_STATUS[s.status].tone}>{STAFF_STATUS[s.status].label}</Chip>,
          compliance: <Chip tone={summary.tone}>{summary.label}</Chip>,
          position: s.position ? <span className="block max-w-48 truncate">{s.position}</span> : null,
          access: <Chip tone={access.tone}>{access.label}</Chip>,
          employment: s.employment_type ? EMPLOYMENT[s.employment_type] : null,
          phone: s.phone ? <span className="tabular-nums">{s.phone}</span> : null,
          start_date: s.start_date ? formatDay(s.start_date) : null,
          gender: s.gender ? GENDER[s.gender] : null,
          nationality: s.nationality || null,
          created: formatDate(s.created_at),
        } satisfies Record<string, ReactNode>;
        return (
          <GridRow key={s.id} href={`/staff/${s.id}`} label={name}>
            <GridNameCell name={name} detail={s.email} leading={canEdit ? <RowCheckbox id={s.id} label={`Select ${name}`} /> : undefined} />
            {columns.map((col) => (
              <GridCell key={col.key} priority={col.priority}>
                {cell[col.key as keyof typeof cell]}
              </GridCell>
            ))}
          </GridRow>
        );
      })}
    </GridTable>
  );

  return (
    <SelectionProvider ids={rows.map((s) => s.id)}>
      <PageHeader title={<ListTitle icon={Users} title="Staff" count={staff.data.length} />} actions={<StaffHeaderActions canEdit={canEdit} />} />
      <ListToolbar
        object="staff"
        resolved={resolved}
        attrs={meta}
        columns={meta.filter((a) => a.key !== "name" && a.key !== "email")}
        counts={counts}
        placeholder="Search staff"
        status={{
          tones: Object.fromEntries(Object.entries(STAFF_STATUS).map(([value, { tone }]) => [value, tone])),
          counts: statusCounts,
        }}
      />
      {typeof params.error === "string" ? (
        <p role="alert" className="mx-9 mt-3 rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {params.error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={18} />}
          title={q ? `No staff match “${q}”` : filtered ? "No staff match these filters" : "No staff yet"}
          body={
            q
              ? "Check the spelling, or search by name, email, role or phone."
              : resolved.view === "compliance" && !resolved.dirty
                ? "Everyone active holds every required check. Nice work."
                : filtered
                  ? "Change or remove a filter to see more staff."
                  : "Add support workers and coordinators to track their checks and the clients they look after."
          }
          action={!filtered && canEdit ? <AddStaffButton /> : undefined}
        />
      ) : (
        table
      )}
      {canEdit ? <BulkBar noun={["staff member", "staff"]} actions={[{ label: "Set status", choices: options(STAFF_STATUS), action: bulkSetStaffStatus }]} /> : null}
    </SelectionProvider>
  );
}
