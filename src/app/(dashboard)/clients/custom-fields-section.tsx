import { AttributeField } from "@/components/attribute-field";
import { Button, Input, Select } from "@/components/ui";
import { CUSTOM_FIELD_TYPES, parseFieldValues } from "@/lib/custom-fields";
import type { WorkspaceContext } from "@/lib/workspace";
import { createCustomField, setFieldValue } from "./actions";
import { InlineForm, PanelSection } from "@/components/panel-section";

export async function CustomFieldsSection({ ctx, contactId }: { ctx: WorkspaceContext; contactId: string }) {
  const [fields, details] = await Promise.all([
    ctx.supabase.from("custom_fields").select("id, name, type").eq("workspace_id", ctx.workspace.id).order("created_at"),
    ctx.supabase
      .from("record_details")
      .select("field_values")
      .eq("workspace_id", ctx.workspace.id)
      .eq("contact_id", contactId)
      .maybeSingle(),
  ]);
  if (fields.error) throw fields.error;
  if (details.error) throw details.error;
  const values = parseFieldValues(details.data?.field_values);

  return (
    <PanelSection
      title="Custom fields"
      addForm={
        <InlineForm action={createCustomField.bind(null, contactId)}>
          <Input name="name" required maxLength={60} placeholder="Field name" aria-label="Field name" />
          <Select name="type" defaultValue="text" aria-label="Field type">
            {Object.entries(CUSTOM_FIELD_TYPES).map(([type, { label }]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary">
            Add field
          </Button>
        </InlineForm>
      }
    >
      {fields.data.length === 0 ? (
        <p className="text-[13px] text-ink-3">Track anything else you need about every client, such as a preferred language.</p>
      ) : (
        fields.data.map((field) => (
          <AttributeField
            key={field.id}
            id={`field-${field.id}`}
            label={field.name}
            input={{ kind: "text", type: CUSTOM_FIELD_TYPES[field.type].input }}
            defaultValue={values[field.id] ?? ""}
            action={setFieldValue.bind(null, contactId, field.id)}
          />
        ))
      )}
    </PanelSection>
  );
}
