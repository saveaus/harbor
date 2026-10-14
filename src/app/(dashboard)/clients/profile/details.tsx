import { AttributeField, type AttributeInput } from "@/components/attribute-field";
import { AttributeGroup } from "@/components/profile";
import { CustomFieldsSection } from "@/app/(dashboard)/clients/custom-fields-section";
import { CLIENT_STATUS, FUNDING, GENDER, HCP_LEVELS, PLAN_MANAGEMENT } from "@/lib/care";
import { personName } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";
import { setClientField, setClientIdentity, setClientNotes, type ClientField, type ClientIdentityField } from "../actions";

const options = (entries: Record<string, string | { label: string }>) =>
  Object.entries(entries).map(([value, option]) => ({ value, label: typeof option === "string" ? option : option.label }));

type Spec = { field: ClientField; label: string; input: AttributeInput; value: string | null };

function Fields({ contactId, fields }: { contactId: string; fields: Spec[] }) {
  return (
    <>
      {fields.map(({ field, label, input, value }) => (
        <AttributeField
          key={field}
          id={`client-${field}`}
          label={label}
          input={input}
          defaultValue={value ?? ""}
          action={setClientField.bind(null, contactId, field)}
        />
      ))}
    </>
  );
}

export async function ClientDetails({
  ctx,
  contact,
  profile,
}: {
  ctx: WorkspaceContext;
  contact: Pick<Tables<"contacts">, "id" | "first_name" | "last_name" | "email">;
  profile: Tables<"client_profiles">;
}) {
  const [staffResult, notesResult] = await Promise.all([
    ctx.supabase
      .from("staff")
      .select("id, first_name, last_name, email, status")
      .eq("workspace_id", ctx.workspace.id)
      .order("first_name"),
    ctx.supabase
      .from("record_details")
      .select("notes")
      .eq("workspace_id", ctx.workspace.id)
      .eq("contact_id", contact.id)
      .maybeSingle(),
  ]);
  if (staffResult.error) throw staffResult.error;
  if (notesResult.error) throw notesResult.error;
  const staff = staffResult.data;

  const identity: { field: ClientIdentityField; label: string; input: AttributeInput; value: string }[] = [
    { field: "first_name", label: "First name", input: { kind: "text", maxLength: 80 }, value: contact.first_name },
    { field: "last_name", label: "Last name", input: { kind: "text", maxLength: 80 }, value: contact.last_name },
    { field: "email", label: "Email", input: { kind: "text", type: "email" }, value: contact.email },
  ];
  const personal: Spec[] = [
    { field: "gender", label: "Gender", input: { kind: "select", options: options(GENDER) }, value: profile.gender },
    { field: "date_of_birth", label: "Date of birth", input: { kind: "text", type: "date" }, value: profile.date_of_birth },
    { field: "phone", label: "Phone", input: { kind: "text", type: "tel", maxLength: 40 }, value: profile.phone },
    { field: "address", label: "Address", input: { kind: "text", maxLength: 200 }, value: profile.address },
    { field: "start_date", label: "Start date", input: { kind: "text", type: "date" }, value: profile.start_date },
  ];
  const funding: Spec[] = [
    { field: "status", label: "Status", input: { kind: "select", options: options(CLIENT_STATUS) }, value: profile.status },
    { field: "funding", label: "Funding", input: { kind: "select", options: options(FUNDING) }, value: profile.funding },
    { field: "ndis_number", label: "NDIS number", input: { kind: "text", maxLength: 11, placeholder: "9 digits" }, value: profile.ndis_number },
    { field: "plan_management", label: "Plan management", input: { kind: "select", options: options(PLAN_MANAGEMENT) }, value: profile.plan_management },
    { field: "plan_start", label: "Plan start", input: { kind: "text", type: "date" }, value: profile.plan_start },
    { field: "plan_end", label: "Plan end", input: { kind: "text", type: "date" }, value: profile.plan_end },
    { field: "hcp_level", label: "HCP level", input: { kind: "select", options: options(HCP_LEVELS) }, value: profile.hcp_level ? String(profile.hcp_level) : null },
    { field: "aged_care_id", label: "Aged care ID", input: { kind: "text", maxLength: 20 }, value: profile.aged_care_id },
  ];
  const team: Spec[] = [
    {
      field: "key_worker_id",
      label: "Care manager",
      input: {
        kind: "select",
        emptyLabel: "No care manager",
        options: staff
          .filter((s) => s.status !== "inactive" || s.id === profile.key_worker_id)
          .map((s) => ({ value: s.id, label: personName(s) })),
      },
      value: profile.key_worker_id,
    },
    { field: "languages", label: "Languages", input: { kind: "text", maxLength: 200 }, value: profile.languages },
  ];
  const medical: Spec[] = [
    { field: "allergies", label: "Allergies", input: { kind: "textarea", maxLength: 2000 }, value: profile.allergies },
    { field: "medical_conditions", label: "Conditions", input: { kind: "textarea", maxLength: 2000 }, value: profile.medical_conditions },
    { field: "medications", label: "Medications", input: { kind: "textarea", maxLength: 2000 }, value: profile.medications },
  ];
  const bank: Spec[] = [
    { field: "bank_account_name", label: "Account name", input: { kind: "text", maxLength: 80 }, value: profile.bank_account_name },
    { field: "bank_bsb", label: "BSB", input: { kind: "text", maxLength: 6, placeholder: "000000" }, value: profile.bank_bsb },
    { field: "bank_account_number", label: "Account no.", input: { kind: "text", maxLength: 10 }, value: profile.bank_account_number },
  ];

  return (
    <div className="divide-y divide-line">
      <AttributeGroup title="Client information">
        {identity.map(({ field, label, input, value }) => (
          <AttributeField
            key={field}
            id={`client-${field}`}
            label={label}
            input={input}
            defaultValue={value}
            action={setClientIdentity.bind(null, contact.id, field)}
          />
        ))}
        <Fields contactId={contact.id} fields={personal} />
      </AttributeGroup>
      <AttributeGroup title="Funding information">
        <Fields contactId={contact.id} fields={funding} />
      </AttributeGroup>
      <AttributeGroup title="Team and preferences">
        <Fields contactId={contact.id} fields={team} />
      </AttributeGroup>
      <AttributeGroup title="Medical information">
        <Fields contactId={contact.id} fields={medical} />
      </AttributeGroup>
      <AttributeGroup title="General notes">
        <AttributeField
          id="client-notes"
          label="Notes"
          input={{ kind: "textarea", maxLength: 20000 }}
          defaultValue={notesResult.data?.notes ?? ""}
          action={setClientNotes.bind(null, contact.id)}
        />
      </AttributeGroup>
      <AttributeGroup title="Client financial details">
        <Fields contactId={contact.id} fields={bank} />
      </AttributeGroup>
      <CustomFieldsSection ctx={ctx} contactId={contact.id} />
    </div>
  );
}
