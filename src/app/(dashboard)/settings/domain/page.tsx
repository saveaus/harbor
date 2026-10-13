import { Alert, Badge, Button, Card, Field, Input, SectionTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";
import { removeCustomDomain, updateCustomDomain } from "../actions";

/** Set once Harbor is deployed; until then there is nothing for the record to point at. */
const cnameTarget = process.env.HARBOR_PORTAL_CNAME_TARGET ?? null;

export default async function DomainSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, { workspace, member }] = await Promise.all([searchParams, getWorkspace()]);
  const domain = workspace.custom_domain;
  const canEdit = member.role !== "member";

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle
          title="Custom domain"
          description="Let clients reach your portal at an address you own, such as portal.yourcompany.com."
        />
        {error ? (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        {domain ? (
          <Card className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{domain}</div>
              <div className="text-[12px] text-ink-3">Added {formatDate(workspace.custom_domain_added_at)}</div>
            </div>
            <Badge tone="warning">Waiting for hosting</Badge>
            {canEdit ? (
              <form action={removeCustomDomain}>
                <Button type="submit" variant="danger">
                  Remove
                </Button>
              </form>
            ) : null}
          </Card>
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
      </section>

      {domain ? (
        <section>
          <SectionTitle title="DNS record" description="Add this record where you manage DNS for your domain." />
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
                <tr>
                  <td className="px-4 py-2.5 font-mono">CNAME</td>
                  <td className="px-4 py-2.5 font-mono">{domain}</td>
                  <td className="px-4 py-2.5 font-mono">{cnameTarget ?? <span className="font-sans text-ink-3">Shown once Harbor is hosted</span>}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-ink-3">
            Some DNS providers want only the part before your own domain in the Name field, such as &ldquo;portal&rdquo;.
          </p>
          <p className="mt-2 text-[12px] text-ink-3">
            Harbor isn&apos;t hosted on a public address yet, so the domain can&apos;t be verified or given a certificate. Your setting is
            saved and will be used when hosting is connected.
          </p>
        </section>
      ) : null}
    </div>
  );
}
