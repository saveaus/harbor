import { AttributeField, type AttributeInput } from "@/components/attribute-field";
import { CLIENT_STATUS, FUNDING, PLAN_MANAGEMENT } from "@/lib/care";
import { personName } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";
import { setClientField, type ClientField } from "./actions";

const options = (entries: Record<string, string | { label: string }>) =>
  Object.entries(entries).map(([value, option]) => ({
    value,
    label: typeof option === "string" ? option : option.label,
  }));

type FieldSpec = {
  field: ClientField;
  label: string;
  input: AttributeInput;
  value: string | null;
};

export async function ClientProfileSection({ ctx, profile }: { ctx: WorkspaceContext; profile: Tables<"client_profiles"> }) {
  const { data: staff, error } = await ctx.supabase
    .from("staff")
    .select("id, first_name, last_name, email, status")
    .eq("workspace_id", ctx.workspace.id)
    .order("first_name");
  if (error) throw error;

  const care: FieldSpec[] = [
    {
      field: "status",
      label: "Status",
      input: { kind: "select", options: options(CLIENT_STATUS) },
      value: profile.status,
    },
    {
      field: "key_worker_id",
      label: "Key worker",
      input: {
        kind: "select",
        emptyLabel: "No key worker",
        options: staff
          .filter((s) => s.status !== "inactive" || s.id === profile.key_worker_id)
          .map((s) => ({ value: s.id, label: personName(s) })),
      },
      value: profile.key_worker_id,
    },
    {
      field: "funding",
      label: "Funding",
      input: { kind: "select", options: options(FUNDING) },
      value: profile.funding,
    },
    {
      field: "ndis_number",
      label: "NDIS number",
      input: { kind: "text", maxLength: 11, placeholder: "9 digits" },
      value: profile.ndis_number,
    },
    {
      field: "plan_management",
      label: "Plan management",
      input: { kind: "select", options: options(PLAN_MANAGEMENT) },
      value: profile.plan_management,
    },
    {
      field: "plan_start",
      label: "Plan start",
      input: { kind: "text", type: "date" },
      value: profile.plan_start,
    },
    {
      field: "plan_end",
      label: "Plan end",
      input: { kind: "text", type: "date" },
      value: profile.plan_end,
    },
  ];
  const personal: FieldSpec[] = [
    {
      field: "date_of_birth",
      label: "Date of birth",
      input: { kind: "text", type: "date" },
      value: profile.date_of_birth,
    },
    {
      field: "phone",
      label: "Phone",
      input: { kind: "text", type: "tel", maxLength: 40 },
      value: profile.phone,
    },
    {
      field: "address",
      label: "Address",
      input: { kind: "text", maxLength: 200 },
      value: profile.address,
    },
  ];

  return (
    <>
      <FieldGroup title="Funding and plan" contactId={profile.contact_id} fields={care} />
      <FieldGroup title="Personal details" contactId={profile.contact_id} fields={personal} />
    </>
  );
}

function FieldGroup({ title, contactId, fields }: { title: string; contactId: string; fields: FieldSpec[] }) {
  return (
    <section className="px-4 py-4">
      <h3 className="flex h-7 items-center text-[13px] font-medium">{title}</h3>
      <div className="mt-1">
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
      </div>
    </section>
  );
}
