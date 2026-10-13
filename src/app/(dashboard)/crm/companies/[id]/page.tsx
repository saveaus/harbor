import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge } from "@/components/ui";
import { contactName, formatDate } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { deleteCompany } from "../../actions";
import { CustomFieldsSection } from "../../custom-fields-section";
import { PanelSection } from "../../record-panel";
import { RecordView, parseRecordView } from "../../record-view";
import { contactStatus } from "../../status";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; panel?: string }>;
}) {
  const [{ id }, view] = await Promise.all([params, searchParams.then(parseRecordView)]);
  const ctx = await getWorkspace();
  const { data: company, error } = await ctx.supabase
    .from("companies")
    .select("*, contacts(id, first_name, last_name, email, status), channels(id, kind, title)")
    .eq("workspace_id", ctx.workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!company) notFound();

  const record = { kind: "company", id: company.id } as const;

  return (
    <RecordView
      ctx={ctx}
      record={record}
      path={`/crm/companies/${company.id}`}
      crumb={{ label: "Companies", href: "/crm/companies" }}
      name={company.name}
      view={view}
      channels={company.channels}
      welcomePending={company.contacts.length > 0 && company.contacts.every((c) => c.status !== "active")}
      panelTitle="Company Details"
      menu={[{ label: "Delete company", action: deleteCompany.bind(null, company.id), danger: true }]}
      details={
        <div className="divide-y divide-line">
          <section className="space-y-2 px-4 py-4 text-[13px]">
            <div className="flex items-center gap-2.5">
              <Avatar name={company.name} square />
              <div className="min-w-0">
                <div className="truncate font-medium">{company.name}</div>
                {company.website ? (
                  <a href={company.website} target="_blank" rel="noreferrer" className="truncate text-link hover:underline">
                    {company.website}
                  </a>
                ) : (
                  <div className="text-ink-3">No website</div>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-[120px_1fr] pt-2">
              <dt className="text-ink-3">Created</dt>
              <dd>{formatDate(company.created_at)}</dd>
            </dl>
          </section>

          <PanelSection title="Contacts">
            {company.contacts.length === 0 ? (
              <p className="text-[13px] text-ink-3">No contacts in this company yet.</p>
            ) : (
              <ul className="space-y-1">
                {company.contacts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="-mx-2 flex items-center gap-2.5 rounded-control px-2 py-1.5 text-[13px] hover:bg-surface"
                    >
                      <Avatar name={contactName(c)} size="sm" />
                      <span className="flex-1 truncate">{contactName(c)}</span>
                      <Badge tone={contactStatus[c.status].tone}>{contactStatus[c.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PanelSection>

          <CustomFieldsSection ctx={ctx} record={record} />
        </div>
      }
    />
  );
}
