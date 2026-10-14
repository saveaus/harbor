import { AttributeField, type AttributeInput } from "@/components/attribute-field";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { InviteDialog } from "@/components/invite-dialog";
import { PanelSection } from "@/components/panel-section";
import { AttributeGroup } from "@/components/profile";
import { Chip } from "@/components/record-list";
import { EMPLOYMENT, GENDER, STAFF_STATUS, ageOn } from "@/lib/care";
import type { Tables } from "@/lib/supabase/database.types";
import { inviteTeammate, revokeInvite } from "../../invite-actions";
import { setStaffField, type StaffField } from "../actions";
import { accessLabel, type StaffAccess } from "../staff-access";
import { RoleField } from "../staff-header";

const options = (entries: Record<string, string | { label: string }>) =>
  Object.entries(entries).map(([value, option]) => ({ value, label: typeof option === "string" ? option : option.label }));

type Spec = { field: StaffField; label: string; input: AttributeInput; value: string | null };

function Fields({ staffId, fields, readOnly }: { staffId: string; fields: Spec[]; readOnly: boolean }) {
  return (
    <>
      {fields.map(({ field, label, input, value }) => (
        <AttributeField
          key={field}
          id={`staff-${field}`}
          label={label}
          input={input}
          defaultValue={value ?? ""}
          action={setStaffField.bind(null, staffId, field)}
          readOnly={readOnly}
        />
      ))}
    </>
  );
}

export function StaffDetails({
  person,
  access,
  canEdit,
}: {
  person: Tables<"staff">;
  access: StaffAccess;
  canEdit: boolean;
}) {
  const chip = accessLabel(access);
  const contact: Spec[] = [
    ...(person.user_id
      ? []
      : [{ field: "email" as const, label: "Email", input: { kind: "text" as const, type: "email" }, value: person.email }]),
    { field: "phone", label: "Phone", input: { kind: "text", type: "tel", maxLength: 40 }, value: person.phone },
    { field: "address", label: "Address", input: { kind: "text", maxLength: 200 }, value: person.address },
    { field: "employment_type", label: "Employment type", input: { kind: "select", options: options(EMPLOYMENT) }, value: person.employment_type },
  ];
  const basic: Spec[] = [
    { field: "preferred_name", label: "Preferred name", input: { kind: "text", maxLength: 80 }, value: person.preferred_name },
    { field: "gender", label: "Gender", input: { kind: "select", options: options(GENDER) }, value: person.gender },
    { field: "nationality", label: "Nationality", input: { kind: "text", maxLength: 60 }, value: person.nationality },
    { field: "date_of_birth", label: "Date of birth", input: { kind: "text", type: "date" }, value: person.date_of_birth },
    { field: "first_name", label: "First name", input: { kind: "text", maxLength: 80 }, value: person.first_name },
    { field: "last_name", label: "Last name", input: { kind: "text", maxLength: 80 }, value: person.last_name },
    { field: "status", label: "Status", input: { kind: "select", options: options(STAFF_STATUS) }, value: person.status },
    { field: "position", label: "Role", input: { kind: "text", maxLength: 80 }, value: person.position },
    { field: "start_date", label: "Start date", input: { kind: "text", type: "date" }, value: person.start_date },
  ];
  const emergency: Spec[] = [
    { field: "emergency_name", label: "Name", input: { kind: "text", maxLength: 120 }, value: person.emergency_name },
    { field: "emergency_relationship", label: "Relationship", input: { kind: "text", maxLength: 60 }, value: person.emergency_relationship },
    { field: "emergency_phone", label: "Primary phone", input: { kind: "text", type: "tel", maxLength: 40 }, value: person.emergency_phone },
    { field: "emergency_alt_phone", label: "Alt phone", input: { kind: "text", type: "tel", maxLength: 40 }, value: person.emergency_alt_phone },
    { field: "emergency_email", label: "Email", input: { kind: "text", type: "email" }, value: person.emergency_email },
    { field: "emergency_address", label: "Address", input: { kind: "text", maxLength: 200 }, value: person.emergency_address },
  ];
  const account: Spec[] = [
    { field: "abn", label: "ABN", input: { kind: "text", maxLength: 11 }, value: person.abn },
    { field: "trading_name", label: "Trading name", input: { kind: "text", maxLength: 120 }, value: person.trading_name },
  ];

  return (
    <div className="divide-y divide-line">
      {canEdit ? null : (
        <p className="px-4 py-3 text-[12px] text-ink-3">Only owners and admins can edit staff details.</p>
      )}
      <AttributeGroup title="Contact & employment">
        {person.user_id ? (
          <div className="grid grid-cols-[120px_1fr] items-start gap-2 py-0.5">
            <span className="truncate pt-1 text-[13px] text-ink-3">Email</span>
            <p className="px-2 py-1 text-[13px]">{person.email}</p>
          </div>
        ) : null}
        <Fields staffId={person.id} fields={contact} readOnly={!canEdit} />
      </AttributeGroup>
      <AttributeGroup title="Basic information">
        <Fields staffId={person.id} fields={basic} readOnly={!canEdit} />
        <div className="grid grid-cols-[120px_1fr] items-start gap-2 py-0.5">
          <span className="truncate pt-1 text-[13px] text-ink-3">Age</span>
          <p className="px-2 py-1 text-[13px] text-ink-3">{person.date_of_birth ? `${ageOn(person.date_of_birth)} years` : "N/A"}</p>
        </div>
      </AttributeGroup>
      <AttributeGroup title="Emergency contact">
        <Fields staffId={person.id} fields={emergency} readOnly={!canEdit} />
      </AttributeGroup>
      <AttributeGroup title="Account information">
        <Fields staffId={person.id} fields={account} readOnly={!canEdit} />
      </AttributeGroup>
      <PanelSection title="Workspace access" meta={<Chip tone={chip.tone}>{chip.label}</Chip>}>
        {access.kind === "member" ? (
          <p className="text-[13px] text-ink-3">Signs in as {person.email}.</p>
        ) : canEdit ? (
          <div className="space-y-2">
            <p className="text-[13px] text-ink-3">
              {access.kind === "invited" ? "They haven't accepted their invite yet." : "Invite them if they need to sign in to Harbor."}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <InviteDialog
                triggerVariant="secondary"
                trigger={access.kind === "invited" ? "New invite link" : "Invite to workspace"}
                title={`Invite ${person.first_name || person.email} to the workspace`}
                description="Create a private link that lets them set a password and sign in."
                create={inviteTeammate}
                submitLabel="Create link"
              >
                <input type="hidden" name="email" value={person.email} />
                <p className="text-[13px]">
                  The link only works for <span className="font-medium">{person.email}</span>
                  {access.kind === "invited" ? " and replaces the earlier link." : "."}
                </p>
                <RoleField />
              </InviteDialog>
              {access.kind === "invited" ? (
                <form action={revokeInvite.bind(null, access.invite.id)}>
                  <ConfirmSubmit confirm="Revoke this invite link? It will stop working straight away." className="text-[12px] text-danger hover:text-ink">
                    Revoke link
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-ink-3">An owner or admin can invite them to sign in.</p>
        )}
      </PanelSection>
    </div>
  );
}
