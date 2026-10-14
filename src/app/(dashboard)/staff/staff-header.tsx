"use client";

import { Plus, UserPlus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { InviteDialog } from "@/components/invite-dialog";
import { Field, Input, Select } from "@/components/ui";
import { EMPLOYMENT } from "@/lib/care";
import { inviteTeammate } from "../invite-actions";
import { createStaff } from "./actions";

export function StaffHeaderActions({ canEdit }: { canEdit: boolean }) {
  return (
    <>
      {canEdit ? (
        <>
          <InviteDialog
            triggerVariant="secondary"
            trigger={
              <>
                <UserPlus /> Invite
              </>
            }
            title="Invite a staff member"
            description="Create a private link for one email address. They'll appear in Staff straight away."
            create={inviteTeammate}
            submitLabel="Create link"
          >
            <Field label="Email">
              <Input name="email" type="email" required placeholder="sam@company.com" />
            </Field>
            <RoleField />
          </InviteDialog>
          <AddStaffButton />
        </>
      ) : null}
    </>
  );
}

export function AddStaffButton() {
  return (
    <FormDialog
      trigger={
        <>
          <Plus /> Add staff
        </>
      }
      title="Add staff member"
      description="Support workers and coordinators. Invite them to the workspace later if they need to sign in."
      action={createStaff}
      submitLabel="Add staff"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input name="first_name" required maxLength={80} />
        </Field>
        <Field label="Last name">
          <Input name="last_name" maxLength={80} />
        </Field>
      </div>
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Position">
          <Input name="position" maxLength={80} placeholder="Support worker" />
        </Field>
        <Field label="Employment">
          <Select name="employment_type" defaultValue="">
            <option value="">Not set</option>
            {Object.entries(EMPLOYMENT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </FormDialog>
  );
}

export function RoleField() {
  return (
    <Field label="Role" hint="Admins can invite staff, install apps and change settings.">
      <Select name="role" defaultValue="member">
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </Select>
    </Field>
  );
}
