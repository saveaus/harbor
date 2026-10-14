"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

const CloseAddForm = createContext<() => void>(() => {});

/** A details-panel section whose "+" reveals an inline add form. */
export function PanelSection({
  title,
  meta,
  addForm,
  children,
}: {
  title: string;
  meta?: ReactNode;
  addForm?: ReactNode;
  children: ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <section className="px-4 py-4">
      <div className="flex h-7 items-center justify-between gap-2">
        <h3 className="text-[13px] font-medium">{title}</h3>
        {meta}
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
