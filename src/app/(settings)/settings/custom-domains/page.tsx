import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { domainStatus, type DomainStatus } from "@/lib/vercel-domains";
import { getWorkspace } from "@/lib/workspace";
import { removeCustomDomain, updateCustomDomain } from "../actions";
import { SettingsNotice, SettingsSection, SettingsTitle, type SettingsSearchParams } from "../settings-page";

function StatusBadge({ status }: { status: DomainStatus }) {
  switch (status.state) {
    case "active":
      return <Badge tone="success">Active</Badge>;
    case "pending":
      return <Badge tone="warning">Waiting for DNS</Badge>;
    case "error":
      return <Badge tone="danger">Couldn&apos;t check</Badge>;
    case "not_configured":
      return <Badge>Saved</Badge>;
    default: {
      const unhandled: never = status;
      throw new Error(`Unknown domain state ${JSON.stringify(unhandled)}`);
    }
  }
}

export default async function CustomDomainsPage({ searchParams }: { searchParams: SettingsSearchParams }) {
  const { workspace, member } = await getWorkspace();
  const domain = workspace.custom_domain;
  const canEdit = member.role !== "member";
  const status = domain ? await domainStatus(domain) : null;

  return (
    <>
      <SettingsTitle title="Custom domains">
        Let clients reach your portal at an address you own, such as portal.yourcompany.com.
      </SettingsTitle>
      <SettingsNotice searchParams={searchParams} />

      {domain && status ? (
        <>
          <Card className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{domain}</div>
              <div className="text-[12px] text-ink-3">Added {formatDate(workspace.custom_domain_added_at)}</div>
            </div>
            <StatusBadge status={status} />
            {canEdit ? (
              <form action={removeCustomDomain}>
                <Button type="submit" variant="danger">
                  Remove
                </Button>
              </form>
            ) : null}
          </Card>

          {status.state === "pending" ? (
            <div className="mt-8">
              <SettingsSection
                title="DNS records"
                description="Add these where you manage DNS for your domain. Changes can take up to a few hours to be picked up; refresh this page to check."
              >
                <div className="overflow-hidden rounded-card border border-line">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-line bg-surface text-left text-ink-3">
                        <th className="px-4 py-2 font-medium">Type</th>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.records.map((record) => (
                        <tr key={`${record.type}-${record.name}-${record.value}`} className="border-b border-line last:border-0">
                          <td className="px-4 py-2.5 font-mono">{record.type}</td>
                          <td className="px-4 py-2.5 font-mono break-all">{record.name}</td>
                          <td className="px-4 py-2.5 font-mono break-all">{record.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[12px] text-ink-3">
                  Some DNS providers want only the part before your own domain in the Name field, such as &ldquo;portal&rdquo;.
                </p>
              </SettingsSection>
            </div>
          ) : null}
          {status.state === "active" ? (
            <p className="mt-4 text-[13px] text-ink-3">
              Clients can sign in at <span className="font-medium text-ink">https://{domain}</span>.
            </p>
          ) : null}
          {status.state === "error" ? <p className="mt-4 text-[13px] text-ink-3">{status.reason}</p> : null}
          {status.state === "not_configured" ? (
            <p className="mt-4 text-[13px] text-ink-3">
              Domain hosting isn&apos;t connected for this deployment, so the domain is saved but not live yet.
            </p>
          ) : null}
        </>
      ) : canEdit ? (
        <form action={updateCustomDomain} className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Domain" hint="Use a subdomain. Most DNS providers can't point a bare domain with a CNAME record.">
              <Input name="domain" required maxLength={253} placeholder="portal.yourcompany.com" />
            </Field>
          </div>
          <Button type="submit" variant="primary" className="mb-[22px]">
            Add domain
          </Button>
        </form>
      ) : (
        <p className="text-[13px] text-ink-3">Only owners and admins can set a custom domain.</p>
      )}
    </>
  );
}
