"use client";

import { X } from "lucide-react";
import { useRef, type ReactNode, type RefObject } from "react";
import { buttonClass } from "./ui";

type ButtonVariant = Parameters<typeof buttonClass>[0];

export function FormDialog({
  trigger,
  dialogRef,
  triggerVariant = "primary",
  title,
  description,
  action,
  submitLabel,
  children,
}: {
  trigger?: ReactNode;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  triggerVariant?: ButtonVariant;
  title: string;
  description?: string;
  action: (form: FormData) => Promise<void>;
  submitLabel: string;
  children: ReactNode;
}) {
  const ownRef = useRef<HTMLDialogElement>(null);
  const ref = dialogRef ?? ownRef;

  return (
    <>
      {trigger ? (
        <button type="button" className={buttonClass(triggerVariant)} onClick={() => ref.current?.showModal()}>
          {trigger}
        </button>
      ) : null}
      <dialog
        ref={ref}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-card border border-line bg-canvas p-0 text-ink shadow-pop"
        onClick={(event) => {
          if (event.target === ref.current) ref.current.close();
        }}
      >
        <form
          action={async (form) => {
            await action(form);
            ref.current?.close();
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[14px] font-medium">{title}</h2>
              {description ? <p className="mt-0.5 text-[13px] text-ink-3">{description}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Close"
              className="rounded-control p-1 text-ink-3 hover:bg-hover hover:text-ink"
              onClick={() => ref.current?.close()}
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4 px-5 py-5">{children}</div>
          <div className="flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
            <button type="button" className={buttonClass("secondary")} onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <button type="submit" className={buttonClass("primary")}>
              {submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
