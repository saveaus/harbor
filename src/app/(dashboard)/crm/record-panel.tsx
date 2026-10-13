"use client";

import { createContext, use, useActionState, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

const CloseAddForm = createContext<() => void>(() => {});

/** A details-panel section whose "+" reveals an inline add form. */
export function PanelSection({ title, addForm, children }: { title: string; addForm?: ReactNode; children: ReactNode }) {
  const [adding, setAdding] = useState(false);
  return (
    <section className="px-4 py-4">
      <div className="flex h-7 items-center justify-between">
        <h3 className="text-[13px] font-medium">{title}</h3>
        {addForm ? (
          <button
            type="button"
            aria-label={`Add to ${title.toLowerCase()}`}
            aria-expanded={adding}
            className="flex size-6 items-center justify-center rounded-control text-ink hover:bg-hover"
            onClick={() => setAdding((v) => !v)}
          >
            <Plus size={15} />
          </button>
        ) : null}
      </div>
      {adding && addForm ? (
        <div className="mt-2">
          <CloseAddForm value={() => setAdding(false)}>{addForm}</CloseAddForm>
        </div>
      ) : null}
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** An inline add form that collapses its section once the action finishes. */
export function InlineForm({ action, children }: { action: (form: FormData) => Promise<unknown>; children: ReactNode }) {
  const close = use(CloseAddForm);
  return (
    <form
      action={async (form) => {
        await action(form);
        close();
      }}
      className="space-y-2 rounded-card border border-line-strong p-3"
    >
      {children}
    </form>
  );
}

/** One custom field value; saves when the input loses focus with a changed value. */
export function FieldValueForm({
  id,
  label,
  inputType,
  defaultValue,
  action,
}: {
  id: string;
  label: string;
  inputType: string;
  defaultValue: string;
  action: (form: FormData) => Promise<{ error?: string }>;
}) {
  const [state, submit, pending] = useActionState((_: { error?: string }, form: FormData) => action(form), {});
  return (
    <form action={submit} className="grid grid-cols-[120px_1fr] items-start gap-2 py-0.5">
      <label htmlFor={id} className="truncate pt-1 text-[13px] text-ink-3">
        {label}
      </label>
      <div>
        <input
          id={id}
          name="value"
          type={inputType}
          defaultValue={defaultValue}
          placeholder="Empty"
          disabled={pending}
          onBlur={(event) => {
            if (event.currentTarget.value !== defaultValue) event.currentTarget.form?.requestSubmit();
          }}
          className="h-7 w-full rounded-control border border-transparent px-2 text-[13px] outline-none placeholder:text-ink-4 hover:border-line-strong focus:border-ink-3"
        />
        {state.error ? (
          <p role="alert" className="px-2 text-[12px] text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
