"use client";

import { Check, Copy, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { buttonClass, inputClass } from "./ui";

type InviteResult = { token: string } | { error: string };

export function InviteDialog({
  trigger,
  triggerVariant = "primary",
  title,
  description,
  create,
  submitLabel,
  children,
}: {
  trigger: ReactNode;
  triggerVariant?: Parameters<typeof buttonClass>[0];
  title: string;
  description: string;
  create: (form: FormData) => Promise<InviteResult>;
  submitLabel: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function open() {
    setLink(null);
    setError(null);
    setCopied(false);
    ref.current?.showModal();
  }

  return (
    <>
      <button type="button" className={buttonClass(triggerVariant)} onClick={open}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-card border border-line bg-canvas p-0 text-ink shadow-pop"
        onClick={(event) => {
          if (event.target === ref.current) ref.current.close();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              {link ? "Send this link yourself. It works once and expires in 14 days." : description}
            </p>
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

        {link ? (
          <>
            <div className="flex gap-2 px-5 py-5">
              <input readOnly value={link} className={inputClass} onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className={buttonClass("secondary")}
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="px-5 pb-4 text-[12px] text-ink-3">
              Harbor only keeps a fingerprint of this link, so it can&apos;t be shown again. Create a new one if it gets lost.
            </p>
            <div className="flex justify-end border-t border-line bg-surface px-5 py-3">
              <button type="button" className={buttonClass("primary")} onClick={() => ref.current?.close()}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form
            action={async (form) => {
              const result = await create(form);
              if ("error" in result) setError(result.error);
              else setLink(`${window.location.origin}/invite/${result.token}`);
            }}
          >
            <div className="space-y-4 px-5 py-5">
              {error ? <p className="rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p> : null}
              {children}
            </div>
            <div className="flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
              <button type="button" className={buttonClass("secondary")} onClick={() => ref.current?.close()}>
                Cancel
              </button>
              <button type="submit" className={buttonClass("primary")}>
                {submitLabel}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
