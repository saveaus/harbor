import { MoreHorizontal, UsersRound } from "lucide-react";
import { Menu } from "@/components/menu";
import { ActionCell, Avatar, Badge, Cell, EmptyState, PageHeader, Person, Row, Table, Tabs } from "@/components/ui";
import { contactName, formatDate } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { deleteContact } from "./actions";
import { CrmHeaderActions } from "./crm-header";
import { contactStatus, crmTabs, parseSort, searchPattern, sortHref } from "./status";

const SORTS = ["name", "status", "created"] as const;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; error?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const sort = parseSort(params, SORTS, { key: "created", dir: "desc" });
  const { supabase, workspace } = await getWorkspace();

  let query = supabase
    .from("contacts")
    .select("id, first_name, last_name, email, status, created_at, company:companies(id, name)")
    .eq("workspace_id", workspace.id);
  const pattern = searchPattern(q);
  if (pattern) query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`);
  const ascending = sort.dir === "asc";
  query =
    sort.key === "name"
      ? query.order("first_name", { ascending }).order("last_name", { ascending })
      : query.order(sort.key === "status" ? "status" : "created_at", { ascending });

  const [contacts, companies] = await Promise.all([
    query,
    supabase.from("companies").select("id, name").eq("workspace_id", workspace.id).order("name"),
  ]);
  if (contacts.error) throw contacts.error;
  if (companies.error) throw companies.error;

  const column = (label: string, key: (typeof SORTS)[number]) => ({
    label,
    href: sortHref("/crm", q, sort, key),
    sorted: sort.key === key ? sort.dir : undefined,
  });

  return (
    <>
      <PageHeader
        title="CRM"
        actions={
          <CrmHeaderActions
            base="/crm"
            q={q}
            exportHref="/crm/export?type=contacts"
            companies={companies.data}
            views={[
              { label: "Newest first", href: "/crm?sort=created&dir=desc" },
              { label: "Oldest first", href: "/crm?sort=created&dir=asc" },
              { label: "Name A–Z", href: "/crm?sort=name&dir=asc" },
              { label: "Status", href: "/crm?sort=status&dir=asc" },
            ]}
          />
        }
      />
      <Tabs items={crmTabs} active="/crm" size="lg" />
      {params.error ? (
        <p role="alert" className="mx-9 mt-3 rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {params.error}
        </p>
      ) : null}
      <div className="flex-1 overflow-y-auto pt-2">
        {contacts.data.length === 0 ? (
          <EmptyState
            icon={<UsersRound size={18} />}
            title={q ? "No matching contacts" : "No contacts yet"}
            body={q ? "Try a different name or email." : "Add the people who will sign in to your portal."}
          />
        ) : (
          <Table columns={[column("Name", "name"), "Company", column("Status", "status"), column("Creation date", "created"), ""]}>
            {contacts.data.map((c) => {
              const status = contactStatus[c.status];
              return (
                <Row key={c.id} href={`/crm/contacts/${c.id}`}>
                  <Cell>
                    <Person name={contactName(c)} detail={c.email} />
                  </Cell>
                  <Cell className="max-w-48">
                    {c.company ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={c.company.name} size="sm" square />
                        <span className="truncate">{c.company.name}</span>
                      </span>
                    ) : (
                      <span className="text-ink-4">—</span>
                    )}
                  </Cell>
                  <Cell>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Cell>
                  <Cell>{formatDate(c.created_at)}</Cell>
                  <ActionCell>
                    <Menu
                      label={`Actions for ${contactName(c)}`}
                      triggerClassName="inline-flex size-7 items-center justify-center rounded-control text-ink hover:bg-hover"
                      trigger={<MoreHorizontal size={16} />}
                      items={[
                        { label: "Open", href: `/crm/contacts/${c.id}` },
                        { label: "Delete contact", action: deleteContact.bind(null, c.id), danger: true },
                      ]}
                    />
                  </ActionCell>
                </Row>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
