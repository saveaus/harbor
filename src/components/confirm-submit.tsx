"use client";

import type { ReactNode } from "react";

/** A submit button for an irreversible action that asks before submitting. */
export function ConfirmSubmit({
  confirm,
  className,
  label,
  children,
}: {
  confirm: string;
  className: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      aria-label={label}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
