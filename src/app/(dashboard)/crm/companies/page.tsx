import { Building2, MoreHorizontal } from "lucide-react";
import { Menu } from "@/components/menu";
import { ActionCell, Avatar, Cell, EmptyState, PageHeader, Row, Table, Tabs } from "@/components/ui";
import { contactName, formatDate } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { deleteCompany } from "../actions";
import { CrmHeaderActions } from "../crm-header";
import { crmTabs, parseSort, searchPattern, sortHref } from "../status";

const SORTS = ["name", "created"] as const;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const sort = parseSort(params, SORTS, { key: "created", dir: "desc" });
  const { supabase, workspace } = await getWorkspace();

  let query = supabase
    .from("companies")
    .select("id, name, website, created_at, contacts(id, first_name, last_name, email)")
    .eq("workspace_id", workspace.id);
  const pattern = searchPattern(q);
  if (pattern) query = query.or(`name.ilike.${pattern},website.ilike.${pattern}`);
  const { data, error } = await query.order(sort.key === "name" ? "name" : "created_at", { ascending: sort.dir === "asc" });
  if (error) throw error;

  const base = "/crm/companies";
  const column = (label: string, key: (typeof SORTS)[number]) => ({
    label,
    href: sortHref(base, q, sort, key),
    sorted: sort.key === key ? sort.dir : undefined,
  });

  return (
    <>
      <PageHeader
        title="CRM"
        actions={
          <CrmHeaderActions
            base={base}
            q={q}
            exportHref="/crm/export?type=companies"
            companies={data.map(({ id, name }) => ({ id, name }))}
            views={[
              { label: "Newest first", href: `${base}?sort=created&dir=desc` },
              { label: "Oldest first", href: `${base}?sort=created&dir=asc` },
              { label: "Name A–Z", href: `${base}?sort=name&dir=asc` },
            ]}
          />
        }
      />
      <Tabs items={crmTabs} active={base} size="lg" />
      <div className="flex-1 overflow-y-auto pt-2">
        {data.length === 0 ? (
          <EmptyState
            icon={<Building2 size={18} />}
            title={q ? "No matching companies" : "No companies yet"}
            body={q ? "Try a different name." : "Create a company to group the people you work with."}
          />
        ) : (
          <Table columns={[column("Name", "name"), "Contacts", "Website", column("Creation date", "created"), ""]}>
            {data.map((company) => (
              <Row key={company.id} href={`/crm/companies/${company.id}`}>
                <Cell>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={company.name} square />
                    <span className="text-[12px]">{company.name}</span>
                  </span>
                </Cell>
                <Cell>
                  <span className="flex -space-x-1.5">
                    {company.contacts.slice(0, 5).map((c) => (
                      <span key={c.id} className="rounded-full ring-2 ring-canvas">
                        <Avatar name={contactName(c)} size="sm" />
                      </span>
                    ))}
                    {company.contacts.length === 0 ? <span className="text-ink-4">—</span> : null}
                  </span>
                </Cell>
                <Cell className="text-ink-3">{company.website || "—"}</Cell>
                <Cell>{formatDate(company.created_at)}</Cell>
                <ActionCell>
                  <Menu
                    label={`Actions for ${company.name}`}
                    triggerClassName="inline-flex size-7 items-center justify-center rounded-control text-ink hover:bg-hover"
                    trigger={<MoreHorizontal size={16} />}
                    items={[
                      { label: "Open", href: `/crm/companies/${company.id}` },
                      { label: "Delete company", action: deleteCompany.bind(null, company.id), danger: true },
                    ]}
                  />
                </ActionCell>
              </Row>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
