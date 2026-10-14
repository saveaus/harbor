"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { Check } from "lucide-react";

export type AttributeInput =
  | { kind: "text"; type?: string; maxLength?: number; placeholder?: string }
  | { kind: "textarea"; maxLength?: number; placeholder?: string }
  | {
      kind: "select";
      options: { value: string; label: string }[];
      emptyLabel?: string;
    };

type SaveState = { error?: string; saved?: boolean };

const controlClass =
  "h-7 w-full rounded-control border border-transparent bg-transparent px-2 text-[13px] outline-none placeholder:text-ink-4 enabled:hover:border-line-strong focus:border-ink-3 disabled:opacity-100";

/** One record attribute that saves itself: text on blur, selects on change. */
export function AttributeField({
  id,
  label,
  input,
  defaultValue,
  action,
  readOnly = false,
}: {
  id: string;
  label: string;
  input: AttributeInput;
  defaultValue: string;
  action: (form: FormData) => Promise<{ error?: string }>;
  readOnly?: boolean;
}) {
  const [state, setState] = useState<SaveState>({});
  const [pending, startTransition] = useTransition();
  const disabled = readOnly || pending;
  const describedBy = state.error ? `${id}-error` : undefined;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await action(form);
          setState(result.error ? result : { saved: true });
        });
      }}
      className="grid grid-cols-[120px_1fr] items-start gap-2 py-0.5"
    >
      <label htmlFor={id} className="truncate pt-1 text-[13px] text-ink-3">
        {label}
      </label>
      <div>
        <div className="relative">
          {input.kind === "select" ? (
            <select
              id={id}
              name="value"
              defaultValue={defaultValue}
              disabled={disabled}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={describedBy}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className={controlClass}
            >
              <option value="">{input.emptyLabel ?? "Not set"}</option>
              {input.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : input.kind === "textarea" ? (
            <textarea
              id={id}
              name="value"
              rows={2}
              maxLength={input.maxLength}
              defaultValue={defaultValue}
              placeholder={readOnly ? "Not set" : (input.placeholder ?? "Add…")}
              disabled={disabled}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={describedBy}
              onBlur={(event) => {
                if (event.currentTarget.value !== defaultValue) event.currentTarget.form?.requestSubmit();
              }}
              className={clsx(controlClass, "field-sizing-content h-auto min-h-7 resize-none py-1")}
            />
          ) : (
            <input
              id={id}
              name="value"
              type={input.type ?? "text"}
              maxLength={input.maxLength}
              defaultValue={defaultValue}
              placeholder={readOnly ? "Not set" : (input.placeholder ?? "Add…")}
              disabled={disabled}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={describedBy}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                event.currentTarget.blur();
              }}
              onBlur={(event) => {
                if (event.currentTarget.value !== defaultValue) event.currentTarget.form?.requestSubmit();
              }}
              className={controlClass}
            />
          )}
          {state.saved && !pending ? (
            <span
              role="status"
              className="pointer-events-none absolute top-1/2 right-7 flex -translate-y-1/2 items-center gap-1 text-[12px] text-success"
            >
              <Check size={12} /> Saved
            </span>
          ) : null}
        </div>
        {state.error ? (
          <p id={`${id}-error`} role="alert" className="px-2 text-[12px] text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
