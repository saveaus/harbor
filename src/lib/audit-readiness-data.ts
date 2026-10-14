import { CREDENTIALS } from "@/lib/care";
import {
  readinessToday,
  scoreCredential,
  scoreIncident,
  scorePolicy,
  scoreServiceAgreement,
  scoreSupportPlan,
  type EvidenceItem,
} from "@/lib/audit-readiness";
import { incidentCode } from "@/lib/compliance";
import { personName } from "@/lib/format";
import {
  documentMatchesPolicy,
  holdsPersonalCare,
  requiredPolicies,
  registrationGroup,
  type RegistrationGroup,
} from "@/lib/ndis-registration";
import type { Enums } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";

export async function listRegistrationGroups(ctx: WorkspaceContext): Promise<RegistrationGroup[]> {
  const { data, error } = await ctx.supabase
    .from("workspace_registration_groups")
    .select("group_code")
    .eq("workspace_id", ctx.workspace.id)
    .order("group_code");
  if (error) throw error;
  return data.flatMap((row) => {
    const code = registrationGroup(row.group_code);
    return code ? [code] : [];
  });
}

export async function loadReadiness(ctx: WorkspaceContext): Promise<{ groups: RegistrationGroup[]; items: EvidenceItem[] }> {
  const groups = await listRegistrationGroups(ctx);
  if (groups.length === 0) return { groups, items: [] };

  const { today, soon } = readinessToday();
  const policies = requiredPolicies(groups);
  const personalCare = holdsPersonalCare(groups);
  const id = ctx.workspace.id;

  const [documents, staff, credentials, clients, plans, agreements, incidents] = await Promise.all([
    ctx.supabase
      .from("company_documents")
      .select("id, title, category, status, review_on, expires_on")
      .eq("workspace_id", id)
      .neq("status", "archived")
      .limit(500),
    ctx.supabase
      .from("staff")
      .select("id, first_name, last_name, email, status")
      .eq("workspace_id", id)
      .in("status", ["active", "onboarding"])
      .order("first_name")
      .limit(500),
    ctx.supabase
      .from("staff_credentials")
      .select("staff_id, kind, review, expires_on")
      .eq("workspace_id", id)
      .limit(2000),
    ctx.supabase
      .from("client_profiles")
      .select("contact_id, plan_end, status, contact:contacts(first_name, last_name, email)")
      .eq("workspace_id", id)
      .eq("funding", "ndis")
      .in("status", ["pending", "active", "on_leave", "hospital_leave", "respite_leave"])
      .limit(500),
    ctx.supabase.from("care_plans").select("id, contact_id, title, renews_on").eq("workspace_id", id).limit(500),
    ctx.supabase
      .from("client_documents")
      .select("id, contact_id, title, signed_on, valid_to")
      .eq("workspace_id", id)
      .eq("folder", "general")
      .limit(500),
    ctx.supabase
      .from("incidents")
      .select("id, number, title, status, reported_at")
      .eq("workspace_id", id)
      .neq("status", "archived")
      .order("reported_at", { ascending: false })
      .limit(500),
  ]);
  if (documents.error) throw documents.error;
  if (staff.error) throw staff.error;
  if (credentials.error) throw credentials.error;
  if (clients.error) throw clients.error;
  if (plans.error) throw plans.error;
  if (agreements.error) throw agreements.error;
  if (incidents.error) throw incidents.error;

  const items: EvidenceItem[] = [];

  for (const requirement of policies) {
    const matches = documents.data.filter((doc) => documentMatchesPolicy(doc.title, doc.category, requirement.needles));
    const status = scorePolicy(documents.data, requirement, today, soon);
    const due = matches
      .flatMap((doc) => [doc.review_on, doc.expires_on])
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;
    items.push({
      id: `policy:${requirement.key}`,
      area: "policies",
      title: requirement.title,
      person: null,
      date: due,
      status,
      href: matches[0] ? `/compliance/documents/${matches[0].id}` : "/compliance/documents",
    });
  }

  const heldByStaff = new Map<string, typeof credentials.data>();
  for (const row of credentials.data) {
    const list = heldByStaff.get(row.staff_id) ?? [];
    list.push(row);
    heldByStaff.set(row.staff_id, list);
  }
  const workerKinds = (["ndis_worker_screening", ...(personalCare ? (["first_aid"] as const) : [])] as const satisfies readonly Enums<"credential_kind">[]);
  for (const person of staff.data) {
    const held = heldByStaff.get(person.id) ?? [];
    const name = personName(person);
    for (const kind of workerKinds) {
      const status = scoreCredential(held, kind, today, soon);
      const latest = held.filter((row) => row.kind === kind).sort((a, b) => (b.expires_on ?? "").localeCompare(a.expires_on ?? ""))[0];
      items.push({
        id: `worker:${person.id}:${kind}`,
        area: "worker_credentials",
        title: CREDENTIALS[kind],
        person: name,
        date: latest?.expires_on ?? null,
        status,
        href: `/staff/${person.id}?tab=compliance`,
      });
    }
  }

  const plansByContact = new Map<string, typeof plans.data>();
  for (const plan of plans.data) {
    const list = plansByContact.get(plan.contact_id) ?? [];
    list.push(plan);
    plansByContact.set(plan.contact_id, list);
  }
  const agreementsByContact = new Map<string, typeof agreements.data>();
  for (const doc of agreements.data) {
    const list = agreementsByContact.get(doc.contact_id) ?? [];
    list.push(doc);
    agreementsByContact.set(doc.contact_id, list);
  }

  for (const client of clients.data) {
    const contact = Array.isArray(client.contact) ? client.contact[0] : client.contact;
    if (!contact) continue;
    const name = personName(contact);
    const clientAgreements = agreementsByContact.get(client.contact_id) ?? [];
    const clientPlans = plansByContact.get(client.contact_id) ?? [];
    const agreement = clientAgreements.find((doc) => doc.signed_on || /agreement|consent/i.test(doc.title));
    items.push({
      id: `agreement:${client.contact_id}`,
      area: "service_agreements",
      title: "Service agreement",
      person: name,
      date: agreement?.valid_to ?? client.plan_end,
      status: scoreServiceAgreement(clientAgreements, today, soon),
      href: `/clients/${client.contact_id}?tab=files`,
    });
    const latestPlan = [...clientPlans].sort((a, b) => b.renews_on.localeCompare(a.renews_on))[0];
    items.push({
      id: `plan:${client.contact_id}`,
      area: "support_plans",
      title: latestPlan?.title || "Support plan",
      person: name,
      date: latestPlan?.renews_on ?? null,
      status: scoreSupportPlan(clientPlans, today, soon),
      href: `/clients/${client.contact_id}?tab=care`,
    });
  }

  for (const incident of incidents.data) {
    const status = scoreIncident(incident.status);
    if (!status) continue;
    items.push({
      id: `incident:${incident.id}`,
      area: "registers",
      title: `${incidentCode(incident.number)} · ${incident.title}`,
      person: null,
      date: incident.reported_at.slice(0, 10),
      status,
      href: `/compliance/incidents/${incident.id}`,
    });
  }

  return { groups, items };
}
