"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { FIELD_TYPES, fieldTypeLabels, type FieldType, type FormField } from "@/lib/forms";
import { saveForm } from "../../actions";

type Draft = { name: string; description: string; fields: FormField[] };

export function FormBuilder({ formId, initial }: { formId: string; initial: Draft }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setField = (id: string, patch: Partial<FormField>) =>
    setDraft((d) => ({ ...d, fields: d.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));

  const move = (index: number, offset: -1 | 1) =>
    setDraft((d) => {
      const fields = [...d.fields];
      const [field] = fields.splice(index, 1);
      fields.splice(index + offset, 0, field!);
      return { ...d, fields };
    });

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveForm(formId, draft);
      setError(result.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-6 py-6">
      <Field label="Form name">
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={120} />
      </Field>
      <Field label="Description">
        <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </Field>

      <div className="space-y-3">
        {draft.fields.map((field, index) => (
          <Card key={field.id} className="space-y-3 p-4">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 w-5 text-[12px] text-ink-4">{index + 1}.</span>
              <Input
                className="flex-1"
                placeholder="Question"
                value={field.label}
                onChange={(e) => setField(field.id, { label: e.target.value })}
              />
              <Select
                className="w-40"
                value={field.type}
                onChange={(e) => setField(field.id, { type: e.target.value as FieldType })}
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {fieldTypeLabels[type]}
                  </option>
                ))}
              </Select>
            </div>
            {field.type === "choice" ? (
              <div className="pl-7">
                <Textarea
                  rows={3}
                  placeholder={"One choice per line"}
                  value={field.options.join("\n")}
                  onChange={(e) => setField(field.id, { options: e.target.value.split("\n") })}
                />
              </div>
            ) : null}
            <div className="flex items-center justify-between pl-7">
              <label className="flex items-center gap-2 text-[13px] text-ink-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => setField(field.id, { required: e.target.checked })}
                  className="accent-[var(--color-accent)]"
                />
                Required
              </label>
              <div className="flex gap-1">
                <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-control p-1 text-ink-3 hover:bg-hover disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === draft.fields.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-control p-1 text-ink-3 hover:bg-hover disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Delete question"
                  onClick={() => setDraft((d) => ({ ...d, fields: d.fields.filter((f) => f.id !== field.id) }))}
                  className="rounded-control p-1 text-ink-3 hover:bg-hover hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <button
        type="button"
        className={buttonClass("secondary")}
        onClick={() =>
          setDraft((d) => ({
            ...d,
            fields: [...d.fields, { id: crypto.randomUUID(), label: "", type: "short_text", required: false, options: [] }],
          }))
        }
      >
        <Plus size={14} /> Add question
      </button>

      {error ? <p className="rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p> : null}
      <div className="flex justify-end border-t border-line pt-4">
        <Button type="button" variant="primary" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save form"}
        </Button>
      </div>
    </div>
  );
}
