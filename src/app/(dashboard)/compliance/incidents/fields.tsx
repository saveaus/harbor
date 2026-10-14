import { Field, Input, Select, Textarea } from "@/components/ui";
import { INCIDENT_CATEGORIES, INCIDENT_PRIORITY, INCIDENT_SEVERITY, localInput } from "@/lib/compliance";
import type { PersonOption } from "@/lib/compliance-data";

export type IncidentFieldValues = {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  severity?: string;
  location?: string;
  occurred_at?: string | null;
  reported_at?: string | null;
  contact_id?: string | null;
  reported_by_id?: string | null;
  assigned_to_id?: string | null;
};

function PersonOptions({ people }: { people: PersonOption[] }) {
  return (
    <>
      <option value="">None</option>
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {person.label}
        </option>
      ))}
    </>
  );
}

export function IncidentFields({
  clients,
  staff,
  values,
}: {
  clients: PersonOption[];
  staff: PersonOption[];
  values?: IncidentFieldValues;
}) {
  const now = localInput(new Date().toISOString());
  return (
    <>
      <Field label="Title">
        <Input name="title" required maxLength={200} defaultValue={values?.title} placeholder="What happened" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category">
          <Select name="category" required defaultValue={values?.category ?? "Other"}>
            {INCIDENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select name="priority" defaultValue={values?.priority ?? "medium"}>
            {Object.entries(INCIDENT_PRIORITY).map(([value, option]) => (
              <option key={value} value={value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Severity">
          <Select name="severity" defaultValue={values?.severity ?? "minor"}>
            {Object.entries(INCIDENT_SEVERITY).map(([value, option]) => (
              <option key={value} value={value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Occurred">
          <Input type="datetime-local" name="occurred_at" required defaultValue={values ? localInput(values.occurred_at ?? null) : now} />
        </Field>
        <Field label="Reported">
          <Input type="datetime-local" name="reported_at" required defaultValue={values ? localInput(values.reported_at ?? null) : now} />
        </Field>
      </div>
      <Field label="Location" note="optional">
        <Input name="location" maxLength={200} defaultValue={values?.location} placeholder="Where it happened" />
      </Field>
      <Field label="Client" note="optional">
        <Select name="contact_id" defaultValue={values?.contact_id ?? ""}>
          <PersonOptions people={clients} />
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reported by" note="optional">
          <Select name="reported_by_id" defaultValue={values?.reported_by_id ?? ""}>
            <PersonOptions people={staff} />
          </Select>
        </Field>
        <Field label="Assigned to" note="optional">
          <Select name="assigned_to_id" defaultValue={values?.assigned_to_id ?? ""}>
            <PersonOptions people={staff} />
          </Select>
        </Field>
      </div>
      <Field label="What happened">
        <Textarea name="description" rows={6} maxLength={20000} defaultValue={values?.description} placeholder="Record what happened, who was involved, and what was done straight away." />
      </Field>
    </>
  );
}
