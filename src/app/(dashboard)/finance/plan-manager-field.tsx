import { Button, Field, Select } from "@/components/ui";
import { personName } from "@/lib/format";
import { savePlanManager } from "./actions";

export function PlanManagerField({
  contactId,
  managerId,
  contacts,
  required,
  admin,
}: {
  contactId: string;
  managerId: string | null;
  contacts: { id: string; first_name: string; last_name: string; email: string }[];
  required: boolean;
  admin: boolean;
}) {
  const current = managerId ? contacts.find((c) => c.id === managerId) : null;
  return (
    <div className="mt-2">
      {admin ? (
        <form action={savePlanManager.bind(null, contactId)} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] max-w-[280px] flex-1">
            <Field
              label="Plan manager"
              hint={required ? "Invoices are addressed and emailed to this contact." : "Optional. Invoices go to the participant unless you set one."}
            >
              <Select name="plan_manager" defaultValue={managerId ?? ""}>
                <option value="">{required ? "Choose a plan manager" : "Invoice the participant"}</option>
                {contacts
                  .filter((c) => c.id !== contactId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {personName(c)}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <Button type="submit">Save</Button>
        </form>
      ) : (
        <p className="text-[12px] text-ink-3">Plan manager: {current ? personName(current) : required ? "Not set" : "Participant"}</p>
      )}
      {required && !managerId ? (
        <p className="mt-1 text-[12px] text-warning">No plan manager. Invoices will be addressed to the participant.</p>
      ) : null}
    </div>
  );
}
