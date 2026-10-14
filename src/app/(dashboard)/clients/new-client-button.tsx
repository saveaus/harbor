"use client";

import { Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Field, Input, Select } from "@/components/ui";
import { CLIENT_STATUS, FUNDING, GENDER, isoDay } from "@/lib/care";
import { addClient } from "./actions";

export function NewClientButton() {
  return (
    <FormDialog
      trigger={
        <>
          <Plus /> New client
        </>
      }
      title="New client"
      description="Add someone you support. You can fill in their plan, funding and contacts next."
      action={addClient}
      submitLabel="Create client"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input name="first_name" required maxLength={80} autoComplete="off" />
        </Field>
        <Field label="Last name">
          <Input name="last_name" required maxLength={80} autoComplete="off" />
        </Field>
      </div>
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="off" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type of client">
          <Select name="funding" required defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {Object.entries(FUNDING).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue="pending">
            {Object.entries(CLIENT_STATUS)
              .filter(([value]) => value !== "archived")
              .map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth" note="optional">
          <Input name="date_of_birth" type="date" max={isoDay(-1)} />
        </Field>
        <Field label="Gender" note="optional">
          <Select name="gender" defaultValue="">
            <option value="">Not set</option>
            {Object.entries(GENDER).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Address" note="optional">
        <Input name="address" maxLength={200} autoComplete="off" />
      </Field>
    </FormDialog>
  );
}
