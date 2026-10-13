import type { Json } from "@/lib/supabase/database.types";

export const FIELD_TYPES = ["short_text", "long_text", "choice", "checkbox"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
};

export const fieldTypeLabels: Record<FieldType, string> = {
  short_text: "Short answer",
  long_text: "Paragraph",
  choice: "Multiple choice",
  checkbox: "Checkbox",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFields(value: unknown): FormField[] {
  if (!Array.isArray(value)) throw new Error("Form fields must be an array");
  return value.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Field ${index + 1} is malformed`);
    const { id, label, type, required, options } = raw;
    if (typeof id !== "string" || !id) throw new Error(`Field ${index + 1} has no id`);
    if (typeof label !== "string" || !label.trim()) throw new Error(`Field ${index + 1} needs a question`);
    if (typeof type !== "string" || !(FIELD_TYPES as readonly string[]).includes(type))
      throw new Error(`Field ${index + 1} has an unknown type`);
    const parsedOptions = Array.isArray(options)
      ? options.filter((o): o is string => typeof o === "string" && o.trim() !== "").map((o) => o.trim())
      : [];
    if (type === "choice" && parsedOptions.length < 2) throw new Error(`"${label}" needs at least two choices`);
    return { id, label: label.trim(), type: type as FieldType, required: required === true, options: parsedOptions };
  });
}

export function fieldsToJson(fields: FormField[]): Json {
  return fields.map((f) => ({ id: f.id, label: f.label, type: f.type, required: f.required, options: f.options }));
}

export type Answers = Record<string, string | boolean>;

export function parseAnswers(fields: FormField[], form: FormData): Answers {
  const answers: Answers = {};
  for (const field of fields) {
    switch (field.type) {
      case "checkbox":
        answers[field.id] = form.get(field.id) === "on";
        if (field.required && !answers[field.id]) throw new Error(`"${field.label}" must be checked`);
        break;
      case "short_text":
      case "long_text":
      case "choice": {
        const raw = form.get(field.id);
        const value = typeof raw === "string" ? raw.trim() : "";
        if (field.required && !value) throw new Error(`"${field.label}" is required`);
        if (field.type === "choice" && value && !field.options.includes(value))
          throw new Error(`"${value}" isn't a choice for "${field.label}"`);
        answers[field.id] = value;
        break;
      }
      default: {
        const unhandled: never = field.type;
        throw new Error(`Unhandled field type ${String(unhandled)}`);
      }
    }
  }
  return answers;
}

export function readAnswer(answers: Json | null, fieldId: string): string {
  if (!isRecord(answers)) return "—";
  const value = answers[fieldId];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value) return value;
  return "—";
}
