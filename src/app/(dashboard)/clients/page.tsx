import type { ReactNode } from "react";
import { CalendarClock, CircleDot, FileOutput, Hash, HeartHandshake, ListChecks, MoreHorizontal, Phone, UserRound, UsersRound, Wallet } from "lucide-react";
import { ListToolbar } from "@/components/list-toolbar";
import { Menu } from "@/components/menu";
import { Chip, GridActionCell, GridCell, GridNameCell, GridRow, GridTable, ListTitle, PersonChip, type GridColumn } from "@/components/record-list";
import { BulkBar, RowCheckbox, SelectAllCheckbox, SelectionProvider } from "@/components/row-selection";
import { EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { CLIENT_STATUS, CLOSED_CLIENT_STATUSES, FUNDING, GENDER, PLAN_ENDING_DAYS, PLAN_MANAGEMENT, isoDay, planEndTone } from "@/lib/care";
import { formatDate, formatDay, personName } from "@/lib/format";
import { applyState, attributeMeta, type Attribute, type Filter } from "@/lib/list-query";
import { columnMenu, resolveView, sortedBy, type Preset } from "@/lib/list-view";
import { loadSavedViews } from "@/lib/saved-views";
import { getWorkspace } from "@/lib/workspace";
import { bulkAddToList, bulkDeleteClients, bulkSetClientStatus, deleteClient } from "./actions";
import { ClientListsMenu } from "./client-lists-menu";
import { NewClientButton } from "./new-client-button";
import { deleteClientWarning } from "./status";

const options = (entries: Record<string, string | { label: string }>) =>
  Object.entries(entries).map(([value, option]) => ({ value, label: typeof option === "string" ? option : option.label }));

const notArchived: Filter = { attr: "status", op: "none", values: ["archived"] };

const PRESETS: Preset[] = [
  { key: "all", label: "All clients", filters: [notArchived] },
  {
    key: "ending",
    label: "Plans ending",
    filters: [
      { attr: "status", op: "none", values: [...CLOSED_CLIENT_STATUSES] },
      { attr: "plan_end", op: "before", values: [isoDay(PLAN_ENDING_DAYS + 1)] },
    ],
  },
  { key: "ndis", label: "NDIS", filters: [notArchived, { attr: "funding", op: "any", values: ["ndis"] }] },
  { key: "aged", label: "Home care", filters: [notArchived, { attr: "funding", op: "any", values: ["home_care_package", "support_at_home"] }] },
];

const DEFAULTS = { sorts: [{ attr: "created", dir: "desc" as const }], hidden: ["client_number", "plan_management", "phone", "gender", "start_date", "created"] };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await getWorkspace();
  const { supabase, workspace } = ctx;

  const [clients, staff, lists, saved] = await Promise.all([
    supabase
      .from("client_profiles")
      .select(
        "client_number, status, funding, ndis_number, plan_management, plan_start, plan_end, start_date, phone, gender, key_worker_id, contact:contacts!inner(id, first_name, last_name, email, created_at, client_list_members(list_id))",
      )
      .eq("workspace_id", workspace.id),
    supabase.from("staff").select("id, first_name, last_name, email").eq("workspace_id", workspace.id).order("first_name"),
    supabase.from("client_lists").select("id, name").eq("workspace_id", workspace.id).order("name"),
    loadSavedViews(ctx, "clients"),
  ]);
  if (clients.error) throw clients.error;
  if (staff.error) throw staff.error;
  if (lists.error) throw lists.error;

  type ClientRow = (typeof clients.data)[number];
  const staffName = new Map(staff.data.map((s) => [s.id, personName(s)]));
  const listName = new Map(lists.data.map((l) => [l.id, l.name]));
  const attrs: Attribute<ClientRow>[] = [
    { key: "name", label: "Name", type: "text", get: (c) => personName(c.contact) },
    { key: "email", label: "Email", type: "text", get: (c) => c.contact.email },
    { key: "client_number", label: "Client ID", type: "text", get: (c) => String(c.client_number).padStart(6, "0") },
    { key: "status", label: "Status", type: "select", options: options(CLIENT_STATUS), get: (c) => c.status },
    { key: "funding", label: "Funding", type: "select", options: options(FUNDING), get: (c) => c.funding },
    { key: "plan_end", label: "Plan ends", type: "date", get: (c) => c.plan_end },
    { key: "plan_start", label: "Plan starts", type: "date", get: (c) => c.plan_start },
    {
      key: "key_worker",
      label: "Key worker",
      type: "select",
      options: staff.data.map((s) => ({ value: s.id, label: personName(s) })),
      get: (c) => c.key_worker_id,
    },
    {
      key: "lists",
      label: "Lists",
      type: "select",
      multiple: true,
      sortable: false,
      options: lists.data.map((l) => ({ value: l.id, label: l.name })),
      get: (c) => c.contact.client_list_members.map((m) => m.list_id),
    },
    { key: "ndis_number", label: "NDIS number", type: "text", get: (c) => c.ndis_number },
    { key: "plan_management", label: "Plan management", type: "select", options: options(PLAN_MANAGEMENT), get: (c) => c.plan_management },
    { key: "phone", label: "Phone", type: "text", get: (c) => c.phone },
    { key: "gender", label: "Gender", type: "select", options: options(GENDER), get: (c) => c.gender },
    { key: "start_date", label: "Start date", type: "date", get: (c) => c.start_date },
    { key: "created", label: "Created", type: "date", get: (c) => c.contact.created_at },
  ];
  const meta = attributeMeta(attrs);
  const resolved = resolveView({ base: "/clients", params, attrs: meta, defaults: DEFAULTS, presets: PRESETS, saved });
  const { q, state } = resolved;

  const needle = q.toLowerCase();
  const searched = needle
    ? clients.data.filter((c) =>
        [personName(c.contact), c.contact.email, c.ndis_number, c.phone].some((v) => v.toLowerCase().includes(needle)),
      )
    : clients.data;
  const rows = applyState(searched, attrs, state);
  const counts = new Map(resolved.views.map((v) => [v.key, applyState(searched, attrs, { ...v.state, sorts: [] }).length]));
  const statusCounts = new Map<string, number>();
  for (const c of searched) statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1);
  const total = clients.data.filter((c) => c.status !== "archived").length;

  const byKey = new Map(meta.map((a) => [a.key, a]));
  const shown = (key: string) => !state.hidden.includes(key);
  const column = (key: string, icon?: GridColumn["icon"], extra: Partial<GridColumn> = {}): GridColumn => {
    const attr = byKey.get(key)!;
    return { label: attr.label, icon, sorted: sortedBy(state, key), menu: columnMenu(resolved, attr, key !== "name"), ...extra };
  };
  const columns: (GridColumn & { key: string })[] = [
    { key: "client_number", ...column("client_number", Hash) },
    { key: "status", ...column("status", CircleDot) },
    { key: "funding", ...column("funding", Wallet, { priority: "lg" }) },
    { key: "plan_end", ...column("plan_end", CalendarClock) },
    { key: "key_worker", ...column("key_worker", UserRound, { priority: "xl" }) },
    { key: "lists", ...column("lists", ListChecks, { priority: "xl" }) },
    { key: "ndis_number", ...column("ndis_number", Hash, { priority: "2xl" }) },
    { key: "plan_management", ...column("plan_management") },
    { key: "phone", ...column("phone", Phone) },
    { key: "gender", ...column("gender") },
    { key: "start_date", ...column("start_date", CalendarClock) },
    { key: "created", ...column("created", CalendarClock) },
  ].filter((c) => shown(c.key));
  const noun = (n: number) => (n === 1 ? "client" : "clients");
  const filtered = state.filters.length > 0 || q !== "";
  const statusChoices = options(CLIENT_STATUS);

  return (
    <SelectionProvider ids={rows.map((c) => c.contact.id)}>
      <PageHeader
        title={<ListTitle icon={HeartHandshake} title="Clients" count={total} />}
        actions={
          <>
            <ClientListsMenu lists={lists.data} />
            <a href="/clients/export" download className={buttonClass("secondary")}>
              <FileOutput /> Export
            </a>
            <NewClientButton />
          </>
        }
      />
      <ListToolbar
        object="clients"
        resolved={resolved}
        attrs={meta}
        columns={meta.filter((a) => a.key !== "name" && a.key !== "email" && a.key !== "plan_start")}
        counts={counts}
        placeholder="Search clients"
        status={{
          tones: Object.fromEntries(Object.entries(CLIENT_STATUS).map(([value, { tone }]) => [value, tone])),
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
          icon={<UsersRound size={18} />}
          title={q ? `No clients match “${q}”` : filtered ? "No clients match these filters" : "No clients yet"}
          body={
            q
              ? "Check the spelling, or search by name, email, phone or NDIS number."
              : filtered
                ? "Change or remove a filter to see more clients."
                : "Add the people you support to track their funding, plans and key workers."
          }
          action={filtered ? undefined : <NewClientButton />}
        />
      ) : (
        <GridTable
          label="Clients"
          footer={rows.length === searched.length ? `${rows.length} ${noun(rows.length)}` : `Showing ${rows.length} of ${searched.length} ${noun(searched.length)}`}
          columns={[{ ...column("name"), label: "Client", leading: <SelectAllCheckbox label="Select all clients" /> }, ...columns, { label: "" }]}
        >
          {rows.map((c) => {
            const name = personName(c.contact);
            const endTone = planEndTone(c.plan_end);
            const cell = {
              client_number: <span className="text-ink-3 tabular-nums">{String(c.client_number).padStart(6, "0")}</span>,
              status: <Chip tone={CLIENT_STATUS[c.status].tone}>{CLIENT_STATUS[c.status].label}</Chip>,
              funding: c.funding ? <Chip tone={FUNDING[c.funding].tone}>{FUNDING[c.funding].label}</Chip> : null,
              plan_end: c.plan_end ? endTone ? <Chip tone={endTone}>{formatDay(c.plan_end)}</Chip> : formatDay(c.plan_end) : null,
              key_worker: c.key_worker_id && staffName.has(c.key_worker_id) ? <PersonChip name={staffName.get(c.key_worker_id)!} /> : null,
              lists: c.contact.client_list_members.length ? (
                <span className="flex gap-1">
                  {c.contact.client_list_members.map((m) => (
                    <Chip key={m.list_id}>{listName.get(m.list_id)}</Chip>
                  ))}
                </span>
              ) : null,
              ndis_number: c.ndis_number ? <span className="tabular-nums">{c.ndis_number}</span> : null,
              plan_management: c.plan_management ? PLAN_MANAGEMENT[c.plan_management] : null,
              phone: c.phone ? <span className="tabular-nums">{c.phone}</span> : null,
              gender: c.gender ? GENDER[c.gender] : null,
              start_date: c.start_date ? formatDay(c.start_date) : null,
              created: formatDate(c.contact.created_at),
            } satisfies Record<string, ReactNode>;
            return (
              <GridRow key={c.contact.id} href={`/clients/${c.contact.id}`} label={name}>
                <GridNameCell name={name} detail={c.contact.email} leading={<RowCheckbox id={c.contact.id} label={`Select ${name}`} />} />
                {columns.map((col) => (
                  <GridCell key={col.key} priority={col.priority}>
                    {cell[col.key as keyof typeof cell]}
                  </GridCell>
                ))}
                <GridActionCell>
                  <Menu
                    label={`Actions for ${name}`}
                    triggerClassName="inline-flex size-7 items-center justify-center rounded-control text-ink-3 hover:bg-hover hover:text-ink"
                    trigger={<MoreHorizontal size={16} />}
                    items={[
                      { label: "Open", href: `/clients/${c.contact.id}` },
                      { label: "Delete client", action: deleteClient.bind(null, c.contact.id), danger: true, confirm: deleteClientWarning(name) },
                    ]}
                  />
                </GridActionCell>
              </GridRow>
            );
          })}
        </GridTable>
      )}
      <BulkBar
        noun={["client", "clients"]}
        actions={[
          { label: "Set status", choices: statusChoices, action: bulkSetClientStatus },
          ...(lists.data.length ? [{ label: "Add to list", choices: lists.data.map((l) => ({ value: l.id, label: l.name })), action: bulkAddToList }] : []),
          {
            label: "Delete",
            danger: true,
            action: bulkDeleteClients,
            confirm: "Delete {count} {noun}? Their conversations, files and invoices are removed too. This can't be undone.",
          },
        ]}
      />
    </SelectionProvider>
  );
}
