import { Field, Input, Select, Textarea } from "@/components/ui";
import type { FormField } from "@/lib/forms";

export function FormFieldInputs({ fields }: { fields: FormField[] }) {
  return fields.map((field) => {
    const label = field.required ? `${field.label} *` : field.label;
    switch (field.type) {
      case "short_text":
        return (
          <Field key={field.id} label={label}>
            <Input name={field.id} required={field.required} />
          </Field>
        );
      case "long_text":
        return (
          <Field key={field.id} label={label}>
            <Textarea name={field.id} rows={4} required={field.required} />
          </Field>
        );
      case "choice":
        return (
          <Field key={field.id} label={label}>
            <Select name={field.id} required={field.required} defaultValue="">
              <option value="">Choose…</option>
              {field.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
        );
      case "checkbox":
        return (
          <label key={field.id} className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name={field.id} required={field.required} className="accent-[var(--color-accent)]" />
            {label}
          </label>
        );
      default: {
        const unhandled: never = field.type;
        throw new Error(`Unhandled field type ${String(unhandled)}`);
      }
    }
  });
}
