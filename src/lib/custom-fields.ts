import type { Enums, Json } from "@/lib/supabase/database.types";

export type CustomFieldType = Enums<"custom_field_type">;

export const CUSTOM_FIELD_TYPES: Record<CustomFieldType, { label: string; input: string }> = {
  text: { label: "Text", input: "text" },
  number: { label: "Number", input: "number" },
  date: { label: "Date", input: "date" },
  url: { label: "URL", input: "url" },
  email: { label: "Email", input: "email" },
  phone: { label: "Phone", input: "tel" },
};

export function parseFieldType(value: string): CustomFieldType | undefined {
  return Object.keys(CUSTOM_FIELD_TYPES).find((type): type is CustomFieldType => type === value);
}

/** Validates one value against its field type. An empty string clears the value. */
export function parseFieldValue(type: CustomFieldType, raw: string): { value: string } | { error: string } {
  const value = raw.trim().slice(0, 500);
  if (value === "") return { value };
  switch (type) {
    case "text":
      return { value };
    case "number":
      return Number.isFinite(Number(value)) ? { value } : { error: "Enter a number." };
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? { value } : { error: "Enter a date." };
    case "url":
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? { value: url.href } : { error: "Enter a web address." };
      } catch {
        return { error: "Enter a web address." };
      }
    case "email":
      return /^[^\s@]+@[^\s@]+$/.test(value) ? { value } : { error: "Enter an email address." };
    case "phone":
      return /^[+\d][\d\s().-]{2,}$/.test(value) ? { value } : { error: "Enter a phone number." };
    default: {
      const unreachable: never = type;
      return unreachable;
    }
  }
}

/** Keeps only string values from the stored JSON object. */
export function parseFieldValues(raw: Json | undefined): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
